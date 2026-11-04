/**
 * Utilidad centralizada para persistencia, consulta y sobreescritura (manual overrides)
 * de puntos de ranking, torneos jugados, partidos ganados y partidos perdidos de cada jugador.
 *
 * Los administradores pueden modificar libremente estos valores para cualquier jugador.
 * Los datos se respaldan en Supabase Storage (bucket público 'flyers', archivo 'player_ranking_overrides.json')
 * y se aplican en la tabla 'rankings' para que los cálculos automáticos de torneos
 * nunca pisen ni sobreescriban los valores fijados por la administración.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://whukvsmocelmsrgyfftw.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export interface PlayerRankingOverride {
  playerId: string;
  points: number;
  tournamentsPlayed: number;
  matchesWon: number;
  matchesLost: number;
  category?: string;
  updatedAt?: string;
  updatedBy?: string;
}

let cachedOverridesMap: Map<string, PlayerRankingOverride> | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15 segundos

/**
 * Obtiene el mapa consolidado de overrides manuales de ranking (Map<playerId, PlayerRankingOverride>).
 */
export async function getPlayerRankingOverridesMap(): Promise<Map<string, PlayerRankingOverride>> {
  const now = Date.now();
  if (cachedOverridesMap && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedOverridesMap;
  }

  const map = new Map<string, PlayerRankingOverride>();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/public/flyers/player_ranking_overrides.json?t=${now}`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (typeof data === "object" && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === "object") {
            const row = val as Partial<PlayerRankingOverride>;
            map.set(key, {
              playerId: key,
              points: Math.max(0, Number(row.points) || 0),
              tournamentsPlayed: Math.max(0, Number(row.tournamentsPlayed) || 0),
              matchesWon: Math.max(0, Number(row.matchesWon) || 0),
              matchesLost: Math.max(0, Number(row.matchesLost) || 0),
              category: row.category || undefined,
              updatedAt: row.updatedAt || undefined,
              updatedBy: row.updatedBy || undefined,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Aviso al consultar mapa de overrides de rankings en Storage:", err);
  }

  cachedOverridesMap = map;
  lastCacheTime = now;
  return map;
}

/**
 * Guarda o actualiza los puntos de ranking, partidos ganados, perdidos y torneos de un jugador.
 */
export async function savePlayerRankingOverride(
  override: PlayerRankingOverride
): Promise<{ success: boolean; error?: string }> {
  if (!override.playerId) {
    return { success: false, error: "ID de jugador requerido" };
  }

  const cleanData: PlayerRankingOverride = {
    playerId: override.playerId,
    points: Math.max(0, Math.round(Number(override.points) || 0)),
    tournamentsPlayed: Math.max(0, Math.round(Number(override.tournamentsPlayed) || 0)),
    matchesWon: Math.max(0, Math.round(Number(override.matchesWon) || 0)),
    matchesLost: Math.max(0, Math.round(Number(override.matchesLost) || 0)),
    category: override.category?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    updatedBy: override.updatedBy || "admin",
  };

  try {
    const map = await getPlayerRankingOverridesMap();
    map.set(cleanData.playerId, cleanData);

    cachedOverridesMap = map;
    lastCacheTime = Date.now();

    const obj: Record<string, PlayerRankingOverride> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }

    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "x-upsert": "true",
    };

    // 1. Guardar en Supabase Storage
    await fetch(`${SUPABASE_URL}/storage/v1/object/flyers/player_ranking_overrides.json`, {
      method: "POST",
      headers,
      body: JSON.stringify(obj),
      signal: AbortSignal.timeout(4000),
    });

    // 2. Persistir en la tabla 'rankings' de Supabase
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();

      const cat = cleanData.category || "General";

      const { data: existing } = await adminClient
        .from("rankings")
        .select("id")
        .eq("ranking_type", "individual")
        .eq("player_id", cleanData.playerId)
        .maybeSingle();

      if (existing?.id) {
        await adminClient
          .from("rankings")
          .update({
            points: cleanData.points,
            tournaments_played: cleanData.tournamentsPlayed,
            matches_won: cleanData.matchesWon,
            matches_lost: cleanData.matchesLost,
            category: cat,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await adminClient.from("rankings").insert({
          ranking_type: "individual",
          player_id: cleanData.playerId,
          category: cat,
          points: cleanData.points,
          tournaments_played: cleanData.tournamentsPlayed,
          matches_won: cleanData.matchesWon,
          matches_lost: cleanData.matchesLost,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (dbErr) {
      console.warn("Aviso al persistir override en tabla rankings de Supabase:", dbErr);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error guardando override de ranking";
    console.error("Error en savePlayerRankingOverride:", msg);
    return { success: false, error: msg };
  }
}
