"use client";

import Card from "@/components/ui/Card";
import { Trophy, Award, ChevronRight } from "lucide-react";

interface BracketRound {
  round: string;
  matches: {
    pair1: string;
    pair2: string;
    winner?: string;
    score?: string;
  }[];
}

interface BracketProps {
  rounds: BracketRound[];
  pairNames: Record<string, string>;
}

const ROUND_LABELS: Record<string, string> = {
  octavos: "Octavos de Final",
  cuartos: "Cuartos de Final",
  semifinal: "Semifinales",
  final: "Gran Final",
  tercer_puesto: "3° y 4° Puesto",
  round_of_16: "Octavos de Final",
  quarter: "Cuartos de Final",
  semi: "Semifinales",
};

export default function Bracket({ rounds, pairNames }: BracketProps) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className="text-center py-10 text-dark-400 text-sm">
        No hay partidos de eliminación disponibles.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Mobile Swipe Hint */}
      <div className="flex items-center justify-between text-xs text-dark-400 mb-3 px-1 sm:hidden">
        <span className="flex items-center gap-1 font-medium">
          <ChevronRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Deslizá para ver el cuadro completo
        </span>
        <span className="text-[11px] text-dark-500">Playoffs SPT</span>
      </div>

      {/* Horizontal Scrollable Tree Container */}
      <div className="overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-dark-700">
        <div className="flex gap-10 sm:gap-14 min-w-max items-stretch px-2">
          {rounds.map((round, roundIndex) => {
            const isFinal = round.round === "final";
            const roundTitle = ROUND_LABELS[round.round] ?? round.round;

            return (
              <div key={round.round} className="flex flex-col relative">
                {/* Round Header */}
                <div className="mb-6 text-center">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                      isFinal
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-md shadow-amber-400/20"
                        : "bg-dark-800 text-dark-300 border border-dark-700"
                    }`}
                  >
                    {isFinal && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                    {roundTitle}
                  </div>
                </div>

                {/* Match Cards Column */}
                <div
                  className="flex flex-col justify-around gap-6 flex-1 relative"
                  style={{
                    minHeight: `${Math.max(1, round.matches.length) * 130}px`,
                  }}
                >
                  {round.matches.map((match, matchIndex) => {
                    const isP1Winner = match.winner && match.winner === match.pair1;
                    const isP2Winner = match.winner && match.winner === match.pair2;
                    const p1DisplayName = pairNames[match.pair1] ?? match.pair1;
                    const p2DisplayName = pairNames[match.pair2] ?? match.pair2;

                    return (
                      <div key={`${round.round}_${matchIndex}`} className="relative flex items-center">
                        <Card
                          className={`p-3 w-64 sm:w-72 border transition-all relative z-10 ${
                            isFinal && match.winner
                              ? "border-amber-400/60 bg-dark-900 shadow-xl shadow-amber-400/10"
                              : "border-dark-700/80 bg-dark-900/90 shadow-lg"
                          }`}
                        >
                          {/* Pair 1 in Match */}
                          <div
                            className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors mb-1.5 ${
                              isP1Winner
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-dark-950/70 text-slate-200 border border-dark-800"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate pr-2">
                              {isP1Winner && (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="truncate">{p1DisplayName}</span>
                            </div>
                            {match.score && (
                              <span className="scoreboard-digit text-xs font-mono font-bold text-dark-300 flex-shrink-0">
                                {isP1Winner ? "VICTORIA" : ""}
                              </span>
                            )}
                          </div>

                          {/* Pair 2 in Match */}
                          <div
                            className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                              isP2Winner
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-dark-950/70 text-slate-200 border border-dark-800"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate pr-2">
                              {isP2Winner && (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="truncate">{p2DisplayName}</span>
                            </div>
                            {match.score && (
                              <span className="scoreboard-digit text-xs font-mono font-bold text-dark-300 flex-shrink-0">
                                {isP2Winner ? "VICTORIA" : ""}
                              </span>
                            )}
                          </div>

                          {/* Match Score Display */}
                          {match.score && (
                            <div className="mt-2 pt-1.5 border-t border-dark-800/80 flex items-center justify-between text-[11px]">
                              <span className="text-dark-400 font-medium">Resultado:</span>
                              <span className="scoreboard-digit font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {match.score}
                              </span>
                            </div>
                          )}

                          {/* Champion Banner if this match is Final & completed */}
                          {isFinal && match.winner && (
                            <div className="mt-2.5 pt-2 border-t border-amber-400/30 flex items-center justify-center gap-1.5 text-xs font-black text-amber-300 bg-amber-400/10 py-1 rounded-lg">
                              <Award className="w-4 h-4 text-amber-400" />
                              <span>¡CAMPEONES DEL TORNEO!</span>
                            </div>
                          )}
                        </Card>

                        {/* Visual Connector to next round */}
                        {roundIndex < rounds.length - 1 && (
                          <div className="hidden sm:block absolute -right-10 sm:-right-14 w-10 sm:w-14 h-px bg-gradient-to-r from-dark-600 to-dark-700" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

