/**
 * Utilidad centralizada para mapeo, resolución y persistencia de localidades de jugadores en SPT.
 * Soporta persistencia nativa en base de datos y respaldo persistente en Supabase Storage (bucket 'flyers')
 * para garantizar compatibilidad inmediata y sincronización entre dispositivos.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrediohisjcjykaranzx.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let cachedLocationsMap: Map<string, string> | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

/**
 * Obtiene un mapa de localidades (Map<playerId | email, localidad>) desde Supabase Storage.
 */
export async function getPlayerLocationsMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedLocationsMap && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedLocationsMap;
  }

  const map = new Map<string, string>();

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/flyers/player_locations.json?t=${now}`, {
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data === "object" && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === "string" && val.trim()) {
            map.set(key, val.trim());
          }
        }
      }
    }
  } catch (err) {
    console.warn("Aviso al consultar mapa de localidades en Storage:", err);
  }

  cachedLocationsMap = map;
  lastCacheTime = now;
  return map;
}

/**
 * Guarda o actualiza la localidad de un jugador en Supabase Storage.
 */
export async function savePlayerLocation(
  playerId: string,
  localidad: string,
  email?: string | null
): Promise<void> {
  const cleanLoc = (localidad || "").trim();
  if (!playerId && !email) return;

  try {
    const map = await getPlayerLocationsMap();
    if (cleanLoc) {
      if (playerId) map.set(playerId, cleanLoc);
      if (email) map.set(email.trim().toLowerCase(), cleanLoc);
    } else {
      if (playerId) map.delete(playerId);
      if (email) map.delete(email.trim().toLowerCase());
    }

    cachedLocationsMap = map;
    lastCacheTime = Date.now();

    const obj: Record<string, string> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }

    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "x-upsert": "true",
    };

    await fetch(`${SUPABASE_URL}/storage/v1/object/flyers/player_locations.json`, {
      method: "POST",
      headers,
      body: JSON.stringify(obj),
      signal: AbortSignal.timeout(3500),
    });
  } catch (err) {
    console.warn("Aviso al guardar localidad en Storage:", err);
  }
}

/**
 * Enriquecer un jugador con su localidad resuelta si no la tiene asignada en la fila
 */
export function enrichPlayerLocation<
  T extends { id?: string; email?: string | null; localidad?: string | null; city?: string | null }
>(player: T, locationsMap: Map<string, string>): T {
  if (!player) return player;
  const loc =
    player.localidad ||
    player.city ||
    (player.id ? locationsMap.get(player.id) : null) ||
    (player.email ? locationsMap.get(player.email.trim().toLowerCase()) : null) ||
    "Saladillo";

  return {
    ...player,
    localidad: loc,
    city: loc,
  };
}
