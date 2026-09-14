"use client";

import type { Pair } from "@/types/tournament";
import { formatPlayerShortName } from "@/lib/tournament/couples";

interface PairSelectorProps {
  pairs: Pair[];
  selectedPairs: string[];
  onToggle: (pairId: string) => void;
  zoneName: string;
}

export default function PairSelector({
  pairs,
  selectedPairs,
  onToggle,
  zoneName,
}: PairSelectorProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-white font-medium text-sm">{zoneName}</h4>
      <div className="space-y-1">
        {pairs.map((pair) => {
          const isSelected = selectedPairs.includes(pair.id);
          const pairName = `${formatPlayerShortName(pair.player1)} / ${formatPlayerShortName(pair.player2)}`;
          return (
            <button
              key={pair.id}
              onClick={() => onToggle(pair.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isSelected
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "bg-dark-800 text-dark-300 hover:bg-dark-700 border border-transparent"
              }`}
            >
              <span>{pairName}</span>
              {isSelected && (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
