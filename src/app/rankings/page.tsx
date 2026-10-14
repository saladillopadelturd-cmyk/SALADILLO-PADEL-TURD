import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { createClient } from "@/lib/supabase/server";
import { formatPlayerShortName } from "@/lib/tournament/couples";
import { syncAllTournamentsRankings, resolveCoupleCategory, getCoupleKey } from "@/lib/tournament/rankings";
import { Trophy, Medal, Users, User, Flame, CheckCircle2 } from "lucide-react";

export const revalidate = 0;

interface CoupleRankingItem {
  id: string;
  name: string;
  category: string;
  tournaments: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
}

interface IndividualRankingItem {
  id: string;
  playerId?: string;
  name: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  category: string;
  tournaments: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
  isObserved?: boolean;
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedCategory = resolvedParams.category || "all";
  const supabase = await createClient();

  let coupleRankings: CoupleRankingItem[] = [];
  let individualRankings: IndividualRankingItem[] = [];
  let availableCategories: string[] = [];

  try {
    // 1. Auto-sincronizar siempre para consolidar todos los puntos de torneos disputados
    await syncAllTournamentsRankings(supabase);

    // 2. Traer jugadores para resolución de nombres y categorías oficiales
    const { data: allPlayers } = await supabase.from("players").select("*");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playersMap = new Map((allPlayers || []).map((p: any) => [p.id, p]));

    // 3. Obtener rankings persistidos
    const { data: allRankings } = await supabase
      .from("rankings")
      .select("*")
      .order("points", { ascending: false })
      .order("matches_won", { ascending: false });

    // 4. Consolidar parejas sumando todos los puntos de cada torneo que disputaron juntos
    const coupleAggMap = new Map<string, CoupleRankingItem>();
    (allRankings || [])
      .filter((r) => r.ranking_type === "couple")
      .forEach((r) => {
        const p1 = r.player1_id ? playersMap.get(r.player1_id) : null;
        const p2 = r.player2_id ? playersMap.get(r.player2_id) : null;
        const p1Id = r.player1_id || "";
        const p2Id = r.player2_id || "";
        const key = r.couple_key || getCoupleKey(p1Id, p2Id);
        const p1Name = p1 ? formatPlayerShortName(p1) : "Jugador 1";
        const p2Name = p2 ? formatPlayerShortName(p2) : "Jugador 2";
        const coupleCategory = r.category || resolveCoupleCategory(p1?.category, p2?.category, "General");

        const existing = coupleAggMap.get(key);
        if (existing) {
          existing.points += (r.points || 0);
          existing.tournaments += (r.tournaments_played || 0);
          existing.matchesWon += (r.matches_won || 0);
          existing.matchesLost += (r.matches_lost || 0);
        } else {
          coupleAggMap.set(key, {
            id: r.id,
            name: `${p1Name} / ${p2Name}`,
            category: coupleCategory,
            tournaments: r.tournaments_played || 0,
            points: r.points || 0,
            matchesWon: r.matches_won || 0,
            matchesLost: r.matches_lost || 0,
          });
        }
      });

    // 5. Consolidar individuales sumando todos los puntos de cada torneo que disputó cada jugador
    const indivAggMap = new Map<string, IndividualRankingItem>();
    (allRankings || [])
      .filter((r) => r.ranking_type === "individual" && r.player_id)
      .forEach((r) => {
        const p = playersMap.get(r.player_id);
        const pName = p ? formatPlayerShortName(p) : "Jugador";
        const playerCategory = p?.category || r.category || "General";

        const existing = indivAggMap.get(r.player_id);
        if (existing) {
          existing.points += (r.points || 0);
          existing.tournaments += (r.tournaments_played || 0);
          existing.matchesWon += (r.matches_won || 0);
          existing.matchesLost += (r.matches_lost || 0);
        } else {
          indivAggMap.set(r.player_id, {
            id: r.id,
            playerId: r.player_id,
            name: pName,
            firstName: p?.first_name || "J",
            lastName: p?.last_name || "",
            photoUrl: p?.photo_url || p?.avatar_url || null,
            category: playerCategory,
            tournaments: r.tournaments_played || 0,
            points: r.points || 0,
            matchesWon: r.matches_won || 0,
            matchesLost: r.matches_lost || 0,
            isObserved: !!p?.is_observed,
          });
        }
      });

    // 6. Incluir a todos los jugadores registrados con 0 puntos si no disputaron torneos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allPlayers || []).forEach((p: any) => {
      if (indivAggMap.has(p.id)) return;
      indivAggMap.set(p.id, {
        id: `p-${p.id}`,
        playerId: p.id,
        name: formatPlayerShortName(p),
        firstName: p.first_name || "J",
        lastName: p.last_name || "",
        photoUrl: p.photo_url || p.avatar_url || null,
        category: p.category || "General",
        tournaments: 0,
        points: 0,
        matchesWon: 0,
        matchesLost: 0,
        isObserved: !!p.is_observed,
      });
    });

    // 7. Extraer categorías oficiales disponibles
    const catsSet = new Set<string>();
    coupleAggMap.forEach((c) => { if (c.category) catsSet.add(c.category); });
    indivAggMap.forEach((p) => { if (p.category) catsSet.add(p.category); });
    availableCategories = Array.from(catsSet).sort();

    // 8. Filtrar y ordenar rankings
    coupleRankings = Array.from(coupleAggMap.values())
      .filter((c) => selectedCategory === "all" || c.category === selectedCategory)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        return a.name.localeCompare(b.name);
      });

    individualRankings = Array.from(indivAggMap.values())
      .filter((p) => selectedCategory === "all" || p.category === selectedCategory)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-amber-400" /> Saladillo Padel Tour
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Rankings Oficiales
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Puntajes acumulados por torneos jugados. El ranking individual se conserva aunque cambies de pareja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Actualizado en vivo
          </div>
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1.5 bg-dark-900/80 p-1 rounded-xl border border-dark-700/70 text-xs">
              <a
                href="/rankings"
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  selectedCategory === "all"
                    ? "bg-primary-600 text-white shadow-sm shadow-primary-600/30"
                    : "text-dark-400 hover:text-white"
                }`}
              >
                Todas
              </a>
              {availableCategories.map((cat) => (
                <a
                  key={cat}
                  href={`/rankings?category=${encodeURIComponent(cat)}`}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary-600 text-white shadow-sm shadow-primary-600/30"
                      : "text-dark-400 hover:text-white"
                  }`}
                >
                  {cat}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="parejas">
        <TabsList>
          <TabsTrigger value="parejas" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Ranking de Parejas
          </TabsTrigger>
          <TabsTrigger value="jugadores" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Ranking Individual
          </TabsTrigger>
        </TabsList>

        {/* PAREJAS */}
        <TabsContent value="parejas">
          {coupleRankings.length === 0 ? (
            <Card className="mt-6 p-12 text-center border-dark-700 shadow-xl bg-dark-900/60">
              <Trophy className="w-12 h-12 text-dark-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Sin rankings de parejas registrados aún</h3>
              <p className="text-dark-400 text-sm max-w-md mx-auto">
                Los puntajes oficiales por parejas se actualizarán en tiempo real a medida que se disputen los partidos y se liquiden los torneos.
              </p>
            </Card>
          ) : (
            <Card className="mt-6 overflow-hidden border-dark-700 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                      <th className="px-6 py-3.5 text-left">Pos.</th>
                      <th className="px-6 py-3.5 text-left">Pareja</th>
                      <th className="px-4 py-3.5 text-center">Cat.</th>
                      <th className="px-4 py-3.5 text-center">Torneos</th>
                      <th className="px-4 py-3.5 text-center">PG / PP</th>
                      <th className="px-6 py-3.5 text-center">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/80">
                    {coupleRankings.map((c, i) => (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          i === 0
                            ? "bg-amber-400/[0.06] hover:bg-amber-400/[0.10]"
                            : i === 1
                            ? "bg-slate-300/[0.04] hover:bg-slate-300/[0.07]"
                            : i === 2
                            ? "bg-amber-600/[0.04] hover:bg-amber-600/[0.07]"
                            : "bg-dark-900/60 hover:bg-dark-850"
                        }`}
                      >
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4 text-white font-bold text-sm sm:text-base">{c.name}</td>
                        <td className="px-4 py-4 text-center text-xs font-semibold text-emerald-400">{c.category}</td>
                        <td className="px-4 py-4 text-center text-slate-300 scoreboard-digit">{c.tournaments}</td>
                        <td className="px-4 py-4 text-center text-xs scoreboard-digit">
                          <span className="text-emerald-400 font-bold">{c.matchesWon}</span>{" "}
                          <span className="text-dark-500">/</span>{" "}
                          <span className="text-rose-400 font-medium">{c.matchesLost}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="scoreboard-digit font-mono font-black text-lg text-emerald-400">
                            {c.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* JUGADORES */}
        <TabsContent value="jugadores">
          {individualRankings.length === 0 ? (
            <Card className="mt-6 p-12 text-center border-dark-700/80 shadow-xl bg-dark-900/60">
              <User className="w-12 h-12 text-dark-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Sin rankings individuales registrados aún</h3>
              <p className="text-dark-400 text-sm max-w-md mx-auto">
                Cada jugador acumulará puntos individuales en los torneos disputados que conservará independientemente de con quién forme pareja.
              </p>
            </Card>
          ) : (
            <Card className="mt-6 overflow-hidden border-dark-700/80 shadow-xl bg-dark-900/90">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-950 text-dark-400 uppercase text-xs border-b border-dark-800">
                      <th className="px-6 py-3.5 text-left font-semibold">Pos.</th>
                      <th className="px-6 py-3.5 text-left font-semibold">Jugador</th>
                      <th className="px-4 py-3.5 text-center font-semibold">Cat.</th>
                      <th className="px-4 py-3.5 text-center font-semibold">Torneos</th>
                      <th className="px-4 py-3.5 text-center font-semibold">PG / PP</th>
                      <th className="px-6 py-3.5 text-center font-semibold text-emerald-400">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800/80">
                    {individualRankings.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          i === 0
                            ? "bg-amber-400/[0.06] hover:bg-amber-400/[0.10]"
                            : i === 1
                            ? "bg-slate-300/[0.04] hover:bg-slate-300/[0.07]"
                            : i === 2
                            ? "bg-amber-600/[0.04] hover:bg-amber-600/[0.07]"
                            : "bg-dark-900/60 hover:bg-dark-850"
                        }`}
                      >
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4 text-white font-bold text-sm sm:text-base">
                          <div className="flex items-center gap-3">
                            <PlayerAvatar
                              photoUrl={p.photoUrl}
                              firstName={p.firstName}
                              lastName={p.lastName}
                              category={p.category}
                              size="sm"
                              showCategoryBorder
                            />
                            <div className="flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.isObserved && (
                                <span
                                  title="Jugador en observación para ascenso de categoría"
                                  className="text-amber-400 text-[11px] inline-flex items-center gap-1 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30"
                                >
                                  👁️ Observado
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-semibold text-emerald-400">{p.category}</td>
                        <td className="px-4 py-4 text-center text-slate-300 scoreboard-digit">{p.tournaments}</td>
                        <td className="px-4 py-4 text-center text-xs scoreboard-digit">
                          <span className="text-emerald-400 font-bold">{p.matchesWon}</span>{" "}
                          <span className="text-dark-500">/</span>{" "}
                          <span className="text-rose-400 font-medium">{p.matchesLost}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="scoreboard-digit font-mono font-black text-lg text-emerald-400">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
