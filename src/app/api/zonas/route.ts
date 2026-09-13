import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Genera el fixture Round-Robin (todos contra todos) para una lista de parejas.
 */
function generateRoundRobinPairs(coupleIds: string[]): { couple1Id: string; couple2Id: string }[] {
  const matches: { couple1Id: string; couple2Id: string }[] = [];
  for (let i = 0; i < coupleIds.length; i++) {
    for (let j = i + 1; j < coupleIds.length; j++) {
      matches.push({
        couple1Id: coupleIds[i],
        couple2Id: coupleIds[j],
      });
    }
  }
  return matches;
}

/**
 * GET /api/zonas?tournamentId=xxx
 * Obtiene las zonas del torneo, parejas asignadas y fixture de fase de grupos.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: zones, error: zoneError } = await supabase
    .from("zones")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("zone_number", { ascending: true });

  if (zoneError) {
    return NextResponse.json({ error: zoneError.message }, { status: 500 });
  }

  // Obtener parejas y asignaciones a zonas
  const { data: zoneCouples } = await supabase
    .from("zone_couples")
    .select("*, couple:couples(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*))");

  // Obtener partidos de fase de grupos
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("stage", "zone");

  return NextResponse.json({
    success: true,
    zones,
    zoneCouples,
    matches,
  });
}

/**
 * POST /api/zonas
 * Soporta 3 acciones:
 * 1. "shuffle" (por defecto): Sorteo automático de parejas en zonas de 3 o 4 parejas.
 * 2. "manual": Reordenamiento o asignación manual de parejas a zonas por el Admin.
 * 3. "generate_matches": Crea los partidos round-robin (todos contra todos) en la tabla matches.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const { tournamentId, action = "shuffle", assignments } = body;

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
  }

  // 1. Obtener torneo
  const { data: tournament, error: tourError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tourError || !tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  // Obtener parejas inscritas (intentar 'couples' primero, luego fallback a 'pairs')
  let couples: { id: string }[] = [];
  const { data: couplesData } = await supabase
    .from("couples")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (couplesData && couplesData.length > 0) {
    couples = couplesData;
  } else {
    const { data: pairsData } = await supabase
      .from("pairs")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (pairsData) couples = pairsData;
  }

  if (couples.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 parejas para conformar zonas" },
      { status: 400 }
    );
  }

  // ==========================================================================
  // ACCIÓN 1: REORDENAMIENTO MANUAL DE PAREJAS EN ZONAS
  // ==========================================================================
  if (action === "manual" && Array.isArray(assignments)) {
    type Assignment = { zoneId: string; coupleId: string };
    const validAssignments = assignments as Assignment[];
    // 1. Limpiar asignaciones previas en zone_couples
    const zoneIds = Array.from(new Set(validAssignments.map((a) => a.zoneId)));
    for (const zId of zoneIds) {
      await supabase.from("zone_couples").delete().eq("zone_id", zId);
    }

    // 2. Insertar nuevas asignaciones
    const newZoneCouples = validAssignments.map((a) => ({
      zone_id: a.zoneId,
      couple_id: a.coupleId,
    }));

    const { error: insertError } = await supabase
      .from("zone_couples")
      .insert(newZoneCouples);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Sincronizar columna zone_id en couples y pairs
    for (const a of validAssignments) {
      await supabase.from("couples").update({ zone_id: a.zoneId }).eq("id", a.coupleId);
      try {
        await supabase.from("pairs").update({ zone_id: a.zoneId }).eq("id", a.coupleId);
      } catch {
        // Ignorar si tabla opcional no existe
      }
    }

    return NextResponse.json({
      success: true,
      message: "Zonas reordenadas manualmente con éxito",
      assignedCount: assignments.length,
    });
  }

  // ==========================================================================
  // ACCIÓN 2: GENERACIÓN DE PARTIDOS (TODOS CONTRA TODOS)
  // ==========================================================================
  if (action === "generate_matches") {
    const { data: zones } = await supabase
      .from("zones")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("zone_number", { ascending: true });

    if (!zones || zones.length === 0) {
      return NextResponse.json({ error: "No hay zonas configuradas" }, { status: 400 });
    }

    // Borrar partidos previos de zona pendientes
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("stage", "zone")
      .eq("status", "pending");

    let matchNumber = 1;
    const allMatchesToInsert: {
      tournament_id: string;
      zone_id: string;
      stage: string;
      round: string;
      match_number: number;
      couple1_id: string;
      couple2_id: string;
      pair1_id: string;
      pair2_id: string;
      status: string;
    }[] = [];

    for (const zone of zones) {
      // Buscar parejas asignadas
      let assignedCoupleIds: string[] = [];
      const { data: zc } = await supabase
        .from("zone_couples")
        .select("couple_id")
        .eq("zone_id", zone.id);

      if (zc && zc.length > 0) {
        assignedCoupleIds = zc.map((item) => item.couple_id);
      } else {
        const { data: zonePairs } = await supabase
          .from("couples")
          .select("id")
          .eq("zone_id", zone.id);
        if (zonePairs) assignedCoupleIds = zonePairs.map((p) => p.id);
      }

      if (assignedCoupleIds.length < 2) continue;

      const roundRobin = generateRoundRobinPairs(assignedCoupleIds);

      for (const rr of roundRobin) {
        allMatchesToInsert.push({
          tournament_id: tournamentId,
          zone_id: zone.id,
          stage: "zone",
          round: "zones",
          match_number: matchNumber++,
          couple1_id: rr.couple1Id,
          couple2_id: rr.couple2Id,
          pair1_id: rr.couple1Id,
          pair2_id: rr.couple2Id,
          status: "pending",
        });
      }
    }

    if (allMatchesToInsert.length > 0) {
      const { error: matchInsertError } = await supabase
        .from("matches")
        .insert(allMatchesToInsert);

      if (matchInsertError) {
        return NextResponse.json({ error: matchInsertError.message }, { status: 500 });
      }
    }

    // Actualizar estado del torneo a 'zones'
    await supabase
      .from("tournaments")
      .update({ status: "zones", updated_at: new Date().toISOString() })
      .eq("id", tournamentId);

    return NextResponse.json({
      success: true,
      matchesCreated: allMatchesToInsert.length,
    });
  }

  // ==========================================================================
  // ACCIÓN 3: SORTEO AUTOMÁTICO DE ZONAS (Default)
  // ==========================================================================
  const zoneSize = tournament.zone_size || 4; // Zonas de 3 o 4 parejas según admin
  let numZones = tournament.num_zones || Math.ceil(couples.length / zoneSize);
  if (numZones < 1) numZones = 1;

  // Eliminar zonas anteriores y sus asignaciones si existían
  const { data: existingZones } = await supabase
    .from("zones")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (existingZones && existingZones.length > 0) {
    const existingIds = existingZones.map((z) => z.id);
    await supabase.from("zone_couples").delete().in("zone_id", existingIds);
    await supabase.from("zones").delete().eq("tournament_id", tournamentId);
  }

  // 1. Crear las zonas correspondientes (Zona A, Zona B, Zona C...)
  const zonesToCreate = [];
  for (let i = 0; i < numZones; i++) {
    zonesToCreate.push({
      tournament_id: tournamentId,
      name: `Zona ${String.fromCharCode(65 + i)}`,
      zone_number: i + 1,
    });
  }

  const { data: createdZones, error: zoneError } = await supabase
    .from("zones")
    .insert(zonesToCreate)
    .select();

  if (zoneError || !createdZones) {
    return NextResponse.json({ error: zoneError?.message || "Error al crear zonas" }, { status: 500 });
  }

  // 2. Mezclar aleatoriamente las parejas (Sorteo)
  const shuffledPairs = shuffleArray(couples);

  // 3. Distribuir parejas equitativamente entre las zonas
  const zoneCouplesToInsert = [];
  for (let i = 0; i < shuffledPairs.length; i++) {
    const targetZoneIndex = i % numZones;
    const assignedZone = createdZones[targetZoneIndex];

    zoneCouplesToInsert.push({
      zone_id: assignedZone.id,
      couple_id: shuffledPairs[i].id,
    });

    // Sincronizar zone_id en la entidad de pareja
    await supabase
      .from("couples")
      .update({ zone_id: assignedZone.id })
      .eq("id", shuffledPairs[i].id);

    try {
      await supabase
        .from("pairs")
        .update({ zone_id: assignedZone.id })
        .eq("id", shuffledPairs[i].id);
    } catch {
      // Ignorar si tabla opcional no existe
    }
  }

  const { error: zcInsertError } = await supabase
    .from("zone_couples")
    .insert(zoneCouplesToInsert);

  if (zcInsertError) {
    return NextResponse.json({ error: zcInsertError.message }, { status: 500 });
  }

  // 4. Generar automáticamente los partidos round-robin (todos contra todos)
  let matchNumber = 1;
  const initialMatches = [];

  for (const zone of createdZones) {
    const zoneCoupleIds = zoneCouplesToInsert
      .filter((zc) => zc.zone_id === zone.id)
      .map((zc) => zc.couple_id);

    const roundRobin = generateRoundRobinPairs(zoneCoupleIds);
    for (const rr of roundRobin) {
      initialMatches.push({
        tournament_id: tournamentId,
        zone_id: zone.id,
        stage: "zone",
        round: "zones",
        match_number: matchNumber++,
        couple1_id: rr.couple1Id,
        couple2_id: rr.couple2Id,
        pair1_id: rr.couple1Id,
        pair2_id: rr.couple2Id,
        status: "pending",
      });
    }
  }

  if (initialMatches.length > 0) {
    await supabase.from("matches").insert(initialMatches);
  }

  // Actualizar estado del torneo a 'zones'
  await supabase
    .from("tournaments")
    .update({ status: "zones", updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  return NextResponse.json({
    success: true,
    message: "Zonas y fixture sorteados exitosamente",
    zones: createdZones,
    assignedCouples: zoneCouplesToInsert.length,
    matchesCreated: initialMatches.length,
  });
}
