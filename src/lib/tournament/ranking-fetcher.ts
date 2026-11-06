import { createClient } from "@/lib/supabase/server";
import { formatPlayerFullName } from "@/lib/tournament/couples";
import { syncAllTournamentsRankings } from "@/lib/tournament/rankings";
import { getPlayerPhotosMap } from "@/lib/tournament/player-photos";
import { getPlayerLocationsMap } from "@/lib/tournament/player-locations";
import { getPlayerRankingOverridesMap } from "@/lib/tournament/player-ranking-overrides";

export interface IndividualRankingItem {
  id: string;
  playerId?: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: "Masculino" | "Femenino";
  photoUrl?: string | null;
  localidad?: string | null;
  category: string;
  tournaments: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
  isObserved?: boolean;
}

export const DEFAULT_CATEGORIES = ["8va", "7ma", "6ta", "5ta", "4ta", "3ra", "2da", "1ra"];

export async function fetchCategoryRankings({
  gender = "Caballeros",
  category = "8va",
}: {
  gender?: string;
  category?: string;
}) {
  const isDamas =
    gender.toLowerCase() === "damas" ||
    gender.toLowerCase() === "femenino" ||
    gender.toLowerCase() === "fem";
  const selectedGender: "Caballeros" | "Damas" = isDamas ? "Damas" : "Caballeros";
  const selectedDbGender: "Masculino" | "Femenino" = isDamas ? "Femenino" : "Masculino";

  const supabase = await createClient();

  // 1. Sincronizar rankings oficiales en tiempo real
  try {
    await syncAllTournamentsRankings(supabase);
  } catch (syncErr) {
    console.warn("Aviso en sincronización en vivo de rankings:", syncErr);
  }

  // 2. Traer jugadores, fotografías, localidades y overrides
  const [{ data: allPlayers }, photosMap, locationsMap, rankingOverridesMap] = await Promise.all([
    supabase.from("players").select("*"),
    getPlayerPhotosMap(),
    getPlayerLocationsMap(),
    getPlayerRankingOverridesMap(),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersMap = new Map((allPlayers || []).map((p: any) => [p.id, p]));

  // 3. Rankings individuales persistidos
  const { data: allRankings } = await supabase
    .from("rankings")
    .select("*")
    .eq("ranking_type", "individual")
    .order("points", { ascending: false })
    .order("matches_won", { ascending: false });

  // 4. Consolidar acumulados
  const indivAggMap = new Map<string, IndividualRankingItem>();
  (allRankings || [])
    .filter((r) => r.player_id)
    .forEach((r) => {
      const p = playersMap.get(r.player_id);
      const pName = p ? formatPlayerFullName(p) : "Jugador";
      const playerCategory = p?.category || r.category || "General";
      const playerGender: "Masculino" | "Femenino" =
        p?.gender === "Femenino" ? "Femenino" : "Masculino";

      const existing = indivAggMap.get(r.player_id);
      const pLoc =
        p?.localidad ||
        p?.city ||
        (r.player_id ? locationsMap.get(r.player_id) : null) ||
        (p?.email ? locationsMap.get(p.email.toLowerCase()) : null) ||
        "Saladillo";

      if (existing) {
        existing.points += r.points || 0;
        existing.tournaments += r.tournaments_played || 0;
        existing.matchesWon += r.matches_won || 0;
        existing.matchesLost += r.matches_lost || 0;
        if (pLoc) {
          existing.localidad = pLoc;
        }
        if (p?.category) {
          existing.category = p.category;
        }
        existing.gender = playerGender;
      } else {
        indivAggMap.set(r.player_id, {
          id: r.id,
          playerId: r.player_id,
          name: pName,
          firstName: p?.first_name || "J",
          lastName: p?.last_name || "",
          gender: playerGender,
          photoUrl:
            p?.photo_url ||
            p?.avatar_url ||
            (r.player_id ? photosMap.get(r.player_id) : null) ||
            null,
          localidad: pLoc,
          category: p?.category || playerCategory,
          tournaments: r.tournaments_played || 0,
          points: r.points || 0,
          matchesWon: r.matches_won || 0,
          matchesLost: r.matches_lost || 0,
          isObserved: !!p?.is_observed,
        });
      }
    });

  // 5. Incluir jugadores sin torneos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allPlayers || []).forEach((p: any) => {
    const pGender: "Masculino" | "Femenino" = p.gender === "Femenino" ? "Femenino" : "Masculino";
    const pLoc =
      p.localidad ||
      p.city ||
      locationsMap.get(p.id) ||
      (p.email ? locationsMap.get(p.email.toLowerCase()) : null) ||
      "Saladillo";

    if (indivAggMap.has(p.id)) {
      const existing = indivAggMap.get(p.id)!;
      if (p.category) {
        existing.category = p.category;
      }
      if (pLoc) {
        existing.localidad = pLoc;
      }
      existing.gender = pGender;
      return;
    }

    indivAggMap.set(p.id, {
      id: `p-${p.id}`,
      playerId: p.id,
      name: formatPlayerFullName(p),
      firstName: p.first_name || "J",
      lastName: p.last_name || "",
      gender: pGender,
      photoUrl: p.photo_url || p.avatar_url || photosMap.get(p.id) || null,
      localidad: pLoc,
      category: p.category || "General",
      tournaments: 0,
      points: 0,
      matchesWon: 0,
      matchesLost: 0,
      isObserved: !!p.is_observed,
    });
  });

  // 5.1 Aplicar overrides
  if (rankingOverridesMap && rankingOverridesMap.size > 0) {
    rankingOverridesMap.forEach((override, pId) => {
      const item = indivAggMap.get(pId);
      if (item) {
        item.points = override.points;
        item.tournaments = override.tournamentsPlayed;
        item.matchesWon = override.matchesWon;
        item.matchesLost = override.matchesLost;
      }
    });
  }

  // 6. Contadores por rama
  let totalCaballeros = 0;
  let totalDamas = 0;
  const countByCategory: Record<string, number> = {};

  indivAggMap.forEach((p) => {
    if (p.gender === "Femenino") {
      totalDamas++;
    } else {
      totalCaballeros++;
    }
  });

  // 7. Filtrar por rama
  const ramaPlayers = Array.from(indivAggMap.values()).filter(
    (p) => p.gender === selectedDbGender
  );

  ramaPlayers.forEach((p) => {
    const c = p.category || "General";
    countByCategory[c] = (countByCategory[c] || 0) + 1;
  });

  // 8. Categorías disponibles
  const catsSet = new Set<string>();
  indivAggMap.forEach((p) => {
    if (p.category && p.category !== "General") catsSet.add(p.category);
  });
  const availableCategories = [
    ...DEFAULT_CATEGORIES,
    ...Array.from(catsSet).filter((c) => !DEFAULT_CATEGORIES.includes(c)),
  ];

  const defaultCategory = availableCategories[0] || "8va";
  const activeCategory =
    category && category.toLowerCase() !== "all" && category.toLowerCase() !== "todas"
      ? category
      : defaultCategory;

  // 9. Filtrar y ordenar
  const individualRankings = ramaPlayers
    .filter((p) => {
      const pCat = (p.category || "").toLowerCase().trim();
      const sCat = activeCategory.toLowerCase().trim();
      return pCat === sCat;
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      if (b.tournaments !== a.tournaments) return b.tournaments - a.tournaments;
      const compLast = (a.lastName || "").localeCompare(b.lastName || "");
      if (compLast !== 0) return compLast;
      return (a.firstName || "").localeCompare(b.firstName || "");
    });

  return {
    individualRankings,
    availableCategories,
    activeCategory,
    selectedGender,
    totalCaballeros,
    totalDamas,
    countByCategory,
  };
}
