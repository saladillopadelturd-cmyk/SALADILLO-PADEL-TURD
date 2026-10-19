import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch {
    return await createServerClient();
  }
}

/**
 * DELETE /api/torneos?id=xxx o DELETE /api/torneos con body { id: "xxx" }
 * Elimina un torneo y todos sus datos relacionados (zonas, parejas, partidos).
 */
export async function DELETE(request: Request) {
  try {
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
        { error: "Se requiere un ID de torneo válido para eliminarlo." },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    // 1. Obtener datos del torneo para mensaje y verificación
    const { data: tour } = await supabase
      .from("tournaments")
      .select("id, name")
      .eq("id", id.trim())
      .maybeSingle();

    // 2. Eliminar el torneo en Supabase (cascada elimina matches, zones, couples, zone_couples)
    const { data: deletedRows, error: deleteError } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id.trim())
      .select();

    if (deleteError) {
      console.error("Error al eliminar torneo de Supabase:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Error al eliminar el torneo en la base de datos." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Torneo "${tour?.name || id}" eliminado correctamente.`,
      id: id.trim(),
      deleted: deletedRows?.[0] || { id: id.trim(), name: tour?.name },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    console.error("Error en DELETE /api/torneos:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/torneos
 * Lista todos los torneos ordenados por fecha descendente.
 */
export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tournaments: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
