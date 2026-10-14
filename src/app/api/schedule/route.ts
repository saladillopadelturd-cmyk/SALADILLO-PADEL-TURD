import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoScheduleMatches } from "@/lib/tournament/scheduler";
import type { Match } from "@/types/tournament";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tournamentId,
      courtCount = 2,
      courtNames,
      matchDurationMinutes = 40,
      startDate,
      startTime = "09:00",
      breakBetweenMinutes = 0,
      onlyUnscheduled = false,
      stageFilter = "all",
    } = body;

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId es requerido" }, { status: 400 });
    }

    if (!courtCount || courtCount < 1) {
      return NextResponse.json({ error: "Se requiere al menos 1 cancha disponible" }, { status: 400 });
    }

    if (!matchDurationMinutes || matchDurationMinutes < 10) {
      return NextResponse.json({ error: "El tiempo estimado por partido debe ser de al menos 10 minutos" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Obtener torneo para validar fecha por defecto si no se envió
    const { data: tournament, error: tourError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .maybeSingle();

    if (tourError || !tournament) {
      return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
    }

    const finalStartDate = startDate || tournament.date || new Date().toISOString().split("T")[0];

    // 2. Obtener partidos del torneo
    const { data: rawMatches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("match_number", { ascending: true, nullsFirst: false });

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    if (!rawMatches || rawMatches.length === 0) {
      return NextResponse.json({
        error: "No hay partidos generados en este torneo aún. Primero debes generar las zonas o el fixture.",
      }, { status: 400 });
    }

    // 3. Ejecutar algoritmo de programación automática
    const scheduleResult = autoScheduleMatches(rawMatches as Match[], {
      courtCount: Number(courtCount),
      courtNames: Array.isArray(courtNames) ? courtNames : undefined,
      matchDurationMinutes: Number(matchDurationMinutes),
      startDate: finalStartDate,
      startTime: startTime || "09:00",
      breakBetweenMinutes: Number(breakBetweenMinutes || 0),
      onlyUnscheduled: Boolean(onlyUnscheduled),
      stageFilter,
    });

    if (scheduleResult.assignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No se encontraron partidos pendientes según los filtros seleccionados.",
        result: scheduleResult,
      });
    }

    // 4. Actualizar los partidos asignados en la base de datos Supabase
    const nowIso = new Date().toISOString();
    for (const assignment of scheduleResult.assignments) {
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          court_name: assignment.courtName,
          scheduled_time: assignment.scheduledTime,
          updated_at: nowIso,
        })
        .eq("id", assignment.matchId);

      if (updateError) {
        console.error(`Error actualizando partido ${assignment.matchId}:`, updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se programaron exitosamente ${scheduleResult.assignments.length} partidos.`,
      result: scheduleResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno al programar partidos";
    console.error("Error en /api/schedule:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
