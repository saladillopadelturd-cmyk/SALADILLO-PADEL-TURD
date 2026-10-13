import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Función auxiliar para obtener cliente con privilegios admin o cliente de servidor
async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch {
    return await createServerClient();
  }
}

// Función auxiliar para computar rankings individuales y por parejas
async function computePlayerStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  playerId: string,
  playerCategory: string
) {
  const stats = {
    points: 0,
    tournamentsPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    winRate: 0,
    individualRanking: {
      category: playerCategory || "5ta",
      points: 0,
      position: 0,
      tournamentsPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      winRate: 0,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coupleRankings: [] as Array<{
      id: string;
      partnerName: string;
      partnerPhotoUrl?: string | null;
      category: string;
      points: number;
      position: number;
      tournamentsPlayed: number;
      matchesWon: number;
      matchesLost: number;
      winRate: number;
    }>,
  };

  try {
    // 1. Obtener todos los rankings ordenados por puntos y partidos ganados
    const { data: allRankings } = await supabase
      .from("rankings")
      .select("*")
      .order("points", { ascending: false })
      .order("matches_won", { ascending: false });

    // 2. Traer todos los jugadores para resolver nombres y fotos de parejas
    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, first_name, last_name, photo_url, avatar_url");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playersMap = new Map((allPlayers || []).map((p: any) => [p.id, p]));

    if (allRankings && allRankings.length > 0) {
      // --- Ranking Individual ---
      const myIndRankings = allRankings.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.ranking_type === "individual" && r.player_id === playerId
      );

      const targetCategory = myIndRankings[0]?.category || playerCategory || "5ta";
      const categoryIndRankings = allRankings.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.ranking_type === "individual" && r.category === targetCategory
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const indPos = categoryIndRankings.findIndex((r: any) => r.player_id === playerId) + 1;
      const bestInd = myIndRankings[0];

      if (bestInd) {
        const totalInd = (bestInd.matches_won || 0) + (bestInd.matches_lost || 0);
        stats.individualRanking = {
          category: targetCategory,
          points: bestInd.points || 0,
          position: indPos > 0 ? indPos : 1,
          tournamentsPlayed: bestInd.tournaments_played || 0,
          matchesWon: bestInd.matches_won || 0,
          matchesLost: bestInd.matches_lost || 0,
          winRate: totalInd > 0 ? Math.round(((bestInd.matches_won || 0) / totalInd) * 100) : 0,
        };
      } else {
        const totalInCat = categoryIndRankings.length;
        stats.individualRanking = {
          category: targetCategory,
          points: 0,
          position: totalInCat + 1,
          tournamentsPlayed: 0,
          matchesWon: 0,
          matchesLost: 0,
          winRate: 0,
        };
      }

      // --- Ranking por Parejas ---
      const myCoupleRankings = allRankings.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) =>
          r.ranking_type === "couple" &&
          (r.player1_id === playerId || r.player2_id === playerId)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats.coupleRankings = myCoupleRankings.map((cr: any) => {
        const partnerId = cr.player1_id === playerId ? cr.player2_id : cr.player1_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const partner: any = partnerId ? playersMap.get(partnerId) : null;
        const partnerName = partner
          ? `${partner.first_name} ${partner.last_name}`
          : "Compañero/a";
        const partnerPhotoUrl = partner?.photo_url || partner?.avatar_url || null;

        const coupleCat = cr.category || targetCategory;
        const categoryCouples = allRankings.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r: any) => r.ranking_type === "couple" && r.category === coupleCat
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cPos = categoryCouples.findIndex((r: any) => r.id === cr.id) + 1;
        const cTotal = (cr.matches_won || 0) + (cr.matches_lost || 0);

        return {
          id: cr.id,
          partnerName,
          partnerPhotoUrl,
          category: coupleCat,
          points: cr.points || 0,
          position: cPos > 0 ? cPos : 1,
          tournamentsPlayed: cr.tournaments_played || 0,
          matchesWon: cr.matches_won || 0,
          matchesLost: cr.matches_lost || 0,
          winRate: cTotal > 0 ? Math.round(((cr.matches_won || 0) / cTotal) * 100) : 0,
        };
      });

      // Sumatorias globales
      let pts = 0;
      let tourns = 0;
      let won = 0;
      let lost = 0;
      for (const r of myIndRankings) {
        pts += r.points || 0;
        tourns += r.tournaments_played || 0;
        won += r.matches_won || 0;
        lost += r.matches_lost || 0;
      }

      // Si no tiene registros individuales pero sí por parejas, sumar de parejas
      if (pts === 0 && stats.coupleRankings.length > 0) {
        for (const cr of stats.coupleRankings) {
          pts += cr.points;
          tourns += cr.tournamentsPlayed;
          won += cr.matchesWon;
          lost += cr.matchesLost;
        }
      }

      const totalAll = won + lost;
      stats.points = pts;
      stats.tournamentsPlayed = tourns;
      stats.matchesWon = won;
      stats.matchesLost = lost;
      stats.winRate = totalAll > 0 ? Math.round((won / totalAll) * 100) : 0;
    }
  } catch (err) {
    console.warn("Aviso al computar estadísticas de rankings:", err);
  }

  return stats;
}

