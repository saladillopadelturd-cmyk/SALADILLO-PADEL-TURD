import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient, verifyIsAdmin } from "@/lib/supabase/admin";
import { getPlayerPhotosMap, enrichPlayerPhoto } from "@/lib/tournament/player-photos";

export const dynamic = "force-dynamic";

async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch {
    return await createServerClient();
  }
}

/**
 * DELETE /api/players?id=xxx
 * Elimina a un jugador del padrón del circuito.
 * REQUISITO DE SEGURIDAD: Solo un administrador puede eliminar jugadores.
 */
export async function DELETE(request: Request) {
  try {
    // 1. Verificación de permisos de administrador
    const { isAdmin } = await verifyIsAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Acceso denegado: solo un administrador puede eliminar jugadores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // No body provided
      }
    }

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        { error: "Se requiere un ID de jugador válido para eliminarlo." },
        { status: 400 }
      );
    }

    const playerId = id.trim();
    const supabase = await getSupabaseClient();

    // 2. Obtener datos del jugador para el mensaje de confirmación
    const { data: player } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("id", playerId)
      .maybeSingle();

    // 3. Limpiar relaciones dependientes con restricción estricta de clave foránea (couples)
    try {
      await supabase
        .from("couples")
        .delete()
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
    } catch (couplesErr) {
      console.warn("Aviso al limpiar parejas del jugador:", couplesErr);
    }

    // 4. Limpiar rankings asociados
    try {
      await supabase
        .from("rankings")
        .delete()
        .or(`player_id.eq.${playerId},player1_id.eq.${playerId},player2_id.eq.${playerId}`);
    } catch (rankErr) {
      console.warn("Aviso al limpiar rankings del jugador:", rankErr);
    }

    // 5. Eliminar jugador de la tabla players
    const { data: deletedRows, error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId)
      .select();

    if (deleteError) {
      console.error("Error al eliminar jugador:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Error al eliminar el jugador de la base de datos." },
        { status: 500 }
      );
    }

    const fullName = player ? `${player.first_name} ${player.last_name}` : playerId;

    return NextResponse.json({
      success: true,
      message: `Jugador "${fullName}" eliminado correctamente.`,
      id: playerId,
      deleted: deletedRows?.[0] || { id: playerId, name: fullName },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    console.error("Error en DELETE /api/players:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/players
 * Lista los jugadores del padrón enriquecidos con su fotografía de perfil oficial.
 */
export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const [{ data, error }, photosMap] = await Promise.all([
      supabase.from("players").select("*").order("created_at", { ascending: false }),
      getPlayerPhotosMap(),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enrichedPlayers = (data || []).map((p) => enrichPlayerPhoto(p, photosMap));

    return NextResponse.json({ players: enrichedPlayers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
