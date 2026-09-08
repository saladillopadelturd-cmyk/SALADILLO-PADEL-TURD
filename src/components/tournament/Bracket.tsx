"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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
  semifinal: "Semifinal",
  final: "Final",
  tercer_puesto: "Tercer Puesto",
};

export default function Bracket({ rounds, pairNames }: BracketProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {rounds.map((round, roundIndex) => (
          <div key={round.round} className="flex flex-col">
            <h4 className="text-sm font-bold text-dark-400 uppercase mb-4 text-center whitespace-nowrap">
              {ROUND_LABELS[round.round] ?? round.round}
            </h4>
            <div
              className="flex flex-col justify-around gap-4"
              style={{
                minHeight: `${Math.pow(2, roundIndex) * 120}px`,
              }}
            >
              {round.matches.map((match, matchIndex) => (
                <Card
                  key={`${round.round}_${matchIndex}`}
                  className="p-3 w-56"
                >
                  <div className="space-y-1">
                    <div
                      className={`flex items-center justify-between px-2 py-1.5 rounded ${
                        match.winner === match.pair1
                          ? "bg-green-500/20 text-green-400"
                          : "text-white"
                      }`}
                    >
                      <span className="text-sm truncate">
                        {pairNames[match.pair1] ?? match.pair1}
                      </span>
                      {match.score && (
                        <span className="text-xs ml-2">{match.score}</span>
                      )}
                    </div>
                    <div
                      className={`flex items-center justify-between px-2 py-1.5 rounded ${
                        match.winner === match.pair2
                          ? "bg-green-500/20 text-green-400"
                          : "text-white"
                      }`}
                    >
                      <span className="text-sm truncate">
                        {pairNames[match.pair2] ?? match.pair2}
                      </span>
                      {match.score && (
                        <span className="text-xs ml-2">{match.score}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
