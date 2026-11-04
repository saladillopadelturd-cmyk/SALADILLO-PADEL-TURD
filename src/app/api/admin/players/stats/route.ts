import { NextResponse } from "next/server";
import { verifyIsAdmin, createAdminClient } from "@/lib/supabase/admin";
import {
  getPlayerRankingOverridesMap,
  savePlayerRankingOverride,
} from "@/lib/tournament/player-ranking-overrides";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/players/stats?playerId=xxx
 * Obtiene el mapa de overrides de estadísticas de ranking (o las estadísticas de un jugador específico).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");

    const overridesMap = await getPlayerRankingOverridesMap();

    if (playerId) {
      const override = overridesMap.get(playerId) || null;
      return NextResponse.json({ success: true, override });
    }

    const obj: Record<string, unknown> = {};
    overridesMap.forEach((val, key) => {
      obj[key] = val;
    });

    return NextResponse.json({ success: true, overrides: obj });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al obtener estadísticas de jugadores";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/players/stats
 * Permite a los administradores modificar:
 * - Puntos de ranking
 * - Torneos jugados
 * - Partidos ganados
 * - Partidos perdidos
 * de cualquier jugador.
 */
export async function POST(request: Request) {
  try {
    // 1. Verificación obligatoria de privilegios de administrador
    const { isAdmin, email } = await verifyIsAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acceso denegado: solo los administradores pueden cambiar los puntos y estadísticas de ranking." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { playerId, points, tournamentsPlayed, matchesWon, matchesLost, category } = body || {};

    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      return NextResponse.json(
        { error: "Se requiere un ID de jugador válido." },
        { status: 400 }
      );
    }

    const cleanPlayerId = playerId.trim();
    const cleanPoints = Math.max(0, Math.round(Number(points) || 0));
    const cleanTournaments = Math.max(0, Math.round(Number(tournamentsPlayed) || 0));
    const cleanWon = Math.max(0, Math.round(Number(matchesWon) || 0));
    const cleanLost = Math.max(0, Math.round(Number(matchesLost) || 0));

    // 2. Si no viene categoría, consultar la categoría oficial del jugador
    let cleanCategory = typeof category === "string" ? category.trim() : undefined;
    if (!cleanCategory) {
      try {
        const adminSb = createAdminClient();
        const { data: p } = await adminSb
          .from("players")
          .select("category")
          .eq("id", cleanPlayerId)
          .maybeSingle();
        cleanCategory = p?.category || "5ta";
      } catch {
        cleanCategory = "5ta";
      }
    }

    // 3. Persistir en Storage y base de datos
    const saveResult = await savePlayerRankingOverride({
      playerId: cleanPlayerId,
      points: cleanPoints,
      tournamentsPlayed: cleanTournaments,
      matchesWon: cleanWon,
      matchesLost: cleanLost,
      category: cleanCategory,
      updatedBy: email || "admin",
    });

    if (!saveResult.success) {
      return NextResponse.json(
        { error: saveResult.error || "No se pudo actualizar las estadísticas del jugador." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estadísticas de ranking del jugador actualizadas exitosamente.",
      stats: {
        playerId: cleanPlayerId,
        points: cleanPoints,
        tournamentsPlayed: cleanTournaments,
        matchesWon: cleanWon,
        matchesLost: cleanLost,
        category: cleanCategory,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
