"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { isGoldenPoint, isDeathSudden } from "@/lib/tournament/american-system";
import type { ScoreData } from "@/types/tournament";
import { Plus, Minus, Trophy, Sparkles, AlertCircle } from "lucide-react";

interface ScoreInputProps {
  matchId: string;
  gameMode: "round_robin_diff" | "american_9games" | "american_2sets";
  pair1Name: string;
  pair2Name: string;
  onSave: (score1: ScoreData, score2: ScoreData) => void;
}

export default function ScoreInput({
  matchId: _matchId,
  gameMode: _gameMode,
  pair1Name,
  pair2Name,
  onSave,
}: ScoreInputProps) {
  void _matchId;
  void _gameMode;
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
    if (newVal >= 0 && newVal <= 15) {
      newSets[pair][currentSet] = newVal;
      setSets(newSets);
    }
  };

  const getGamesWon = (pair: "pair1" | "pair2") =>
    sets[pair].reduce((a, b) => a + b, 0);

  const getSetsWon = (pair: "pair1" | "pair2") =>
    sets[pair].filter((s, i) => s > sets[pair === "pair1" ? "pair2" : "pair1"][i]).length;

  const currentP1 = sets.pair1[currentSet] ?? 0;
  const currentP2 = sets.pair2[currentSet] ?? 0;
  const goldenPoint = isGoldenPoint(currentP1, currentP2);
  const suddenDeath = isDeathSudden({ server: currentP1, receiver: currentP2 }, 7);

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
    <Card className="p-5 sm:p-7 border border-dark-700/80 bg-gradient-to-b from-dark-900/95 via-dark-950/90 to-dark-950 shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
            Marcador de Cancha
          </h3>
        </div>

        {/* Set Navigator */}
        <div className="flex items-center gap-1.5 bg-dark-950 p-1 rounded-xl border border-dark-800">
          {sets.pair1.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSet(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentSet === i
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                  : "text-dark-400 hover:text-white"
              }`}
            >
              Set {i + 1}
            </button>
          ))}
          {sets.pair1.length < 3 && (
            <button
              type="button"
              onClick={addSet}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
            >
              + Set
            </button>
          )}
        </div>
      </div>

      {/* Special Situations Banners */}
      <div className="min-h-[38px] flex items-center justify-center gap-2 mb-4">
        {goldenPoint && (
          <div className="animate-pulse flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-md shadow-amber-400/20 text-xs sm:text-sm font-black tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>⭐ PUNTO DE ORO (40 - 40) - ¡SIN VENTAJA!</span>
          </div>
        )}
        {suddenDeath && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-xs sm:text-sm font-black tracking-wide">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>MUERTE SÚBITA (TIE-BREAK)</span>
          </div>
        )}
      </div>

      {/* Digital Electronic Scoreboard (Dual Panel) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Pair 1 Scoreboard Counter */}
        <div className="bg-dark-950 border border-dark-800 rounded-2xl p-4 flex flex-col items-center justify-between shadow-inner">
          <div className="w-full text-center pb-2 border-b border-dark-800/80 mb-3">
            <p className="text-white font-bold text-sm sm:text-base truncate px-2">
              {pair1Name}
            </p>
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
              Pareja 1
            </span>
          </div>

          {/* Large Electronic Digits and Touch +/- buttons */}
          <div className="flex items-center justify-center gap-4 my-2">
            <button
              type="button"
              onClick={() => updateGame("pair1", -1)}
              disabled={currentP1 <= 0}
              className="w-12 h-12 rounded-xl bg-dark-800 text-slate-200 hover:bg-dark-700 hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none border border-dark-700 flex items-center justify-center shadow-md transition-all cursor-pointer"
              aria-label="Restar punto Pareja 1"
            >
              <Minus className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Giant Score Digit */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-dark-900 border-2 border-dark-700 flex items-center justify-center shadow-inner">
              <span className="scoreboard-digit text-5xl sm:text-6xl font-black text-white">
                {currentP1}
              </span>
            </div>

            <button
              type="button"
              onClick={() => updateGame("pair1", 1)}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 active:scale-95 border border-emerald-400/30 flex items-center justify-center shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              aria-label="Sumar punto Pareja 1"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="mt-3 text-xs text-dark-400 font-medium">
            Games acumulados: <span className="text-emerald-400 font-bold">{getGamesWon("pair1")}</span>
          </div>
        </div>

        {/* Pair 2 Scoreboard Counter */}
        <div className="bg-dark-950 border border-dark-800 rounded-2xl p-4 flex flex-col items-center justify-between shadow-inner">
          <div className="w-full text-center pb-2 border-b border-dark-800/80 mb-3">
            <p className="text-white font-bold text-sm sm:text-base truncate px-2">
              {pair2Name}
            </p>
            <span className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider">
              Pareja 2
            </span>
          </div>

          {/* Large Electronic Digits and Touch +/- buttons */}
          <div className="flex items-center justify-center gap-4 my-2">
            <button
              type="button"
              onClick={() => updateGame("pair2", -1)}
              disabled={currentP2 <= 0}
              className="w-12 h-12 rounded-xl bg-dark-800 text-slate-200 hover:bg-dark-700 hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none border border-dark-700 flex items-center justify-center shadow-md transition-all cursor-pointer"
              aria-label="Restar punto Pareja 2"
            >
              <Minus className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Giant Score Digit */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-dark-900 border-2 border-dark-700 flex items-center justify-center shadow-inner">
              <span className="scoreboard-digit text-5xl sm:text-6xl font-black text-white">
                {currentP2}
              </span>
            </div>

            <button
              type="button"
              onClick={() => updateGame("pair2", 1)}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 active:scale-95 border border-blue-400/30 flex items-center justify-center shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              aria-label="Sumar punto Pareja 2"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="mt-3 text-xs text-dark-400 font-medium">
            Games acumulados: <span className="text-sky-400 font-bold">{getGamesWon("pair2")}</span>
          </div>
        </div>
      </div>

      {/* Match Totals Overview Bar */}
      <div className="flex flex-wrap items-center justify-around gap-4 bg-dark-900/90 border border-dark-800 p-3 rounded-xl mb-6">
        <div className="text-center">
          <span className="text-[11px] text-dark-400 uppercase tracking-wide block">
            Sets Ganados
          </span>
          <span className="scoreboard-digit text-lg font-black text-white">
            {getSetsWon("pair1")} <span className="text-dark-500">-</span> {getSetsWon("pair2")}
          </span>
        </div>
        <div className="h-8 w-px bg-dark-800 hidden sm:block" />
        <div className="text-center">
          <span className="text-[11px] text-dark-400 uppercase tracking-wide block">
            Games Totales
          </span>
          <span className="scoreboard-digit text-lg font-black text-white">
            {getGamesWon("pair1")} <span className="text-dark-500">-</span> {getGamesWon("pair2")}
          </span>
        </div>
        <div className="h-8 w-px bg-dark-800 hidden sm:block" />
        <div className="text-center">
          <span className="text-[11px] text-dark-400 uppercase tracking-wide block">
            Set Activo
          </span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-block mt-0.5">
            Set {currentSet + 1}
          </span>
        </div>
      </div>

      {/* Big Action Save Button */}
      <div className="flex justify-center">
        <Button
          variant="neon"
          size="lg"
          onClick={handleSave}
          className="w-full sm:w-auto sm:min-w-[260px] text-base"
        >
          Guardar Resultado Oficial
        </Button>
      </div>
    </Card>
  );
}

