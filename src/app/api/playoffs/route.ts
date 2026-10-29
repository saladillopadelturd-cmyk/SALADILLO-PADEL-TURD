import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateRoundRobinStandings, getQualifiedPairs, getEliminatedPair } from "@/lib/tournament/standings";
import {
  generateSeededPlayoffBracket,
  type QualifiedPair,
  getStageName,
  propagatePlayoffWinners,
} from "@/lib/tournament/elimination";

/**
 * Helper para calcular clasificados y eliminados por zona:
 * - En zonas de 4 parejas: clasifican las 3 mejores (1°, 2°, 3°). La 4ª queda eliminada.
 * - En zonas de 3 parejas: clasifican las 2 mejores (1°, 2°). La 3ª queda eliminada.
 */
async function calculateZoneQualifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string
) {
  // 1. Zonas del torneo
  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("zone_number", { ascending: true });

  if (!zones || zones.length === 0) {
    return { qualifiedPairs: [], eliminatedPairs: [], isZonePhaseCompleted: false, totalZoneMatches: 0, pendingZoneMatches: 0 };
  }

  // 2. Partidos de zona
  const { data: zoneMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("stage", "zone");

  const totalZoneMatches = zoneMatches?.length ?? 0;
  const pendingZoneMatches = (zoneMatches ?? []).filter((m) => m.status !== "completed").length;
  const isZonePhaseCompleted = totalZoneMatches > 0 && pendingZoneMatches === 0;

  // 3. Parejas con datos completos
  const { data: allCouples } = await supabase
    .from("couples")
    .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)")
    .eq("tournament_id", tournamentId);

  const couplesMap = new Map((allCouples || []).map((c) => [c.id, c]));

  // 4. Mapeo zone_couples
  const { data: zcData } = await supabase
    .from("zone_couples")
    .select("zone_id, couple_id")
    .in("zone_id", zones.map((z) => z.id));

  const zoneCouplesMap = new Map<string, string[]>();
  (zcData || []).forEach((zc) => {
    const list = zoneCouplesMap.get(zc.zone_id) || [];
    list.push(zc.couple_id);
    zoneCouplesMap.set(zc.zone_id, list);
  });

  const qualifiedPairs: (QualifiedPair & { couple?: unknown })[] = [];
  const eliminatedPairs: { pairId: string; zoneName: string; zonePosition: number; couple?: unknown }[] = [];

  for (const zone of zones) {
    let pairIds = zoneCouplesMap.get(zone.id) || [];
    if (pairIds.length === 0) {
      pairIds = (allCouples || []).filter((c) => c.zone_id === zone.id).map((c) => c.id);
    }
    if (pairIds.length === 0) continue;

    const matchesThisZone = (zoneMatches || []).filter((m) => m.zone_id === zone.id);
    const standings = calculateRoundRobinStandings(matchesThisZone, pairIds);

    // Regla oficial:
    // Zona de 4 -> clasifican 3 (1°, 2°, 3°).
    // Zona de 3 -> clasifican 2 (1°, 2°).
    const qualified = getQualifiedPairs(standings);
    const eliminated = getEliminatedPair(standings);

    if (eliminated && standings.length > qualified.length) {
      const elimId = eliminated.couple_id || eliminated.pair_id || "";
      eliminatedPairs.push({
        pairId: elimId,
        zoneName: zone.name,
        zonePosition: eliminated.position || standings.length,
        couple: couplesMap.get(elimId),
      });
    }

    qualified.forEach((s) => {
      const pid = s.couple_id || s.pair_id || "";
      qualifiedPairs.push({
        pairId: pid,
        zoneId: zone.id,
        zoneName: zone.name,
        zonePosition: s.position || 1,
        points: s.points,
        gameDifference: (s.games_won ?? 0) - (s.games_lost ?? 0),
        gamesWon: s.games_won ?? 0,
        couple: couplesMap.get(pid),
      });
    });
  }

  return {
    qualifiedPairs,
    eliminatedPairs,
    isZonePhaseCompleted,
    totalZoneMatches,
    pendingZoneMatches,
  };
}

