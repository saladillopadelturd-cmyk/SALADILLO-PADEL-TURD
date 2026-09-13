import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Trophy, CheckCircle2, XCircle } from "lucide-react";

interface ZoneCardProps {
  zoneName: string;
  zoneNumber: number;
  standings: {
    position: number;
    pairName: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
    points: number;
  }[];
}

export default function ZoneCard({ zoneName, zoneNumber, standings }: ZoneCardProps) {
  return (
    <Card className="overflow-hidden border border-dark-700/70 shadow-xl bg-dark-900/90">
      {/* Zone Header */}
      <div className="px-4 py-3 bg-dark-950 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-xs">{zoneNumber}</span>
          </div>
          <h3 className="text-white font-bold text-sm sm:text-base tracking-tight">{zoneName}</h3>
        </div>
        <Badge variant="info" size="sm">
          Zona {zoneNumber}
        </Badge>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-dark-400 text-[11px] uppercase tracking-wider bg-dark-950/60 border-b border-dark-800">
              <th className="px-3 sm:px-4 py-2.5 text-left font-semibold">Pos</th>
              <th className="px-3 sm:px-4 py-2.5 text-left font-semibold">Pareja</th>
              <th className="px-2.5 py-2.5 text-center font-semibold">PJ</th>
              <th className="px-2.5 py-2.5 text-center font-semibold text-emerald-400">PG</th>
              <th className="px-2.5 py-2.5 text-center font-semibold text-rose-400">PP</th>
              <th className="px-2.5 py-2.5 text-center font-semibold">Sets</th>
              <th className="px-2.5 py-2.5 text-center font-semibold">Games</th>
              <th className="px-3 py-2.5 text-center font-bold text-sky-400">Pts</th>
              <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/80">
            {standings.map((s, i) => {
              const isEliminated = i === standings.length - 1 && standings.length > 1;
              const isFirst = i === 0;
              const isQualified = !isEliminated && standings.length > 1;

              return (
                <tr
                  key={i}
                  className={`transition-colors ${
                    isEliminated
                      ? "bg-rose-950/20 text-rose-300 hover:bg-rose-950/30"
                      : isFirst
                      ? "bg-amber-400/[0.04] text-white hover:bg-amber-400/[0.08]"
                      : "bg-dark-900/60 text-white hover:bg-dark-850"
                  }`}
                >
                  {/* Position indicator */}
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isFirst ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-black text-xs border border-amber-400/40">
                          1°
                        </span>
                      ) : isEliminated ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30">
                          {i + 1}°
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                          {i + 1}°
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Pair Name */}
                  <td className="px-3 sm:px-4 py-3 font-semibold text-xs sm:text-sm">
                    <span className="truncate block max-w-[160px] sm:max-w-[220px]">
                      {s.pairName}
                    </span>
                  </td>

                  {/* Matches Stats */}
                  <td className="px-2.5 py-3 text-center text-xs text-dark-300 scoreboard-digit">
                    {s.matchesPlayed}
                  </td>
                  <td className="px-2.5 py-3 text-center text-xs text-emerald-400 font-bold scoreboard-digit">
                    {s.matchesWon}
                  </td>
                  <td className="px-2.5 py-3 text-center text-xs text-rose-400 scoreboard-digit">
                    {s.matchesLost}
                  </td>

                  {/* Sets and Games */}
                  <td className="px-2.5 py-3 text-center text-xs text-dark-300 scoreboard-digit">
                    {s.setsWon}-{s.setsLost}
                  </td>
                  <td className="px-2.5 py-3 text-center text-xs text-dark-300 scoreboard-digit">
                    {s.gamesWon}-{s.gamesLost}
                  </td>

                  {/* Points */}
                  <td className="px-3 py-3 text-center text-sm font-black text-sky-400 scoreboard-digit">
                    {s.points}
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-3 text-center">
                    {isEliminated ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        Eliminada
                      </span>
                    ) : isFirst ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/35">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        Clasifica 1°
                      </span>
                    ) : isQualified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Clasifica
                      </span>
                    ) : (
                      <span className="text-dark-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

