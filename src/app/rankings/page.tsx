import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/server";
import { formatPlayerShortName } from "@/lib/tournament/couples";
import { syncAllTournamentsRankings } from "@/lib/tournament/rankings";
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
  name: string;
  category: string;
  tournaments: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
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
    // 1. Auto-sincronizar si la tabla de rankings está vacía para que siempre muestre datos al instante
    const { count } = await supabase.from("rankings").select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      await syncAllTournamentsRankings(supabase);
    }

    // 2. Traer jugadores para resolución 100% segura de nombres abreviados
    const { data: allPlayers } = await supabase.from("players").select("*");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playersMap = new Map((allPlayers || []).map((p: any) => [p.id, p]));

    // 3. Obtener todos los rankings para extraer categorías disponibles
    const { data: allRankings } = await supabase
      .from("rankings")
      .select("*")
      .order("points", { ascending: false })
      .order("matches_won", { ascending: false });

    if (allRankings && allRankings.length > 0) {
      const catsSet = new Set<string>();
      allRankings.forEach((r) => {
        if (r.category) catsSet.add(r.category);
      });
      availableCategories = Array.from(catsSet).sort();

      const filtered = selectedCategory === "all"
        ? allRankings
        : allRankings.filter((r) => r.category === selectedCategory);

      // Separar parejas e individuales
      coupleRankings = filtered
        .filter((r) => r.ranking_type === "couple")
        .map((r) => {
          const p1 = r.player1_id ? playersMap.get(r.player1_id) : null;
          const p2 = r.player2_id ? playersMap.get(r.player2_id) : null;
          const p1Name = p1 ? formatPlayerShortName(p1) : "Jugador 1";
          const p2Name = p2 ? formatPlayerShortName(p2) : "Jugador 2";
          return {
            id: r.id,
            name: `${p1Name} / ${p2Name}`,
            category: r.category || "General",
            tournaments: r.tournaments_played,
            points: r.points,
            matchesWon: r.matches_won,
            matchesLost: r.matches_lost,
          };
        });

      individualRankings = filtered
        .filter((r) => r.ranking_type === "individual")
        .map((r) => {
          const p = r.player_id ? playersMap.get(r.player_id) : null;
          const pName = p ? formatPlayerShortName(p) : "Jugador";
          return {
            id: r.id,
            name: pName,
            category: r.category || "General",
            tournaments: r.tournaments_played,
            points: r.points,
            matchesWon: r.matches_won,
            matchesLost: r.matches_lost,
          };
        });
    }
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
                        <td className="px-6 py-4 text-white font-bold text-sm sm:text-base">{p.name}</td>
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
