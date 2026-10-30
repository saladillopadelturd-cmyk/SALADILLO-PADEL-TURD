import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findNextPlayoffMatchSlot, propagatePlayoffWinners } from "@/lib/tournament/elimination";
import { propagateZoneMatches } from "@/lib/tournament/zones";
import type { Match } from "@/types/tournament";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      matchId,
      tournamentId,
      winnerCoupleId,
      scoreSet1,
      scoreSet2 = null,
      scoreSuperTb = null,
      reset = false,
    } = body;

    if (!matchId) {
      return NextResponse.json({ error: "matchId es requerido" }, { status: 400 });
    }

    const adminSb = createAdminClient();

    // 1. Obtener el partido actual
    const { data: currentMatch, error: matchError } = await adminSb
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !currentMatch) {
      return NextResponse.json(
        { error: "Partido no encontrado: " + (matchError?.message || "") },
        { status: 404 }
      );
    }

    const tourId = tournamentId || currentMatch.tournament_id;

    // CASO A: RESETEAR RESULTADO DEL PARTIDO
    if (reset) {
      const previousWinnerId = currentMatch.winner_couple_id;
      const { error: resetError } = await adminSb
        .from("matches")
        .update({
          score_set1: null,
          score_set2: null,
          score_super_tb: null,
          winner_couple_id: null,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 500 });
      }

      // Si era de playoff y tenía ganador previo, quitar de la ronda siguiente
      if (currentMatch.stage !== "zone" && previousWinnerId) {
        const { data: allMatches } = await adminSb
          .from("matches")
          .select("*")
          .eq("tournament_id", tourId);

        if (allMatches) {
          const nextSlot = findNextPlayoffMatchSlot(allMatches, currentMatch);
          if (nextSlot) {
            const targetMatch = allMatches.find((m) => m.id === nextSlot.targetMatchId);
            if (targetMatch && (targetMatch[nextSlot.slotField] === previousWinnerId || targetMatch.winner_couple_id === previousWinnerId)) {
              await adminSb
                .from("matches")
                .update({
                  [nextSlot.slotField]: null,
                  winner_couple_id: targetMatch.winner_couple_id === previousWinnerId ? null : targetMatch.winner_couple_id,
                  status: "pending",
                  score_set1: targetMatch.winner_couple_id === previousWinnerId ? null : targetMatch.score_set1,
                  score_set2: targetMatch.winner_couple_id === previousWinnerId ? null : targetMatch.score_set2,
                  score_super_tb: targetMatch.winner_couple_id === previousWinnerId ? null : targetMatch.score_super_tb,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", nextSlot.targetMatchId);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Resultado restablecido exitosamente a pendiente",
      });
    }

    // CASO B: GUARDAR RESULTADO Y AVANZAR GANADOR
    if (!winnerCoupleId) {
      return NextResponse.json(
        { error: "Debes indicar la pareja ganadora del partido." },
        { status: 400 }
      );
    }

    if (!scoreSet1 || !String(scoreSet1).trim()) {
      return NextResponse.json(
        { error: "Debes ingresar al menos el resultado del partido / Set 1." },
        { status: 400 }
      );
    }

    // Actualizar partido actual
    const matchUpdatePayload = {
      score_set1: String(scoreSet1).trim(),
      score_set2: scoreSet2 ? String(scoreSet2).trim() : null,
      score_super_tb: scoreSuperTb ? String(scoreSuperTb).trim() : null,
      winner_couple_id: winnerCoupleId,
      status: "completed",
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await adminSb
      .from("matches")
      .update(matchUpdatePayload)
      .eq("id", matchId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let advancedToNextStage = false;
    let nextSlotInfo: unknown = null;

    // Si es fase de playoff / eliminación directa: avanzar automáticamente al ganador a la siguiente ronda
    if (currentMatch.stage !== "zone") {
      const { data: allTourMatches } = await adminSb
        .from("matches")
        .select("*")
        .eq("tournament_id", tourId);

      if (allTourMatches && allTourMatches.length > 0) {
        // Encontrar slot del siguiente partido
        const nextSlot = findNextPlayoffMatchSlot(allTourMatches, currentMatch);
        if (nextSlot) {
          nextSlotInfo = nextSlot;
          const targetMatch = allTourMatches.find((m) => m.id === nextSlot.targetMatchId);
          const nextPayload: Record<string, unknown> = {
            [nextSlot.slotField]: winnerCoupleId,
            updated_at: new Date().toISOString(),
          };

          // Si se rectificó el ganador y el anterior figuraba como ganador de la siguiente ronda, resetear
          if (
            currentMatch.winner_couple_id &&
            currentMatch.winner_couple_id !== winnerCoupleId &&
            targetMatch &&
            targetMatch.winner_couple_id === currentMatch.winner_couple_id
          ) {
            nextPayload.winner_couple_id = null;
            nextPayload.status = "pending";
            nextPayload.score_set1 = null;
            nextPayload.score_set2 = null;
            nextPayload.score_super_tb = null;
          }

          const { error: nextErr } = await adminSb
            .from("matches")
            .update(nextPayload)
            .eq("id", nextSlot.targetMatchId);

          if (!nextErr) {
            advancedToNextStage = true;
          } else {
            console.error("Error avanzando ganador en matches:", nextErr);
          }
        }

        // Auto-propagar consistencia general de playoffs
        const { data: refreshedPlayoffMatches } = await adminSb
          .from("matches")
          .select("*")
          .eq("tournament_id", tourId)
          .neq("stage", "zone")
          .order("match_number", { ascending: true });

        if (refreshedPlayoffMatches && refreshedPlayoffMatches.length > 0) {
          const { updatesToPersist } = propagatePlayoffWinners(refreshedPlayoffMatches);
          for (const upd of updatesToPersist) {
            const p: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (upd.couple1_id !== undefined) p.couple1_id = upd.couple1_id;
            if (upd.couple2_id !== undefined) p.couple2_id = upd.couple2_id;
            await adminSb.from("matches").update(p).eq("id", upd.id);
          }
        }
      }
    }

    // Si es fase de zonas de 4 parejas: propagar Ganador vs Ganador y Perdedor vs Perdedor
    if (currentMatch.stage === "zone" && currentMatch.zone_id) {
      const { data: allZoneMatches } = await adminSb
        .from("matches")
        .select("*")
        .eq("tournament_id", tourId)
        .eq("stage", "zone");

      if (allZoneMatches) {
        const simulated = allZoneMatches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                score_set1: String(scoreSet1).trim(),
                score_set2: scoreSet2 ? String(scoreSet2).trim() : null,
                score_super_tb: scoreSuperTb ? String(scoreSuperTb).trim() : null,
                winner_couple_id: winnerCoupleId,
                status: "completed" as const,
              }
            : m
        );
        const { updatesToPersist } = propagateZoneMatches(simulated as Match[]);
        for (const upd of updatesToPersist) {
          const p: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (upd.couple1_id !== undefined) p.couple1_id = upd.couple1_id;
          if (upd.couple2_id !== undefined) p.couple2_id = upd.couple2_id;
          if (upd.resetScore) {
            p.winner_couple_id = null;
            p.status = "pending";
            p.score_set1 = null;
            p.score_set2 = null;
            p.score_super_tb = null;
          }
          await adminSb.from("matches").update(p).eq("id", upd.matchId);
        }
      }
    }

    // Auto-recalcular rankings oficiales de los jugadores
    try {
      const origin = request.headers.get("origin") || "http://localhost:3000";
      await fetch(`${origin}/api/rankings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tourId, recalculate: true }),
      }).catch((e) => console.warn("Aviso recalculo ranking:", e));
    } catch {}

    return NextResponse.json({
      success: true,
      message: advancedToNextStage
        ? "Resultado registrado: la pareja ganadora avanzó a la próxima instancia del cuadro."
        : "Resultado registrado exitosamente.",
      advancedToNextStage,
      nextSlot: nextSlotInfo,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    console.error("Error en /api/matches/score:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