/**
 * GET /api/playoffs?tournamentId=xxx
 * Obtiene el cuadro eliminatorio completo, el estado de cada partido
 * y la lista oficial de parejas clasificadas por zona.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
  }

  const supabase = await createClient();

  // Partidos de playoffs
  const { data: playoffMatches, error } = await supabase
    .from("matches")
    .select("*, couple1:couples!matches_couple1_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)), couple2:couples!matches_couple2_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*))")
    .eq("tournament_id", tournamentId)
    .neq("stage", "zone")
    .order("match_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-limpieza de llaves de 16vos no utilizadas (si el cuadro ya estaba definido)
  let cleanPlayoffMatches = playoffMatches || [];
  const unusedR32Matches = cleanPlayoffMatches.filter(
    (m) =>
      m.stage === "round_of_32" &&
      (!m.couple1_id || !m.couple2_id || String(m.score_set1 || "").includes("BYE"))
  );
  if (unusedR32Matches.length > 0) {
    const unusedIds = unusedR32Matches.map((m) => m.id);
    await supabase.from("matches").delete().in("id", unusedIds);
    cleanPlayoffMatches = cleanPlayoffMatches.filter((m) => !unusedIds.includes(m.id));
  }

  // Propagar ganadores y auto-sanar slots pendientes en la base de datos si fuera necesario
  const { updatedMatches, updatesToPersist } = propagatePlayoffWinners(cleanPlayoffMatches);
  if (updatesToPersist.length > 0) {
    for (const update of updatesToPersist) {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (update.couple1_id !== undefined) payload.couple1_id = update.couple1_id;
      if (update.couple2_id !== undefined) payload.couple2_id = update.couple2_id;

      await supabase.from("matches").update(payload).eq("id", update.id);
    }
  }

  // Calcular las parejas clasificadas y eliminadas de las zonas
  const qualificationInfo = await calculateZoneQualifications(supabase, tournamentId);

  return NextResponse.json({
    success: true,
    matches: updatedMatches,
    qualifiedPairs: qualificationInfo.qualifiedPairs,
    eliminatedPairs: qualificationInfo.eliminatedPairs,
    isZonePhaseCompleted: qualificationInfo.isZonePhaseCompleted,
    pendingZoneMatches: qualificationInfo.pendingZoneMatches,
  });
}

/**
 * POST /api/playoffs
 * Permite al administrador conformar y gestionar manualmente cada partido del cuadro:
 * - action: "create_match": Crear un partido individual de eliminación
 * - action: "update_match": Editar parejas o instancia de un partido de eliminación
 * - action: "delete_match": Eliminar un partido de eliminación
 * - action: "clear_playoffs": Vaciar el cuadro de playoffs
 * - action: "generate_fap": Generar sugerencia de cuadro oficial FAP
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const {
    tournamentId,
    action = "generate_fap",
    matchId,
    stage,
    couple1_id,
    couple2_id,
    isBye = false,
    match_number,
    force = false,
  } = body;

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
  }

  // 1. ELIMINAR PARTIDO ESPECÍFICO DE PLAYOFF
  if (action === "delete_match") {
    if (!matchId) {
      return NextResponse.json({ error: "matchId es requerido para eliminar" }, { status: 400 });
    }
    const { error: delError } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId)
      .eq("tournament_id", tournamentId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Partido de eliminación eliminado con éxito" });
  }

  // 2. VACIAR TODOS LOS PARTIDOS DE PLAYOFF
  if (action === "clear_playoffs") {
    const { error: clearError } = await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .neq("stage", "zone");

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Cuadro de eliminación vaciado con éxito" });
  }

  const cleanCoupleId = (v: unknown): string | null => {
    if (!v || typeof v !== "string") return null;
    const t = v.trim();
    if (!t || t === "Por definir" || t === "BYE" || t.toLowerCase() === "null" || t.toLowerCase() === "undefined") {
      return null;
    }
    return t;
  };

  const cleanStage = (stageVal: unknown): string => {
    if (!stageVal || typeof stageVal !== "string") return "quarter";
    const s = stageVal.trim();
    if (s === "cuartos") return "quarter";
    if (s === "octavos") return "round_of_16";
    if (s === "semifinal") return "semi";
    if (s === "dieciseisavos") return "round_of_32";
    if (s === "tercer_puesto") return "third_place";
    return s;
  };

  // 2.5 GUARDAR CUADRO MANUAL GENERADO
  if (action === "save_manual_bracket") {
    const { matches: matchesToSave } = body;
    if (!Array.isArray(matchesToSave) || matchesToSave.length === 0) {
      return NextResponse.json(
        { error: "matches es requerido y debe ser una lista de partidos" },
        { status: 400 }
      );
    }

    // Eliminar partidos de eliminación previos
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .neq("stage", "zone");

    // Preparar registros y eliminar todas las llaves de 16vos de final no utilizadas
    const records = matchesToSave
      .filter((m: {
        stage: unknown;
        couple1_id: unknown;
        couple2_id: unknown;
        score_set1?: unknown;
      }) => {
        const stg = cleanStage(m.stage);
        if (stg === "round_of_32") {
          const c1 = cleanCoupleId(m.couple1_id);
          const c2 = cleanCoupleId(m.couple2_id);
          const isBye = !c2 || String(m.score_set1 || "").includes("BYE");
          if (!c1 || !c2 || isBye) {
            return false; // Eliminar llave de 16vos no utilizada
          }
        }
        return true;
      })
      .map((m: {
      stage: unknown;
      match_number: unknown;
      couple1_id: unknown;
      couple2_id: unknown;
      winner_couple_id?: unknown;
      score_set1?: unknown;
      status?: unknown;
    }) => {
      const c1 = cleanCoupleId(m.couple1_id);
      const c2 = cleanCoupleId(m.couple2_id);
      const isBye = !c2 && !!c1 && (m.status === "completed" || String(m.score_set1 || "").includes("BYE"));
      const winner = isBye ? c1 : cleanCoupleId(m.winner_couple_id);

      return {
        tournament_id: tournamentId,
        stage: cleanStage(m.stage),
        match_number: Number(m.match_number),
        couple1_id: c1,
        couple2_id: c2,
        winner_couple_id: winner,
        score_set1: isBye ? "BYE (Pasa de ronda)" : (m.score_set1 as string | null) ?? null,
        status: isBye ? "completed" : ((m.status as string) || "pending"),
      };
    });

    const { data: inserted, error: insErr } = await supabase
      .from("matches")
      .insert(records)
      .select();

    if (insErr) {
      console.error("Error al guardar cuadro manual:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Auto-propagar ganadores para asegurar coherencia en llaves
    const { data: currentMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .neq("stage", "zone")
      .order("match_number", { ascending: true });

    if (currentMatches && currentMatches.length > 0) {
      const { updatesToPersist } = propagatePlayoffWinners(currentMatches);
      for (const update of updatesToPersist) {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (update.couple1_id !== undefined) payload.couple1_id = update.couple1_id;
        if (update.couple2_id !== undefined) payload.couple2_id = update.couple2_id;
        await supabase.from("matches").update(payload).eq("id", update.id);
      }
    }

    // Actualizar estado del torneo a playoffs
    await supabase
      .from("tournaments")
      .update({ status: "playoffs", updated_at: new Date().toISOString() })
      .eq("id", tournamentId);

    return NextResponse.json({
      success: true,
      message: "Cuadro de eliminación directa generado exitosamente",
      matchesCreated: records.length,
    });
  }

  // 3. EDITAR PARTIDO DE PLAYOFF (CAMBIAR PAREJAS O INSTANCIA)
  if (action === "update_match") {
    if (!matchId) {
      return NextResponse.json({ error: "matchId es requerido para editar" }, { status: 400 });
    }

    const c1 = cleanCoupleId(couple1_id);
    const c2 = isBye ? null : cleanCoupleId(couple2_id);

    if (c1 && c2 && c1 === c2) {
      return NextResponse.json({ error: "La Pareja 1 y la Pareja 2 no pueden ser la misma." }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      couple1_id: c1,
      couple2_id: c2,
    };

    if (stage) payload.stage = cleanStage(stage);
    if (match_number !== undefined) payload.match_number = Number(match_number);

    if (isBye) {
      payload.couple2_id = null;
      payload.winner_couple_id = c1;
      payload.score_set1 = "BYE (Pasa de ronda)";
      payload.status = "completed";
    } else {
      payload.winner_couple_id = null;
      payload.score_set1 = null;
      payload.status = "pending";
    }

    const { data: updated, error: updateError } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", matchId)
      .eq("tournament_id", tournamentId)
      .select()
      .single();

    if (updateError) {
      console.error("Error al actualizar partido de playoffs:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Partido de eliminación actualizado con éxito",
      match: updated,
    });
  }

  // 4. CREAR PARTIDO INDIVIDUAL DE PLAYOFF POR EL ADMINISTRADOR
  if (action === "create_match") {
    const sanitizedStage = cleanStage(stage);
    const c1 = cleanCoupleId(couple1_id);
    const c2 = isBye ? null : cleanCoupleId(couple2_id);

    if (c1 && c2 && c1 === c2) {
      return NextResponse.json({ error: "La Pareja 1 y la Pareja 2 no pueden ser la misma." }, { status: 400 });
    }

    // Calcular siguiente match_number si no se envió
    let assignedMatchNumber = match_number;
    if (!assignedMatchNumber) {
      const { data: maxM } = await supabase
        .from("matches")
        .select("match_number")
        .eq("tournament_id", tournamentId)
        .order("match_number", { ascending: false })
        .limit(1);

      assignedMatchNumber = (maxM?.[0]?.match_number ?? 100) + 1;
    }

    const matchToInsert = {
      tournament_id: tournamentId,
      stage: sanitizedStage,
      match_number: Number(assignedMatchNumber),
      couple1_id: c1,
      couple2_id: c2,
      winner_couple_id: isBye ? c1 : null,
      score_set1: isBye ? "BYE (Pasa de ronda)" : null,
      status: isBye ? "completed" : "pending",
    };

    const { data: inserted, error: insErr } = await supabase
      .from("matches")
      .insert(matchToInsert)
      .select()
      .single();

    if (insErr) {
      console.error("Error al crear partido de playoffs:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Actualizar estado del torneo a playoffs si no lo estaba
    await supabase
      .from("tournaments")
      .update({ status: "playoffs", updated_at: new Date().toISOString() })
      .eq("id", tournamentId);

    return NextResponse.json({
      success: true,
      message: "Partido de eliminación creado con éxito",
      match: inserted,
    });
  }

  // 5. ACCIÓN SUGERIR / CARGAR CRUCES OFICIALES FAP (A DEMANDA DEL ADMINISTRADOR)
  // Calcula clasificados: en zonas de 4 clasifican 3; en zonas de 3 clasifican 2
  const qualificationInfo = await calculateZoneQualifications(supabase, tournamentId);
  const { qualifiedPairs, eliminatedPairs, pendingZoneMatches } = qualificationInfo;

  if (pendingZoneMatches > 0 && !force) {
    return NextResponse.json(
      {
        error: `Faltan completar ${pendingZoneMatches} partidos de la fase de zonas antes de conformar los playoffs. (Use force: true para forzar)`,
      },
      { status: 400 }
    );
  }

  if (qualifiedPairs.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 parejas clasificadas para conformar el cuadro" },
      { status: 400 }
    );
  }

  const totalTournamentCouples = qualifiedPairs.length + eliminatedPairs.length;
  const bracket = generateSeededPlayoffBracket(qualifiedPairs, totalTournamentCouples);
  const initialStage = bracket.allStages[0];

  // Eliminar partidos de playoffs previos si existían
  await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .neq("stage", "zone");

  let matchNumber = 101;
  const matchesToInsert: {
    tournament_id: string;
    stage: string;
    match_number: number;
    couple1_id: string | null;
    couple2_id: string | null;
    winner_couple_id?: string | null;
    score_set1?: string | null;
    status: string;
  }[] = [];
  const firstRoundMatchesCreated: { id?: string; advancingPairId?: string; isBye: boolean; matchNumber: number }[] = [];

  for (let mIdx = 0; mIdx < bracket.firstRoundMatches.length; mIdx++) {
    const m = bracket.firstRoundMatches[mIdx];
    const isMBye = m.isBye;
    const couple1 = m.couple1Id !== "BYE" ? m.couple1Id : null;
    const couple2 = m.couple2Id !== "BYE" ? m.couple2Id : null;
    const winnerId = isMBye ? m.advancingPairId ?? couple1 ?? couple2 : null;
    const assignedNum = matchNumber++;

    // REGLA: Cuando el cuadro de eliminación quede definido, eliminar todas las llaves de 16vos de final no utilizadas.
    // Si la etapa inicial es 16vos (round_of_32) y es un cruce con BYE (pareja sembrada directo a 8vos) o vacío,
    // NO se inserta en la base de datos. Solo se insertan partidos reales entre dos parejas competidoras.
    const shouldInsertFirstRoundMatch =
      initialStage !== "round_of_32" || (!isMBye && !!couple1 && !!couple2);

    if (shouldInsertFirstRoundMatch) {
      matchesToInsert.push({
        tournament_id: tournamentId,
        stage: initialStage,
        match_number: assignedNum,
        couple1_id: couple1,
        couple2_id: couple2,
        winner_couple_id: winnerId,
        score_set1: isMBye ? "BYE (Pasa de ronda)" : null,
        status: isMBye ? "completed" : "pending",
      });
    }

    firstRoundMatchesCreated.push({
      advancingPairId: m.advancingPairId,
      isBye: isMBye,
      matchNumber: assignedNum,
    });
  }

  // Crear slots para rondas sucesivas
  let previousRoundSlotsCount = bracket.firstRoundMatches.length;
  for (let sIdx = 1; sIdx < bracket.allStages.length; sIdx++) {
    const currentStage = bracket.allStages[sIdx];
    const matchesInThisStage = Math.max(1, previousRoundSlotsCount / 2);

    for (let mIdx = 0; mIdx < matchesInThisStage; mIdx++) {
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
        match_number: matchNumber++,
        couple1_id: prefilledC1,
        couple2_id: prefilledC2,
        status: "pending",
      });
    }

    previousRoundSlotsCount = matchesInThisStage;
  }

  const { error: insertError } = await supabase.from("matches").insert(matchesToInsert);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Auto-propagar cruces con BYE
  const { data: insertedMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .neq("stage", "zone")
    .order("match_number", { ascending: true });

  if (insertedMatches && insertedMatches.length > 0) {
    const { updatesToPersist } = propagatePlayoffWinners(insertedMatches);
    for (const update of updatesToPersist) {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (update.couple1_id !== undefined) payload.couple1_id = update.couple1_id;
      if (update.couple2_id !== undefined) payload.couple2_id = update.couple2_id;
      await supabase.from("matches").update(payload).eq("id", update.id);
    }
  }

  await supabase
    .from("tournaments")
    .update({ status: "playoffs", updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  const hasR32Inserted = matchesToInsert.some((m) => m.stage === "round_of_32");
  const effectiveInitialStage = hasR32Inserted ? initialStage : "round_of_16";
  const effectiveStages = hasR32Inserted
    ? bracket.allStages
    : bracket.allStages.filter((s) => s !== "round_of_32");

  return NextResponse.json({
    success: true,
    message: `Cuadro de eliminación generado (${getStageName(effectiveInitialStage)})`,
    qualifiedCount: qualifiedPairs.length,
    eliminatedCount: eliminatedPairs.length,
    totalSlots: bracket.totalSlots,
    byesCount: bracket.byesCount,
    stages: effectiveStages,
    matchesCreated: matchesToInsert.length,
    eliminatedPairs,
  });
}

/**
 * DELETE /api/playoffs?tournamentId=xxx&matchId=yyy
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");
  const matchId = searchParams.get("matchId");

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
  }

  const supabase = await createClient();

  if (matchId) {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId)
      .eq("tournament_id", tournamentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Partido eliminado" });
  } else {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .neq("stage", "zone");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Partidos de eliminación eliminados" });
  }
}
