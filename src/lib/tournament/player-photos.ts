/**
 * Utilidad centralizada para mapeo y resolución de fotos de perfil de jugadores en SPT.
 * Consulta el almacenamiento de Supabase Storage (bucket 'flyers' / 'players')
 * y mapea las fotos por ID de jugador de forma dinámica con caché en memoria.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrediohisjcjykaranzx.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let cachedPhotoMap: Map<string, string> | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Obtiene un mapa (Map<playerId, photoPublicUrl>) consultando los buckets de almacenamiento.
 */
export async function getPlayerPhotosMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedPhotoMap && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedPhotoMap;
  }

  const map = new Map<string, string>();

  try {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    };

    // Consultar bucket 'flyers' donde se guardan las fotos de perfil de los jugadores
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/flyers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix: "", limit: 300 }),
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files: any[] = await res.json();
      const playerFiles = (files || []).filter((f) => f.name && f.name.startsWith("player_"));

      // Ordenar por fecha descendente para tomar siempre la versión más reciente subida
      playerFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      playerFiles.forEach((file) => {
        // Formato habitual: player_<uuid>_<timestamp>.jpg
        const parts = file.name.split("_");
        if (parts.length >= 2) {
          const possibleId = parts[1];
          if (possibleId && possibleId !== "new" && !map.has(possibleId)) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/flyers/${file.name}`;
            map.set(possibleId, publicUrl);
          }
        }
      });
    }
  } catch (err) {
    console.warn("Aviso al consultar mapa de fotos de jugadores en Storage:", err);
  }

  cachedPhotoMap = map;
  lastCacheTime = now;
  return map;
}

/**
 * Enriquecer un jugador o lista de jugadores con su photo_url resuelta de Storage si no la tiene
 */
export function enrichPlayerPhoto<T extends { id?: string; photo_url?: string | null; avatar_url?: string | null }>(
  player: T,
  photosMap: Map<string, string>
): T {
  if (!player) return player;
  const photo = player.photo_url || player.avatar_url || (player.id ? photosMap.get(player.id) : null) || null;
  return {
    ...player,
    photo_url: photo,
    avatar_url: photo,
  };
}
