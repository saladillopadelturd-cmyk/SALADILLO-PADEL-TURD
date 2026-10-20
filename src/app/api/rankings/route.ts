import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SPT_POINTS_SCALE, getCoupleKey, syncAllTournamentsRankings } from "@/lib/tournament/rankings";
import { formatPlayerFullName } from "@/lib/tournament/couples";
import { getPlayerPhotosMap, enrichPlayerPhoto } from "@/lib/tournament/player-photos";

/**
 * GET /api/rankings?category=5ta&type=individual&sync=true
 * Obtiene rankings oficiales por tipo (individual | couple) y categoría.
 * Si la tabla está vacía o se solicita sync, auto-sincroniza los acumulados de todos los torneos.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const type = searchParams.get("type"); // "couple" | "individual"
  const genderParam = searchParams.get("gender") || searchParams.get("sexo") || searchParams.get("rama");
  const sync = searchParams.get("sync") === "true";

  let targetGender: "Masculino" | "Femenino" | null = null;
  if (genderParam && genderParam !== "all" && genderParam !== "Todas") {
    const lower = genderParam.toLowerCase().trim();
    if (lower.startsWith("fem") || lower.startsWith("dam") || lower === "f") {
      targetGender = "Femenino";
    } else if (lower.startsWith("masc") || lower.startsWith("cab") || lower === "m") {
      targetGender = "Masculino";
    }
  }

  const supabase = await createClient();

  // Comprobar si la tabla está vacía o se forzó sync
  const { count } = await supabase.from("rankings").select("*", { count: "exact", head: true });
  if (count === 0 || sync) {
    await syncAllTournamentsRankings(supabase);
  }

  // Traer los registros de rankings
  let query = supabase.from("rankings").select("*");

  if (category && category !== "all" && category !== "Todas") {
    query = query.eq("category", category);
  }

  if (type) {
    query = query.eq("ranking_type", type);
  }

  query = query.order("points", { ascending: false }).order("matches_won", { ascending: false });

  const { data: rawRankings, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Consolidar rankings en memoria sumando todos los torneos por pareja (couple_key) y por jugador (player_id)
  const coupleMap = new Map<string, any>();
  const indivMap = new Map<string, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (rawRankings || []).forEach((r: any) => {
    if (r.ranking_type === "couple") {
      const p1Id = r.player1_id || "";
      const p2Id = r.player2_id || "";
      const key = r.couple_key || getCoupleKey(p1Id, p2Id);
      const ex = coupleMap.get(key);
      if (ex) {
        ex.points += (r.points || 0);
        ex.tournaments_played += (r.tournaments_played || 0);
        ex.matches_won += (r.matches_won || 0);
        ex.matches_lost += (r.matches_lost || 0);
      } else {
        coupleMap.set(key, { ...r });
      }
    } else if (r.ranking_type === "individual" && r.player_id) {
      const ex = indivMap.get(r.player_id);
      if (ex) {
        ex.points += (r.points || 0);
        ex.tournaments_played += (r.tournaments_played || 0);
        ex.matches_won += (r.matches_won || 0);
        ex.matches_lost += (r.matches_lost || 0);
      } else {
        indivMap.set(r.player_id, { ...r });
      }
    }
  });

  const consolidatedRankings = [
    ...Array.from(coupleMap.values()),
    ...Array.from(indivMap.values()),
  ];

  // Cargar jugadores y fotografías oficiales de Storage
  const [{ data: allPlayers }, photosMap] = await Promise.all([
    supabase.from("players").select("*"),
    getPlayerPhotosMap(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersMap = new Map((allPlayers || []).map((p: any) => [p.id, enrichPlayerPhoto(p, photosMap)]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedRankings = consolidatedRankings.map((r: any) => {
    if (r.ranking_type === "couple") {
      const p1 = r.player1_id ? playersMap.get(r.player1_id) : null;
      const p2 = r.player2_id ? playersMap.get(r.player2_id) : null;
      const p1Name = p1 ? formatPlayerFullName(p1) : "Jugador 1";
      const p2Name = p2 ? formatPlayerFullName(p2) : "Jugador 2";
      const p1Gender = p1?.gender || "Masculino";
      const p2Gender = p2?.gender || "Masculino";
      const coupleGender = (p1Gender === "Femenino" && p2Gender === "Femenino") ? "Femenino" : "Masculino";
      return {
        ...r,
        name: `${p1Name} / ${p2Name}`,
        gender: coupleGender,
        player1: p1,
        player2: p2,
      };
    } else {
      const p = r.player_id ? playersMap.get(r.player_id) : null;
      const pName = p ? formatPlayerFullName(p) : "Jugador";
      const pGender = p?.gender || "Masculino";
      const pPhoto = p?.photo_url || p?.avatar_url || (r.player_id ? photosMap.get(r.player_id) : null) || null;
      return {
        ...r,
        category: p?.category || r.category || "General",
        gender: pGender,
        name: pName,
        photo_url: pPhoto,
        avatar_url: pPhoto,
        player: p,
      };
    }
  });

  // Si se solicitó ranking individual (o general sin filtro de tipo), incluir a todos los jugadores de la base de datos con 0 puntos
  if (!type || type === "individual") {
    const includedPlayerIds = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrichedRankings.forEach((r: any) => {
      if (r.ranking_type === "individual" && r.player_id) {
        includedPlayerIds.add(r.player_id);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allPlayers || []).forEach((p: any) => {
      const pGender = p.gender || "Masculino";
      if (targetGender && pGender !== targetGender) return;
      if (includedPlayerIds.has(p.id)) return;
      if (category && category !== "all" && category !== "Todas" && (p.category || "").toLowerCase().trim() !== category.toLowerCase().trim()) {
        return;
      }

      const pPhoto = p.photo_url || p.avatar_url || photosMap.get(p.id) || null;
      const enrichedP = { ...p, photo_url: pPhoto, avatar_url: pPhoto };

      enrichedRankings.push({
        id: `p-${p.id}`,
        ranking_type: "individual",
        player_id: p.id,
        category: p.category || (category && category !== "all" ? category : "General"),
        gender: pGender,
        photo_url: pPhoto,
        avatar_url: pPhoto,
        points: 0,
        tournaments_played: 0,
        matches_won: 0,
        matches_lost: 0,
        name: formatPlayerFullName(p),
        player: enrichedP,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrichedRankings.sort((a: any, b: any) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
      if ((b.matches_won || 0) !== (a.matches_won || 0)) return (b.matches_won || 0) - (a.matches_won || 0);
      const lastA = a.player?.last_name || a.name || "";
      const lastB = b.player?.last_name || b.name || "";
      return lastA.localeCompare(lastB);
    });
  }

  // Filtrado final estricto por género y por categoría
  let finalRankings = enrichedRankings;

  if (targetGender) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalRankings = finalRankings.filter((r: any) => {
      const g = r.gender || r.player?.gender || "Masculino";
      return g === targetGender;
    });
  }

  if (category && category !== "all" && category !== "Todas") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalRankings = finalRankings.filter((r: any) => (r.category || "").toLowerCase().trim() === category.toLowerCase().trim());
  }

  return NextResponse.json({
    success: true,
    gender: targetGender,
    category: category || "all",
    rankings: finalRankings,
    count: finalRankings.length,
  });
}

/**
 * POST /api/rankings
 * Procesa y liquida los puntos del torneo finalizado:
 * 1. Determina la posición final de cada pareja según la fase alcanzada.
 * 2. Actualiza el Ranking de Pareja (acumulativo para la dupla exacta).
 * 3. Actualiza el Ranking Individual (cada jugador conserva sus puntos aunque cambie de pareja).
 * 4. Registra el desglose en tournament_rankings.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { tournamentId, recalculate = false, syncAll = false } = body;

  if (syncAll || !tournamentId) {
    const syncRes = await syncAllTournamentsRankings(supabase);
    return NextResponse.json({
      success: true,
      message: "Rankings globales de todos los torneos sincronizados exitosamente",
      result: syncRes,
    });
  }

  // 1. Obtener datos del torneo
  const { data: tournament, error: tourError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tourError || !tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  // 2. Verificar que la final esté completada
  const { data: finalMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("stage", "final")
    .eq("status", "completed");

  if (!finalMatches || finalMatches.length === 0) {
    return NextResponse.json(
      { error: "El torneo aún no tiene un partido final completado para liquidar rankings" },
      { status: 400 }
    );
  }

  const finalMatch = finalMatches[0];
  const championCoupleId = finalMatch.winner_couple_id || finalMatch.winner_id;
  const runnerUpCoupleId =
    championCoupleId === (finalMatch.couple1_id || finalMatch.pair1_id)
      ? finalMatch.couple2_id || finalMatch.pair2_id
      : finalMatch.couple1_id || finalMatch.pair1_id;

  // 3. Verificar si ya fue liquidado
  const { data: existingRecords } = await supabase
    .from("tournament_rankings")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (existingRecords && existingRecords.length > 0 && !recalculate) {
    return NextResponse.json({
      success: true,
      message: "Los rankings de este torneo ya fueron procesados previamente.",
    });
  }

  // 4. Obtener todas las parejas del torneo
  let tournamentCouples: { id: string; player1_id?: string; player2_id?: string }[] = [];
  const { data: couplesData } = await supabase
    .from("couples")
    .select("id, player1_id, player2_id")
    .eq("tournament_id", tournamentId);

  if (couplesData && couplesData.length > 0) {
    tournamentCouples = couplesData;
  } else {
    const { data: pairsData } = await supabase
      .from("pairs")
      .select("id, player1_id, player2_id")
      .eq("tournament_id", tournamentId);
    if (pairsData) tournamentCouples = pairsData;
  }

  // 5. Obtener todos los partidos del torneo para computar PG, PP y etapa final alcanzada
  const { data: allMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "completed");

  const coupleStatsMap: Record<
    string,
    { matchesWon: number; matchesLost: number; highestStage: string; points: number; position: number }
  > = {};

  tournamentCouples.forEach((c) => {
    coupleStatsMap[c.id] = {
      matchesWon: 0,
      matchesLost: 0,
      highestStage: "group_stage",
      points: SPT_POINTS_SCALE.group_stage,
      position: 16,
    };
  });

  (allMatches ?? []).forEach((m) => {
    const c1 = m.couple1_id || m.pair1_id;
    const c2 = m.couple2_id || m.pair2_id;
    const winner = m.winner_couple_id || m.winner_id;

    if (c1 && coupleStatsMap[c1]) {
      if (winner === c1) coupleStatsMap[c1].matchesWon++;
      else if (winner === c2) coupleStatsMap[c1].matchesLost++;
    }
    if (c2 && coupleStatsMap[c2]) {
      if (winner === c2) coupleStatsMap[c2].matchesWon++;
      else if (winner === c1) coupleStatsMap[c2].matchesLost++;
    }

    // Registrar etapa alcanzada
    if (m.stage === "round_of_16") {
      if (c1 && coupleStatsMap[c1].points < SPT_POINTS_SCALE.round_of_16) {
        coupleStatsMap[c1].highestStage = "round_of_16";
        coupleStatsMap[c1].points = SPT_POINTS_SCALE.round_of_16;
        coupleStatsMap[c1].position = 9;
      }
      if (c2 && coupleStatsMap[c2].points < SPT_POINTS_SCALE.round_of_16) {
        coupleStatsMap[c2].highestStage = "round_of_16";
        coupleStatsMap[c2].points = SPT_POINTS_SCALE.round_of_16;
        coupleStatsMap[c2].position = 9;
      }
    }

    if (m.stage === "quarter") {
      if (c1 && coupleStatsMap[c1].points < SPT_POINTS_SCALE.quarterfinalist) {
        coupleStatsMap[c1].highestStage = "quarter";
        coupleStatsMap[c1].points = SPT_POINTS_SCALE.quarterfinalist;
        coupleStatsMap[c1].position = 5;
      }
      if (c2 && coupleStatsMap[c2].points < SPT_POINTS_SCALE.quarterfinalist) {
        coupleStatsMap[c2].highestStage = "quarter";
        coupleStatsMap[c2].points = SPT_POINTS_SCALE.quarterfinalist;
        coupleStatsMap[c2].position = 5;
      }
    }

    if (m.stage === "semi") {
      if (c1 && coupleStatsMap[c1].points < SPT_POINTS_SCALE.semifinalist) {
        coupleStatsMap[c1].highestStage = "semi";
        coupleStatsMap[c1].points = SPT_POINTS_SCALE.semifinalist;
        coupleStatsMap[c1].position = 3;
      }
      if (c2 && coupleStatsMap[c2].points < SPT_POINTS_SCALE.semifinalist) {
        coupleStatsMap[c2].highestStage = "semi";
        coupleStatsMap[c2].points = SPT_POINTS_SCALE.semifinalist;
        coupleStatsMap[c2].position = 3;
      }
    }
  });

  // Asignar puntos al Campeón y Subcampeón
  if (championCoupleId && coupleStatsMap[championCoupleId]) {
    coupleStatsMap[championCoupleId].highestStage = "final";
    coupleStatsMap[championCoupleId].points = SPT_POINTS_SCALE.champion;
    coupleStatsMap[championCoupleId].position = 1;
  }

  if (runnerUpCoupleId && coupleStatsMap[runnerUpCoupleId]) {
    coupleStatsMap[runnerUpCoupleId].highestStage = "final";
    coupleStatsMap[runnerUpCoupleId].points = SPT_POINTS_SCALE.runner_up;
    coupleStatsMap[runnerUpCoupleId].position = 2;
  }

  const category = tournament.category || "General";
  const tournamentRankingsToInsert: {
    tournament_id: string;
    pair_id: string;
    player_id: string;
    points_earned: number;
    final_position: number;
  }[] = [];

  // 6. Liquidar rankings para cada pareja y jugador
  for (const couple of tournamentCouples) {
    const stats = coupleStatsMap[couple.id];
    if (!stats) continue;

    const p1Id = couple.player1_id;
    const p2Id = couple.player2_id;
    if (!p1Id || !p2Id) continue;
    const pointsAwarded = stats.points;
    const coupleKey = getCoupleKey(p1Id, p2Id);

    // Auditoría en tournament_rankings para cada jugador
    for (const pId of [p1Id, p2Id]) {
      if (pId) {
        tournamentRankingsToInsert.push({
          tournament_id: tournamentId,
          pair_id: couple.id,
          player_id: pId,
          points_earned: pointsAwarded,
          final_position: stats.position,
        });
      }
    }

    // ------------------------------------------------------------------------
    // A) RANKING DE PAREJA (Suma puntos si la pareja se mantiene junta)
    // ------------------------------------------------------------------------
    if (p1Id && p2Id) {
      const { data: existingCoupleRanking } = await supabase
        .from("rankings")
        .select("*")
        .eq("ranking_type", "couple")
        .eq("category", category)
        .or(`couple_key.eq.${coupleKey},and(player1_id.eq.${p1Id},player2_id.eq.${p2Id}),and(player1_id.eq.${p2Id},player2_id.eq.${p1Id})`)
        .maybeSingle();

      if (existingCoupleRanking) {
        await supabase
          .from("rankings")
          .update({
            points: existingCoupleRanking.points + pointsAwarded,
            tournaments_played: existingCoupleRanking.tournaments_played + 1,
            matches_won: existingCoupleRanking.matches_won + stats.matchesWon,
            matches_lost: existingCoupleRanking.matches_lost + stats.matchesLost,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCoupleRanking.id);
      } else {
        await supabase.from("rankings").insert({
          ranking_type: "couple",
          player1_id: p1Id,
          player2_id: p2Id,
          couple_key: coupleKey,
          category,
          points: pointsAwarded,
          tournaments_played: 1,
          matches_won: stats.matchesWon,
          matches_lost: stats.matchesLost,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // ------------------------------------------------------------------------
    // B) RANKING INDIVIDUAL (Suma puntos a cada jugador y se conserva aunque cambie de pareja)
    // ------------------------------------------------------------------------
    for (const pId of [p1Id, p2Id]) {
      if (!pId) continue;

      const { data: existingIndivRanking } = await supabase
        .from("rankings")
        .select("*")
        .eq("ranking_type", "individual")
        .eq("player_id", pId)
        .eq("category", category)
        .maybeSingle();

      if (existingIndivRanking) {
        await supabase
          .from("rankings")
          .update({
            points: existingIndivRanking.points + pointsAwarded,
            tournaments_played: existingIndivRanking.tournaments_played + 1,
            matches_won: existingIndivRanking.matches_won + stats.matchesWon,
            matches_lost: existingIndivRanking.matches_lost + stats.matchesLost,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingIndivRanking.id);
      } else {
        await supabase.from("rankings").insert({
          ranking_type: "individual",
          player_id: pId,
          category,
          points: pointsAwarded,
          tournaments_played: 1,
          matches_won: stats.matchesWon,
          matches_lost: stats.matchesLost,
          updated_at: new Date().toISOString(),
        });
      }

      // Sincronizar también con global_rankings si la tabla existe
      try {
        const { data: exGlobal } = await supabase
          .from("global_rankings")
          .select("*")
          .eq("player_id", pId)
          .maybeSingle();

        if (exGlobal) {
          await supabase
            .from("global_rankings")
            .update({
              total_points: exGlobal.total_points + pointsAwarded,
              tournaments_played: exGlobal.tournaments_played + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("player_id", pId);
        } else {
          await supabase.from("global_rankings").insert({
            player_id: pId,
            total_points: pointsAwarded,
            tournaments_played: 1,
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        // Ignorar si tabla opcional no existe
      }
    }
  }

  // 7. Guardar registros históricos del torneo
  if (tournamentRankingsToInsert.length > 0) {
    try {
      await supabase.from("tournament_rankings").insert(tournamentRankingsToInsert);
    } catch {
      // Ignorar si tabla opcional no existe
    }
  }

  // 8. Marcar torneo como 'finished'
  await supabase
    .from("tournaments")
    .update({ status: "finished", updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  // 9. Consolidar acumulados globales de todos los torneos
  await syncAllTournamentsRankings(supabase);

  return NextResponse.json({
    success: true,
    message: "Rankings liquidados y actualizados exitosamente para Parejas e Individual",
    category,
    championCoupleId,
    runnerUpCoupleId,
    processedCouples: tournamentCouples.length,
    pointsDistributed: tournamentCouples.map((c) => ({
      coupleId: c.id,
      points: coupleStatsMap[c.id]?.points ?? 0,
      stage: coupleStatsMap[c.id]?.highestStage ?? "group_stage",
    })),
  });
}
