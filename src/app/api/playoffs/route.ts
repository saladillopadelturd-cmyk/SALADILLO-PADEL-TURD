import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateRoundRobinStandings, getQualifiedPairs } from "@/lib/tournament/standings";
import {
  generateSeededPlayoffBracket,
  type QualifiedPair,
  getStageName,
} from "@/lib/tournament/elimination";

/**
 * GET /api/playoffs?tournamentId=xxx
 * Obtiene el cuadro eliminatorio completo y el estado de cada partido.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: playoffMatches, error } = await supabase
    .from("matches")
    .select("*, couple1:couples!matches_couple1_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)), couple2:couples!matches_couple2_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*))")
    .eq("tournament_id", tournamentId)
    .neq("stage", "zone")
    .order("match_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    matches: playoffMatches,
  });
}

/**
 * POST /api/playoffs
 * Genera automáticamente el cuadro de eliminación directa (Playoffs):
 * 1. Calcula las posiciones finales de cada zona.
 * 2. Aplica la regla SPT: La PEOR de cada zona queda eliminada; las demás clasifican.
 * 3. Cruza 1°s contra 2°s/3°s evitando parejas de la misma zona en primera ronda.
 * 4. Asigna BYEs a los mejores 1°s si el número no es potencia de 2.
 * 5. Inserta los partidos del cuadro (Octavos/Cuartos/Semis/Final) en la BD.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { tournamentId, force = false } = body;

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
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

  // 2. Obtener zonas del torneo
  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("zone_number", { ascending: true });

  if (!zones || zones.length === 0) {
    return NextResponse.json(
      { error: "No hay zonas configuradas para este torneo" },
      { status: 400 }
    );
  }

  // 3. Obtener todos los partidos de zona
  const { data: zoneMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("stage", "zone");

  const pendingZoneMatches = zoneMatches?.filter((m) => m.status !== "completed") ?? [];
  if (pendingZoneMatches.length > 0 && !force) {
    return NextResponse.json(
      {
        error: `Faltan completar ${pendingZoneMatches.length} partidos de la fase de zonas antes de generar los playoffs. (Use force: true para forzar)`,
      },
      { status: 400 }
    );
  }

  // 4. Calcular clasificados por zona (excluyendo a la peor pareja de cada zona)
  const allQualified: QualifiedPair[] = [];
  const eliminatedPairs: { pairId: string; zoneName: string }[] = [];

  for (const zone of zones) {
    // Parejas de esta zona
    let zonePairIds: string[] = [];
    const { data: zc } = await supabase
      .from("zone_couples")
      .select("couple_id")
      .eq("zone_id", zone.id);

    if (zc && zc.length > 0) {
      zonePairIds = zc.map((item) => item.couple_id);
    } else {
      const { data: cp } = await supabase
        .from("couples")
        .select("id")
        .eq("zone_id", zone.id);
      if (cp) zonePairIds = cp.map((p) => p.id);
    }

    if (zonePairIds.length === 0) continue;

    const matchesThisZone = (zoneMatches ?? []).filter((m) => m.zone_id === zone.id);
    const standings = calculateRoundRobinStandings(matchesThisZone, zonePairIds);

    // Regla SPT: La peor clasificada queda eliminada
    const qualifiedInZone = getQualifiedPairs(standings);

    // Identificar a la eliminada
    if (standings.length > qualifiedInZone.length) {
      const last = standings[standings.length - 1];
      eliminatedPairs.push({
        pairId: last.couple_id || last.pair_id || "",
        zoneName: zone.name,
      });
    }

    // Agregar a la lista de clasificados con su posición (1°, 2°, 3°)
    qualifiedInZone.forEach((s) => {
      allQualified.push({
        pairId: s.couple_id || s.pair_id || "",
        zoneId: zone.id,
        zoneName: zone.name,
        zonePosition: s.position || 1,
        points: s.points,
        gameDifference: (s.games_won ?? 0) - (s.games_lost ?? 0),
        gamesWon: s.games_won ?? 0,
      });
    });
  }

  if (allQualified.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 parejas clasificadas para generar los playoffs" },
      { status: 400 }
    );
  }

  // 5. Generar emparejamientos y cuadro de playoffs
  const bracket = generateSeededPlayoffBracket(allQualified);
  const initialStage = bracket.allStages[0];

  // 6. Eliminar partidos de playoffs previos si existían
  await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .neq("stage", "zone");

  let matchNumber = 100;
  const matchesToInsert: {
    tournament_id: string;
    stage: string;
    round: string;
    match_number: number;
    couple1_id: string | null;
    couple2_id: string | null;
    pair1_id: string | null;
    pair2_id: string | null;
    winner_couple_id?: string | null;
    winner_id?: string | null;
    score_set1?: string | null;
    status: string;
  }[] = [];
  const firstRoundMatchesCreated: { id?: string; advancingPairId?: string; isBye: boolean }[] = [];

  // 7. Insertar primera ronda de Playoffs (Octavos / Cuartos / Semis)
  for (const m of bracket.firstRoundMatches) {
    const isBye = m.isBye;
    const couple1 = m.couple1Id !== "BYE" ? m.couple1Id : null;
    const couple2 = m.couple2Id !== "BYE" ? m.couple2Id : null;
    const winnerId = isBye ? m.advancingPairId ?? couple1 ?? couple2 : null;

    matchesToInsert.push({
      tournament_id: tournamentId,
      stage: initialStage,
      round: initialStage,
      match_number: matchNumber++,
      couple1_id: couple1,
      couple2_id: couple2,
      pair1_id: couple1,
      pair2_id: couple2,
      winner_couple_id: winnerId,
      winner_id: winnerId,
      score_set1: isBye ? "BYE (Pasa de ronda)" : null,
      status: isBye ? "completed" : "pending",
    });

    firstRoundMatchesCreated.push({
      advancingPairId: m.advancingPairId,
      isBye,
    });
  }

  // 8. Crear slots para rondas sucesivas (Semifinales, Final...)
  let previousRoundSlotsCount = bracket.firstRoundMatches.length;

  for (let sIdx = 1; sIdx < bracket.allStages.length; sIdx++) {
    const currentStage = bracket.allStages[sIdx];
    const matchesInThisStage = Math.max(1, previousRoundSlotsCount / 2);

    for (let mIdx = 0; mIdx < matchesInThisStage; mIdx++) {
      // Si venimos de la ronda 1 y hubo parejas con BYE, vincularlas al slot sucesivo
      let prefilledC1: string | null = null;
      let prefilledC2: string | null = null;

      if (sIdx === 1) {
        const originatingMatch1 = firstRoundMatchesCreated[mIdx * 2];
        const originatingMatch2 = firstRoundMatchesCreated[mIdx * 2 + 1];
        if (originatingMatch1?.isBye && originatingMatch1.advancingPairId) {
          prefilledC1 = originatingMatch1.advancingPairId;
        }
        if (originatingMatch2?.isBye && originatingMatch2.advancingPairId) {
          prefilledC2 = originatingMatch2.advancingPairId;
        }
      }

      matchesToInsert.push({
        tournament_id: tournamentId,
        stage: currentStage,
        round: currentStage,
        match_number: matchNumber++,
        couple1_id: prefilledC1,
        couple2_id: prefilledC2,
        pair1_id: prefilledC1,
        pair2_id: prefilledC2,
        status: "pending",
      });
    }

    previousRoundSlotsCount = matchesInThisStage;
  }

  const { error: insertError } = await supabase.from("matches").insert(matchesToInsert);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 9. Actualizar estado del torneo a 'playoffs'
  await supabase
    .from("tournaments")
    .update({ status: "playoffs", updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  return NextResponse.json({
    success: true,
    message: `Cuadro de playoffs generado con éxito (${getStageName(initialStage)})`,
    qualifiedCount: allQualified.length,
    eliminatedCount: eliminatedPairs.length,
    totalSlots: bracket.totalSlots,
    byesCount: bracket.byesCount,
    stages: bracket.allStages,
    matchesCreated: matchesToInsert.length,
    eliminatedPairs,
  });
}
