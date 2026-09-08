"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { isGoldenPoint, isDeathSudden } from "@/lib/tournament/american-system";

interface ScoreInputProps {
  matchId: string;
  gameMode: "round_robin_diff" | "american_9games" | "american_2sets";
  pair1Name: string;
  pair2Name: string;
  onSave: (score1: any, score2: any) => void;
}

export default function ScoreInput({
  matchId,
  gameMode,
  pair1Name,
  pair2Name,
  onSave,
}: ScoreInputProps) {
  const [sets, setSets] = useState<{ pair1: number[]; pair2: number[] }>({
    pair1: [0],
    pair2: [0],
  });
  const [currentSet, setCurrentSet] = useState(0);

  const addSet = () => {
    if (sets.pair1.length < 3) {
      setSets({
        pair1: [...sets.pair1, 0],
        pair2: [...sets.pair2, 0],
      });
      setCurrentSet(sets.pair1.length);
    }
  };

  const updateGame = (pair: "pair1" | "pair2", delta: number) => {
    const newSets = { ...sets };
    const newVal = newSets[pair][currentSet] + delta;
    if (newVal >= 0 && newVal <= 7) {
      newSets[pair][currentSet] = newVal;
      setSets(newSets);
    }
  };

  const getGamesWon = (pair: "pair1" | "pair2") =>
    sets[pair].reduce((a, b) => a + b, 0);

  const getSetsWon = (pair: "pair1" | "pair2") =>
    sets[pair].filter((s, i) => s > sets[pair === "pair1" ? "pair2" : "pair1"][i]).length;

  const currentP1 = sets.pair1[currentSet];
  const currentP2 = sets.pair2[currentSet];
  const goldenPoint = isGoldenPoint({ server: currentP1, receiver: currentP2 });

  const handleSave = () => {
    onSave(
      {
        sets: sets.pair1,
        games_won: getGamesWon("pair1"),
        games_lost: getGamesWon("pair2"),
      },
      {
        sets: sets.pair2,
        games_won: getGamesWon("pair2"),
        games_lost: getGamesWon("pair1"),
      }
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">Cargar Resultado</h3>

      <div className="grid grid-cols-3 gap-4 items-center mb-6">
        <div className="text-right">
          <p className="text-white font-medium text-sm">{pair1Name}</p>
        </div>
        <div className="text-center">
          <p className="text-dark-400 text-xs uppercase">Set {currentSet + 1}</p>
        </div>
        <div>
          <p className="text-white font-medium text-sm">{pair2Name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-center mb-4">
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={() => updateGame("pair1", -1)}
            className="w-8 h-8 rounded bg-dark-700 text-white hover:bg-dark-600 flex items-center justify-center"
          >
            -
          </button>
          <span className="text-2xl font-bold text-white w-8 text-center">
            {currentP1}
          </span>
          <button
            onClick={() => updateGame("pair1", 1)}
            className="w-8 h-8 rounded bg-dark-700 text-white hover:bg-dark-600 flex items-center justify-center"
          >
            +
          </button>
        </div>

        <div className="text-center">
          {goldenPoint && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30 animate-pulse">
              PUNTO DE ORO
            </span>
          )}
          {isDeathSudden({ server: currentP1, receiver: currentP2 }, 7) && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
              MUERTE SÚBITA
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateGame("pair2", -1)}
            className="w-8 h-8 rounded bg-dark-700 text-white hover:bg-dark-600 flex items-center justify-center"
          >
            -
          </button>
          <span className="text-2xl font-bold text-white w-8 text-center">
            {currentP2}
          </span>
          <button
            onClick={() => updateGame("pair2", 1)}
            className="w-8 h-8 rounded bg-dark-700 text-white hover:bg-dark-600 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        {sets.pair1.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSet(i)}
            className={`px-3 py-1 rounded text-sm ${
              currentSet === i
                ? "bg-blue-600 text-white"
                : "bg-dark-700 text-dark-300 hover:bg-dark-600"
            }`}
          >
            Set {i + 1}
          </button>
        ))}
        {sets.pair1.length < 3 && (
          <button
            onClick={addSet}
            className="px-3 py-1 rounded text-sm bg-dark-700 text-dark-300 hover:bg-dark-600"
          >
            + Set
          </button>
        )}
      </div>

      <div className="flex justify-center gap-6 mb-6 text-sm">
        <div className="text-dark-400">
          Sets:{" "}
          <span className="text-white font-bold">
            {getSetsWon("pair1")} - {getSetsWon("pair2")}
          </span>
        </div>
        <div className="text-dark-400">
          Games:{" "}
          <span className="text-white font-bold">
            {getGamesWon("pair1")} - {getGamesWon("pair2")}
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleSave}>Guardar Resultado</Button>
      </div>
    </Card>
  );
}
