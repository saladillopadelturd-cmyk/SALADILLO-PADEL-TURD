import Card from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/server";
import { Trophy, Medal, Users, User } from "lucide-react";

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

export default async function RankingsPage() {
  const supabase = await createClient();

  let coupleRankings: CoupleRankingItem[] = [];
  let individualRankings: IndividualRankingItem[] = [];

  try {
    // 1. Fetch Couple Rankings
    const { data: cData } = await supabase
      .from("rankings")
      .select("*, player1:players!rankings_player1_id_fkey(*), player2:players!rankings_player2_id_fkey(*)")
      .eq("ranking_type", "couple")
      .order("points", { ascending: false });

    if (cData && cData.length > 0) {
      coupleRankings = cData.map((r) => {
        const p1 = r.player1 ? `${r.player1.first_name} ${r.player1.last_name}` : "Jugador 1";
        const p2 = r.player2 ? `${r.player2.first_name} ${r.player2.last_name}` : "Jugador 2";
        return {
          id: r.id,
          name: `${p1} & ${p2}`,
          category: r.category,
          tournaments: r.tournaments_played,
          points: r.points,
          matchesWon: r.matches_won,
          matchesLost: r.matches_lost,
        };
      });
    }

    // 2. Fetch Individual Rankings
    const { data: iData } = await supabase
      .from("rankings")
      .select("*, player:players!rankings_player_id_fkey(*)")
      .eq("ranking_type", "individual")
      .order("points", { ascending: false });

    if (iData && iData.length > 0) {
      individualRankings = iData.map((r) => {
        const p = r.player ? `${r.player.first_name} ${r.player.last_name}` : "Jugador";
        return {
          id: r.id,
          name: p,
          category: r.category,
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

  // Demo fallback if database is empty initially
  if (coupleRankings.length === 0) {
    coupleRankings = [
      { id: "1", name: "Matías Vidal & Juan Pérez", category: "5ta", tournaments: 3, points: 280, matchesWon: 6, matchesLost: 1 },
      { id: "2", name: "Lucas González & Martín Rodríguez", category: "5ta", tournaments: 2, points: 190, matchesWon: 4, matchesLost: 2 },
      { id: "3", name: "Federico Díaz & Esteban López", category: "5ta", tournaments: 2, points: 140, matchesWon: 3, matchesLost: 2 },
    ];
  }

  if (individualRankings.length === 0) {
    individualRankings = [
      { id: "1", name: "Matías Vidal", category: "5ta", tournaments: 3, points: 280, matchesWon: 6, matchesLost: 1 },
      { id: "2", name: "Juan Pérez", category: "5ta", tournaments: 3, points: 280, matchesWon: 6, matchesLost: 1 },
      { id: "3", name: "Lucas González", category: "5ta", tournaments: 2, points: 190, matchesWon: 4, matchesLost: 2 },
      { id: "4", name: "Martín Rodríguez", category: "5ta", tournaments: 2, points: 190, matchesWon: 4, matchesLost: 2 },
      { id: "5", name: "Federico Díaz", category: "5ta", tournaments: 2, points: 140, matchesWon: 3, matchesLost: 2 },
    ];
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
        </TabsContent>

        {/* JUGADORES */}
        <TabsContent value="jugadores">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
