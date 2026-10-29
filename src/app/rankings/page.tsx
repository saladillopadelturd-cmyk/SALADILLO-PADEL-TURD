import type { Metadata } from "next";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { createClient } from "@/lib/supabase/server";
import { formatPlayerFullName } from "@/lib/tournament/couples";
import { syncAllTournamentsRankings } from "@/lib/tournament/rankings";
import { getPlayerPhotosMap } from "@/lib/tournament/player-photos";
import AboutRankingButton from "@/components/ranking/AboutRankingButton";
import { Trophy, Medal, User } from "lucide-react";

export const revalidate = 30; // ISR: cache de 30s para respuesta instantánea de rankings

export const metadata: Metadata = {
  title: "Rankings Oficiales de Pádel",
  description:
    "Tabla de posiciones oficial del Saladillo Padel Tour (SPT). Ranking individual por categoría y ranking de parejas en ramas Caballeros y Damas.",
  openGraph: {
    title: "Rankings Oficiales de Pádel | SPT Saladillo",
    description:
      "Consulta los rankings actualizados de pádel en Saladillo: puntajes individuales y duplas por categoría.",
    url: "/rankings",
  },
  alternates: {
    canonical: "/rankings",
  },
};

interface IndividualRankingItem {
  id: string;
  playerId?: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: "Masculino" | "Femenino";
  photoUrl?: string | null;
  category: string;
  tournaments: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
  isObserved?: boolean;
}