// GET /api/players/identity?email=usuario@correo.com
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");

    if (!emailParam || !emailParam.trim()) {
      return NextResponse.json(
        { success: false, identified: false, error: "No se proporcionó correo electrónico" },
        { status: 400 }
      );
    }

    const email = emailParam.trim().toLowerCase();
    const supabase = await getSupabaseClient();

    // 1. Buscar jugador por correo electrónico (coincidencia exacta case-insensitive)
    const { data: players, error } = await supabase
      .from("players")
      .select("*")
      .ilike("email", email);

    if (error) {
      console.error("Error buscando jugador por email:", error);
      return NextResponse.json(
        { success: false, identified: false, error: error.message },
        { status: 500 }
      );
    }

    if (!players || players.length === 0) {
      return NextResponse.json({
        success: true,
        identified: false,
        player: null,
      });
    }

    const player = players[0];

    // 2. Obtener estadísticas deportivas completas (individual y por parejas)
    const stats = await computePlayerStats(supabase, player.id, player.category || "5ta");

    return NextResponse.json({
      success: true,
      identified: true,
      player,
      stats,
    });
  } catch (err: unknown) {
    console.error("Error en GET /api/players/identity:", err);
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ success: false, identified: false, error: msg }, { status: 500 });
  }
}

// POST /api/players/identity - Crea o actualiza la ficha del jugador
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      player_id,
      first_name,
      last_name,
      email,
      phone,
      gender = "Masculino",
      category = "5ta",
      photo_url,
      is_observed,
    } = body;

    if (!first_name || !first_name.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!last_name || !last_name.trim()) {
      return NextResponse.json(
        { success: false, error: "El apellido es obligatorio" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "El correo electrónico es obligatorio (sirve como nombre de usuario)" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = first_name.trim();
    const cleanLastName = last_name.trim();
    const cleanPhone = phone ? phone.trim() : null;

    const supabase = await getSupabaseClient();

    // Comprobar si hay un usuario autenticado y verificar si tiene rol de administrador
    let isAdmin = false;
    let currentUserId: string | null = null;
    let currentUserEmail: string | null = null;
    try {
      const serverAuthClient = await createServerClient();
      const {
        data: { user },
      } = await serverAuthClient.auth.getUser();
      if (user) {
        currentUserId = user.id;
        currentUserEmail = user.email ? user.email.toLowerCase() : null;
        const isRootAdmin = currentUserEmail === "matiasvidal11972@gmail.com";
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        isAdmin = isRootAdmin || prof?.role === "admin" || prof?.role === "super_admin";
      }
    } catch {
      // Ignorar si no hay sesión
    }

    // 1. Determinar el jugador existente a actualizar (por ID o por correo)
    let existingPlayer = null;

    if (player_id) {
      const { data: byId } = await supabase
        .from("players")
        .select("*")
        .eq("id", player_id)
        .maybeSingle();
      if (byId) existingPlayer = byId;
    }

    if (!existingPlayer) {
      const { data: byEmail } = await supabase
        .from("players")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();
      if (byEmail) {
        existingPlayer = byEmail;
      }
    }

    // REGLA DE PERMISOS:
    // - El administrador puede editar la ficha de TODOS los jugadores.
    // - Los jugadores regulares NO pueden editar la ficha de otro jugador.
    if (existingPlayer && !isAdmin) {
      const isOwnerByEmail = currentUserEmail && currentUserEmail === existingPlayer.email?.toLowerCase();
      const isSelfById = player_id && player_id === existingPlayer.id;

      // Si no coincide ni por auth email ni por ID de su propio perfil previamente identificado
      if (!isOwnerByEmail && !isSelfById) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permisos para editar la ficha de otro jugador. Solo el administrador o el titular de la cuenta pueden modificarla.",
          },
          { status: 403 }
        );
      }
    }

    // Determinación del estado observado:
    // Solo el administrador tiene potestad para marcar o desmarcar a un jugador como observado
    let finalIsObserved = false;
    if (existingPlayer) {
      finalIsObserved = isAdmin && typeof is_observed === "boolean" ? is_observed : !!existingPlayer.is_observed;
    } else {
      finalIsObserved = isAdmin && typeof is_observed === "boolean" ? is_observed : false;
    }

    let finalPlayer = null;

    if (existingPlayer) {
      // Actualizar el jugador existente
      const updatePayload: Record<string, unknown> = {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        phone: cleanPhone,
        gender,
        category,
        is_observed: finalIsObserved,
      };

      // Solo el administrador puede modificar el correo registrado de un jugador
      if (isAdmin || !existingPlayer.email) {
        updatePayload.email = cleanEmail;
      }

      if (photo_url) {
        updatePayload.photo_url = photo_url;
      }

      if (currentUserId && !existingPlayer.user_id) {
        updatePayload.user_id = currentUserId;
      }

      const { data: updated, error: updateError } = await supabase
        .from("players")
        .update(updatePayload)
        .eq("id", existingPlayer.id)
        .select()
        .single();

      if (updateError) {
        // Fallback por si la base de datos remota no tiene aún ciertas columnas
        console.warn("Reintentando update con campos base:", updateError);
        const basePayload: Record<string, unknown> = {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          phone: cleanPhone,
        };
        const { data: fallbackUpdated, error: fallbackErr } = await supabase
          .from("players")
          .update(basePayload)
          .eq("id", existingPlayer.id)
          .select()
          .single();

        if (fallbackErr) throw fallbackErr;
        finalPlayer = {
          ...fallbackUpdated,
          gender,
          category,
          photo_url: photo_url || null,
          is_observed: finalIsObserved,
        };
      } else {
        finalPlayer = updated;
      }
    } else {
      // Insertar nuevo jugador
      const insertPayload: Record<string, unknown> = {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone,
        gender,
        category,
        photo_url: photo_url || null,
        is_observed: finalIsObserved,
      };

      if (currentUserId) {
        insertPayload.user_id = currentUserId;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("players")
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.warn("Reintentando insert con campos base:", insertError);
        const basePayload: Record<string, unknown> = {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          email: cleanEmail,
          phone: cleanPhone,
        };
        const { data: fallbackInserted, error: fallbackErr } = await supabase
          .from("players")
          .insert(basePayload)
          .select()
          .single();

        if (fallbackErr) throw fallbackErr;
        finalPlayer = {
          ...fallbackInserted,
          gender,
          category,
          photo_url: photo_url || null,
          is_observed: finalIsObserved,
        };
      } else {
        finalPlayer = inserted;
      }
    }

    // Computar estadísticas actualizadas del jugador
    const stats = await computePlayerStats(supabase, finalPlayer.id, finalPlayer.category || category);

    return NextResponse.json({
      success: true,
      player: finalPlayer,
      stats,
      message: "Ficha de jugador guardada exitosamente",
    });
  } catch (err: unknown) {
    console.error("Error en POST /api/players/identity:", err);
    const msg = err instanceof Error ? err.message : "Error al procesar ficha de jugador";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
