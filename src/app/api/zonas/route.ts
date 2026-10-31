import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateOptimalZones, generateZoneMatches, buildCustomZonesConfig } from "@/lib/tournament/zones";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Genera los cruces de zona aplicando la regla oficial SPT:
 * - Para zona de 4 parejas: Pareja 1 vs Pareja 4, Pareja 2 vs Pareja 3, y luego Ganador vs Ganador, Perdedor vs Perdedor.
 * - Para zona de 3 parejas: Round-Robin todos contra todos.
 */
function generateRoundRobinPairs(coupleIds: string[]): { couple1Id: string | null; couple2Id: string | null }[] {
  return generateZoneMatches(coupleIds);
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
  const {
    tournamentId,
    action = "shuffle",
    assignments,
    numZones: reqNumZones,
    zoneSize: reqZoneSize,
  } = body;

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
  // ACCIÓN 0: ELIMINAR ZONAS QUE NO TIENEN PAREJAS ASIGNADAS
  // ==========================================================================
  if (action === "delete_empty_zones") {
    // 1. Obtener todas las zonas de este torneo
    const { data: tourZones, error: tzErr } = await supabase
      .from("zones")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("zone_number", { ascending: true });

    if (tzErr) {
      return NextResponse.json({ error: tzErr.message }, { status: 500 });
    }

    if (!tourZones || tourZones.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay zonas configuradas en este torneo.",
        deletedCount: 0,
        remainingCount: 0,
      });
    }

    const tourZoneIds = tourZones.map((z) => z.id);

    // Obtener parejas asignadas en zone_couples
    const { data: zcData } = await supabase
      .from("zone_couples")
      .select("zone_id, couple_id")
      .in("zone_id", tourZoneIds);

    // Obtener parejas que apunten a zone_id en couples
    const { data: cData } = await supabase
      .from("couples")
      .select("id, zone_id")
      .eq("tournament_id", tournamentId)
      .in("zone_id", tourZoneIds);

    // Identificar zonas sin ninguna pareja asignada
    const emptyZones = tourZones.filter((z) => {
      const inZC = zcData?.some((zc) => zc.zone_id === z.id);
      const inC = cData?.some((c) => c.zone_id === z.id);
      return !inZC && !inC;
    });

    if (emptyZones.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay zonas vacías en este torneo.",
        deletedCount: 0,
        remainingCount: tourZones.length,
      });
    }

    const emptyZoneIds = emptyZones.map((z) => z.id);

    // Borrar partidos y asignaciones de esas zonas vacías
    await supabase.from("matches").delete().in("zone_id", emptyZoneIds);
    await supabase.from("zone_couples").delete().in("zone_id", emptyZoneIds);
    const { error: delErr } = await supabase.from("zones").delete().in("id", emptyZoneIds);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Renumerar las zonas restantes correlativamente (Zona A, Zona B...)
    const remainingZones = tourZones.filter((z) => !emptyZoneIds.includes(z.id));
    for (let i = 0; i < remainingZones.length; i++) {
      const z = remainingZones[i];
      const newName = `Zona ${String.fromCharCode(65 + i)}`;
      const newNumber = i + 1;
      await supabase
        .from("zones")
        .update({ name: newName, zone_number: newNumber })
        .eq("id", z.id);
    }

    // Actualizar num_zones en el torneo
    await supabase
      .from("tournaments")
      .update({ num_zones: remainingZones.length })
      .eq("id", tournamentId);

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${emptyZones.length} ${
        emptyZones.length === 1 ? "zona vacía" : "zonas vacías"
      } sin parejas.`,
      deletedCount: emptyZones.length,
      remainingCount: remainingZones.length,
    });
  }

  // ==========================================================================
  // ACCIÓN 1: REORDENAMIENTO / EDICIÓN MANUAL DE PAREJAS EN ZONAS
  // ==========================================================================
  if (action === "manual" && Array.isArray(assignments)) {
    type Assignment = { zoneId: string; coupleId: string };
    const validAssignments = assignments as Assignment[];

    // 1. Obtener todas las zonas de este torneo
    const { data: tourZones } = await supabase
      .from("zones")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("zone_number", { ascending: true });

    const tourZoneIds = tourZones ? tourZones.map((z) => z.id) : [];

    // Separar zonas que tienen parejas asignadas vs zonas que quedan sin parejas (vacías)
    type TourZone = NonNullable<typeof tourZones>[number];
    const activeTourZones: { zone: TourZone; count: number }[] = [];
    const emptyTourZones: TourZone[] = [];

    for (const zone of tourZones || []) {
      const count = validAssignments.filter((a) => a.zoneId === zone.id).length;
      if (count === 0) {
        emptyTourZones.push(zone);
      } else {
        activeTourZones.push({ zone, count });
      }
    }

    if (activeTourZones.length === 0) {
      return NextResponse.json(
        { error: "No se puede conformar el torneo: todas las zonas están vacías. Asigna al menos 2 parejas por zona." },
        { status: 400 }
      );
    }

    // Validar regla estricta SPT: Ninguna zona activa puede tener solo 1 pareja
    for (const { zone, count } of activeTourZones) {
      if (count === 1) {
        return NextResponse.json(
          { error: `No se puede conformar el torneo: la ${zone.name} tiene una sola pareja. Nunca debe haber zonas con una sola pareja (mínimo 2 parejas por zona).` },
          { status: 400 }
        );
      }
    }

    // ELIMINAR ZONAS QUE NO TIENEN PAREJAS
    if (emptyTourZones.length > 0) {
      const emptyIds = emptyTourZones.map((z) => z.id);
      await supabase.from("matches").delete().in("zone_id", emptyIds);
      await supabase.from("zone_couples").delete().in("zone_id", emptyIds);
      await supabase.from("zones").delete().in("id", emptyIds);
    }

    // Renumerar las zonas activas restantes correlativamente (Zona A, Zona B, Zona C...)
    for (let i = 0; i < activeTourZones.length; i++) {
      const { zone } = activeTourZones[i];
      const newName = `Zona ${String.fromCharCode(65 + i)}`;
      const newNumber = i + 1;
      await supabase
        .from("zones")
        .update({ name: newName, zone_number: newNumber })
        .eq("id", zone.id);
      zone.name = newName;
      zone.zone_number = newNumber;
    }

    // Actualizar num_zones en el torneo
    await supabase
      .from("tournaments")
      .update({ num_zones: activeTourZones.length })
      .eq("id", tournamentId);

    // 2. Limpiar asignaciones previas en zone_couples para las zonas de este torneo
    if (tourZoneIds.length > 0) {
      await supabase.from("zone_couples").delete().in("zone_id", tourZoneIds);
    }

    // 3. Insertar nuevas asignaciones válidas (solo para zonas activas)
    const activeZoneIds = new Set(activeTourZones.map((az) => az.zone.id));
    const finalAssignments = validAssignments.filter((a) => activeZoneIds.has(a.zoneId));

    const newZoneCouples = finalAssignments.map((a) => ({
      zone_id: a.zoneId,
      couple_id: a.coupleId,
    }));

    if (newZoneCouples.length > 0) {
      const { error: insertError } = await supabase
        .from("zone_couples")
        .insert(newZoneCouples);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // 4. Sincronizar columna zone_id en couples
    await supabase
      .from("couples")
      .update({ zone_id: null })
      .eq("tournament_id", tournamentId);

    for (const a of finalAssignments) {
      await supabase
        .from("couples")
        .update({ zone_id: a.zoneId })
        .eq("id", a.coupleId);

      try {
        await supabase
          .from("pairs")
          .update({ zone_id: a.zoneId })
          .eq("id", a.coupleId);
      } catch {
        // Ignorar si tabla opcional no existe
      }
    }

    // 5. Regenerar automáticamente los partidos de zona para reflejar la nueva conformación
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("stage", "zone");

    let matchNumber = 1;
    const matchesToInsert: {
      tournament_id: string;
      zone_id: string;
      stage: string;
      match_number: number;
      couple1_id: string | null;
      couple2_id: string | null;
      status: string;
    }[] = [];

    for (const { zone } of activeTourZones) {
      const zoneCouplesList = finalAssignments
        .filter((a) => a.zoneId === zone.id)
        .map((a) => a.coupleId);

      if (zoneCouplesList.length >= 2) {
        const rr = generateRoundRobinPairs(zoneCouplesList);
        for (const pair of rr) {
          matchesToInsert.push({
            tournament_id: tournamentId,
            zone_id: zone.id,
            stage: "zone",
            match_number: matchNumber++,
            couple1_id: pair.couple1Id,
            couple2_id: pair.couple2Id,
            status: "pending",
          });
        }
      }
    }

    if (matchesToInsert.length > 0) {
      await supabase.from("matches").insert(matchesToInsert);
    }

    return NextResponse.json({
      success: true,
      message: emptyTourZones.length > 0
        ? `Conformación guardada con éxito. Se eliminaron ${emptyTourZones.length} ${
            emptyTourZones.length === 1 ? "zona vacía" : "zonas vacías"
          }.`
        : "Conformación de zonas guardada con éxito",
      assignedCount: finalAssignments.length,
      deletedEmptyZonesCount: emptyTourZones.length,
      activeZonesCount: activeTourZones.length,
      matchesCreated: matchesToInsert.length,
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

    // Borrar partidos previos de zona
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("stage", "zone");

    let matchNumber = 1;
    const allMatchesToInsert: {
      tournament_id: string;
      zone_id: string;
      stage: string;
      match_number: number;
      couple1_id: string | null;
      couple2_id: string | null;
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
          match_number: matchNumber++,
          couple1_id: rr.couple1Id,
          couple2_id: rr.couple2Id,
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
  // ACCIÓN 3: CREACIÓN / CONFIGURACIÓN DE ESTRUCTURA DE ZONAS (VACÍAS)
  // Las zonas siempre se confeccionan MANUALMENTE.
  // Permite combinar X cantidad de zonas con A parejas e Y cantidad de zonas con B parejas.
  // ==========================================================================
  let customZonesToBuild: { name: string; zoneNumber: number; size: number }[] = [];
  let zoneSummary = "";

  if (body.group1 || body.group2) {
    const config = buildCustomZonesConfig(
      body.group1 || { numZones: 0, zoneSize: 4 },
      body.group2 || { numZones: 0, zoneSize: 3 }
    );
    customZonesToBuild = config.zones;
    zoneSummary = config.summary;
  } else if (Array.isArray(body.zonesConfig) && body.zonesConfig.length > 0) {
    customZonesToBuild = body.zonesConfig.map((z: { name?: string; size?: number }, idx: number) => ({
      name: z.name || `Zona ${String.fromCharCode(65 + idx)}`,
      zoneNumber: idx + 1,
      size: z.size || 4,
    }));
    zoneSummary = `${customZonesToBuild.length} zonas configuradas`;
  } else {
    // Fallback con numZones y zoneSize
    const targetZoneSize = reqZoneSize
      ? Number(reqZoneSize)
      : (tournament.zone_size ? Number(tournament.zone_size) : 4);
    const targetNumZones = reqNumZones
      ? Number(reqNumZones)
      : (tournament.num_zones ? Number(tournament.num_zones) : 2);

    const config = buildCustomZonesConfig(
      { numZones: targetNumZones, zoneSize: targetZoneSize },
      { numZones: 0, zoneSize: 3 }
    );
    customZonesToBuild = config.zones;
    zoneSummary = config.summary;
  }

  if (customZonesToBuild.length === 0) {
    return NextResponse.json(
      { error: "Debes configurar al menos 1 zona para el torneo" },
      { status: 400 }
    );
  }

  const numZones = customZonesToBuild.length;
  const primaryZoneSize = customZonesToBuild[0]?.size || 4;

  // Actualizar configuración en el torneo
  await supabase
    .from("tournaments")
    .update({ num_zones: numZones, zone_size: primaryZoneSize, status: "zones", updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  // Eliminar zonas anteriores, partidos de zona y sus asignaciones si existían
  const { data: existingZones } = await supabase
    .from("zones")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (existingZones && existingZones.length > 0) {
    const existingIds = existingZones.map((z) => z.id);
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("stage", "zone");
    await supabase.from("zone_couples").delete().in("zone_id", existingIds);
    await supabase.from("zones").delete().eq("tournament_id", tournamentId);
  }

  // Resetear zone_id en couples
  await supabase
    .from("couples")
    .update({ zone_id: null })
    .eq("tournament_id", tournamentId);

  try {
    await supabase
      .from("pairs")
      .update({ zone_id: null })
      .eq("tournament_id", tournamentId);
  } catch {
    // Ignorar si tabla opcional no existe
  }

  // Crear las nuevas zonas vacías (Zona A, Zona B, Zona C...)
  const zonesToCreate = customZonesToBuild.map((z) => ({
    tournament_id: tournamentId,
    name: z.name,
    zone_number: z.zoneNumber,
  }));

  const { data: createdZones, error: zoneError } = await supabase
    .from("zones")
    .insert(zonesToCreate)
    .select();

  if (zoneError || !createdZones) {
    return NextResponse.json({ error: zoneError?.message || "Error al crear zonas" }, { status: 500 });
  }

  // Mapa de cupos para cada zona creada (zoneId -> size)
  const zoneSizesMap: Record<string, number> = {};
  createdZones.forEach((cz, idx) => {
    zoneSizesMap[cz.id] = customZonesToBuild[idx]?.size || 4;
  });

  return NextResponse.json({
    success: true,
    message: `Estructura de zonas creada exitosamente (${zoneSummary}). Las zonas están listas para su confección manual.`,
    zones: createdZones,
    zoneSizes: zoneSizesMap,
    summary: zoneSummary,
    assignedCouples: 0,
    matchesCreated: 0,
  });
}