const DEFAULT_CATEGORIES = ["8va", "7ma", "6ta", "5ta", "4ta", "3ra", "2da", "1ra"];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; gender?: string; rama?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const requestedCategory = resolvedParams.category?.trim();

  // Determinar rama seleccionada: 'Caballeros' (Masculino) o 'Damas' (Femenino)
  const rawGender = (resolvedParams.gender || resolvedParams.rama || "").trim().toLowerCase();
  const isDamas = rawGender === "damas" || rawGender === "femenino" || rawGender === "fem";
  const selectedGender = isDamas ? "Damas" : "Caballeros";
  const selectedDbGender: "Masculino" | "Femenino" = isDamas ? "Femenino" : "Masculino";

  let individualRankings: IndividualRankingItem[] = [];
  let availableCategories: string[] = [...DEFAULT_CATEGORIES];
  let totalCaballeros = 0;
  let totalDamas = 0;
  const countByCategory: Record<string, number> = {};

  const supabase = await createClient();
  let isAdmin = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const isRootAdmin = user.email?.toLowerCase() === "matiasvidal11972@gmail.com";
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = isRootAdmin || profile?.role === "admin" || (profile as unknown as { role: string })?.role === "super_admin";
    }
  } catch {
    // Sesión no autenticada
  }

  try {
    // 1. Sincronizar rankings oficiales acumulados en tiempo real (torneos en curso y finalizados)
    try {
      await syncAllTournamentsRankings(supabase);
    } catch (syncErr) {
      console.warn("Aviso en sincronización en vivo de rankings:", syncErr);
    }

    // 2. Traer jugadores y fotografías de perfil para resolución completa
    const [{ data: allPlayers }, photosMap] = await Promise.all([
      supabase.from("players").select("*"),
      getPlayerPhotosMap(),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playersMap = new Map((allPlayers || []).map((p: any) => [p.id, p]));

    // 3. Obtener rankings individuales persistidos
    const { data: allRankings } = await supabase
      .from("rankings")
      .select("*")
      .eq("ranking_type", "individual")
      .order("points", { ascending: false })
      .order("matches_won", { ascending: false });

    // 4. Consolidar individuales sumando todos los puntos de cada torneo que disputó cada jugador
    const indivAggMap = new Map<string, IndividualRankingItem>();
    (allRankings || [])
      .filter((r) => r.player_id)
      .forEach((r) => {
        const p = playersMap.get(r.player_id);
        const pName = p ? formatPlayerFullName(p) : "Jugador";
        const playerCategory = p?.category || r.category || "General";
        const playerGender: "Masculino" | "Femenino" = p?.gender === "Femenino" ? "Femenino" : "Masculino";

        const existing = indivAggMap.get(r.player_id);
        if (existing) {
          existing.points += (r.points || 0);
          existing.tournaments += (r.tournaments_played || 0);
          existing.matchesWon += (r.matches_won || 0);
          existing.matchesLost += (r.matches_lost || 0);
          // La categoría y género oficiales del jugador en la tabla players siempre mandan
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
            photoUrl: p?.photo_url || p?.avatar_url || (r.player_id ? photosMap.get(r.player_id) : null) || null,
            category: p?.category || playerCategory,
            tournaments: r.tournaments_played || 0,
            points: r.points || 0,
            matchesWon: r.matches_won || 0,
            matchesLost: r.matches_lost || 0,
            isObserved: !!p?.is_observed,
          });
        }
      });

    // 5. Incluir a todos los jugadores registrados con 0 puntos si no disputaron torneos aún
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allPlayers || []).forEach((p: any) => {
      const pGender: "Masculino" | "Femenino" = p.gender === "Femenino" ? "Femenino" : "Masculino";

      if (indivAggMap.has(p.id)) {
        const existing = indivAggMap.get(p.id)!;
        if (p.category) {
          existing.category = p.category;
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
        category: p.category || "General",
        tournaments: 0,
        points: 0,
        matchesWon: 0,
        matchesLost: 0,
        isObserved: !!p.is_observed,
      });
    });

    // 6. Contabilizar totales globales por rama (Caballeros y Damas)
    indivAggMap.forEach((p) => {
      if (p.gender === "Femenino") {
        totalDamas++;
      } else {
        totalCaballeros++;
      }
    });

    // 7. Filtrar jugadores exclusivamente de la rama seleccionada
    const ramaPlayers = Array.from(indivAggMap.values()).filter(
      (p) => p.gender === selectedDbGender
    );

    // Contar jugadores de esta rama por cada categoría
    ramaPlayers.forEach((p) => {
      const c = p.category || "General";
      countByCategory[c] = (countByCategory[c] || 0) + 1;
    });

    // 8. Extraer categorías oficiales disponibles en el sistema
    const catsSet = new Set<string>();
    indivAggMap.forEach((p) => {
      if (p.category && p.category !== "General") catsSet.add(p.category);
    });

    // Mantener orden estándar de categorías (8va a 1ra) e incluir cualquier otra registrada en BD
    availableCategories = [
      ...DEFAULT_CATEGORIES,
      ...Array.from(catsSet).filter((c) => !DEFAULT_CATEGORIES.includes(c)),
    ];

    // 9. Resolver categoría seleccionada: jamás habrá ranking general, siempre discriminado por categoría
    const defaultCategory = availableCategories[0] || "8va";
    const activeCategory =
      requestedCategory &&
      requestedCategory.toLowerCase() !== "all" &&
      requestedCategory.toLowerCase() !== "todas"
        ? requestedCategory
        : defaultCategory;

    // 10. Filtrar estrictamente por la categoría seleccionada (solo jugadores de esa categoría y género)
    individualRankings = ramaPlayers
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
  } catch (err) {
    console.error("Error fetching rankings from Supabase:", err);
  }

  const selectedCategory =
    requestedCategory &&
    requestedCategory.toLowerCase() !== "all" &&
    requestedCategory.toLowerCase() !== "todas"
      ? requestedCategory
      : availableCategories[0] || "8va";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Principal */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-amber-400" /> Saladillo Padel Tour
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Rankings Oficiales
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Puntajes oficiales acumulados del circuito por rama (Damas / Caballeros) y categoría deportiva.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Actualizado en vivo
          </div>
          <AboutRankingButton />
        </div>
      </div>

      {/* Selector Principal de Rama (Damas / Caballeros) */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Pestaña Caballeros */}
        <a
          href={`/rankings?gender=Caballeros&category=${encodeURIComponent(selectedCategory)}`}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg ${
            !isDamas
              ? "bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 shadow-emerald-500/25 ring-2 ring-emerald-400"
              : "bg-dark-900/80 text-dark-300 hover:text-white hover:bg-dark-800 border border-dark-800"
          }`}
        >
          <span className="text-base font-black">♂</span>
          <span>CABALLEROS</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-black ${
              !isDamas ? "bg-dark-950/30 text-dark-950" : "bg-dark-800 text-dark-400"
            }`}
          >
            {totalCaballeros}
          </span>
        </a>

        {/* Pestaña Damas */}
        <a
          href={`/rankings?gender=Damas&category=${encodeURIComponent(selectedCategory)}`}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg ${
            isDamas
              ? "bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white shadow-rose-500/25 ring-2 ring-rose-400"
              : "bg-dark-900/80 text-dark-300 hover:text-white hover:bg-dark-800 border border-dark-800"
          }`}
        >
          <span className="text-base font-black">♀</span>
          <span>DAMAS</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-black ${
              isDamas ? "bg-white/20 text-white" : "bg-dark-800 text-dark-400"
            }`}
          >
            {totalDamas}
          </span>
        </a>
      </div>

      {/* Selector de Categorías de la Rama Activa (Pills) */}
      <div className="mb-6 flex items-center gap-1.5 bg-dark-900/80 p-1.5 rounded-2xl border border-dark-800 text-xs overflow-x-auto max-w-full">
        {availableCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
          const catCount = countByCategory[cat] || 0;
          return (
            <a
              key={cat}
              href={`/rankings?gender=${selectedGender}&category=${encodeURIComponent(cat)}`}
              className={`px-3.5 py-2 rounded-xl font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? isDamas
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-rose-500/25"
                    : "bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 shadow-md shadow-emerald-500/25"
                  : "text-dark-300 hover:text-white hover:bg-dark-800"
              }`}
            >
              <span>{cat} Categoría</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? isDamas
                      ? "bg-white/20 text-white"
                      : "bg-dark-950/30 text-dark-950"
                    : "bg-dark-800 text-dark-400"
                }`}
              >
                {catCount}
              </span>
            </a>
          );
        })}
      </div>

      {/* Título de la Rama y Categoría Activa */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`p-1.5 rounded-xl ${
              isDamas ? "bg-pink-500/10 text-pink-400" : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <User className="w-5 h-5" />
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white">
            Ranking Oficial {selectedGender} • {selectedCategory} Categoría
          </h2>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border ${
            isDamas
              ? "text-pink-400 bg-pink-500/10 border-pink-500/20"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          }`}
        >
          {individualRankings.length}{" "}
          {isDamas
            ? individualRankings.length === 1
              ? "jugadora"
              : "jugadoras"
            : individualRankings.length === 1
            ? "jugador"
            : "jugadores"}
        </span>
      </div>

      {/* TABLA EXCLUSIVA DE RANKING POR GÉNERO Y CATEGORÍA */}
      {individualRankings.length === 0 ? (
        <Card className="mt-4 p-12 text-center border-dark-700/80 shadow-xl bg-dark-900/60">
          <User className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            Sin {isDamas ? "jugadoras registradas" : "jugadores registrados"} en {selectedGender} • {selectedCategory} Categoría aún
          </h3>
          <p className="text-dark-400 text-sm max-w-md mx-auto">
            {isDamas ? "Las jugadoras" : "Los jugadores"} que pertenezcan a {selectedCategory} categoría en la rama {selectedGender.toLowerCase()} aparecerán automáticamente en este ranking.
          </p>
        </Card>
      ) : (
        <Card className="mt-4 overflow-hidden border-dark-700/80 shadow-xl bg-dark-900/90">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-950 text-dark-400 uppercase text-xs border-b border-dark-800">
                  <th className="px-6 py-3.5 text-left font-semibold">Pos.</th>
                  <th className="px-6 py-3.5 text-left font-semibold">
                    {isDamas ? "Jugadora" : "Jugador"}
                  </th>
                  <th className="px-4 py-3.5 text-center font-semibold">Cat.</th>
                  <th className="px-4 py-3.5 text-center font-semibold">Torneos</th>
                  <th className="px-4 py-3.5 text-center font-semibold">PG / PP</th>
                  <th
                    className={`px-6 py-3.5 text-center font-semibold ${
                      isDamas ? "text-pink-400" : "text-emerald-400"
                    }`}
                  >
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/80">
                {individualRankings.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`transition-colors h-16 ${
                      i === 0
                        ? "bg-amber-400/[0.06] hover:bg-amber-400/[0.10]"
                        : i === 1
                        ? "bg-slate-300/[0.04] hover:bg-slate-300/[0.07]"
                        : i === 2
                        ? "bg-amber-600/[0.04] hover:bg-amber-600/[0.07]"
                        : "bg-dark-900/60 hover:bg-dark-850"
                    }`}
                  >
                    <td className="px-6 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            i === 0
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-400/20"
                              : i === 1
                              ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                              : i === 2
                              ? "bg-amber-700/20 text-amber-400 border border-amber-600/30"
                              : "text-dark-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                        {i === 0 && <Medal className="w-4 h-4 text-amber-400 hidden sm:inline" />}
                      </div>
                    </td>
                    <td className="px-6 py-1 text-white font-bold text-sm sm:text-base">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          id={p.playerId}
                          playerId={p.playerId}
                          photoUrl={p.photoUrl}
                          firstName={p.firstName}
                          lastName={p.lastName}
                          category={p.category}
                          size="ranking"
                          showCategoryBorder
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{p.name}</span>
                          {isAdmin && p.isObserved && (
                            <span
                              title="Jugador/a en observación para ascenso de categoría"
                              className="text-amber-400 text-[11px] inline-flex items-center gap-1 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex-shrink-0"
                            >
                              👁️ Observado/a
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-xs font-semibold">
                      <Badge
                        variant={isDamas ? "gold" : "success"}
                        className="font-bold uppercase text-[11px]"
                      >
                        {p.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-300 scoreboard-digit">{p.tournaments}</td>
                    <td className="px-4 py-2 text-center text-xs scoreboard-digit">
                      <span className="text-emerald-400 font-bold">{p.matchesWon}</span>{" "}
                      <span className="text-dark-500">/</span>{" "}
                      <span className="text-rose-400 font-medium">{p.matchesLost}</span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span
                        className={`scoreboard-digit font-mono font-black text-lg ${
                          isDamas ? "text-pink-400" : "text-emerald-400"
                        }`}
                      >
                        {p.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
