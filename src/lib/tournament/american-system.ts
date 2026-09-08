import type { ScoreData } from "@/types/tournament";

export interface AmericanoResult {
  gamesWon: number;
  gamesLost: number;
  winner: "pair1" | "pair2" | "draw";
}

export function calculateAmericano9Games(
  score1: ScoreData,
  score2: ScoreData
): AmericanoResult {
  const g1 = score1.games_won;
  const g2 = score2.games_won;

  if (g1 > g2) return { gamesWon: g1, gamesLost: g2, winner: "pair1" };
  if (g2 > g1) return { gamesWon: g2, gamesLost: g1, winner: "pair2" };
  return { gamesWon: g1, gamesLost: g2, winner: "draw" };
}

export function calculateTwoSetsScore(
  score1: ScoreData,
  score2: ScoreData
): { setsWon: number; setsLost: number; winner: "pair1" | "pair2" | "draw" } {
  const sets1 = score1.sets ?? [];
  const sets2 = score2.sets ?? [];

  let setsWon1 = 0;
  let setsWon2 = 0;

  for (let i = 0; i < Math.min(sets1.length, sets2.length); i++) {
    if (sets1[i] > sets2[i]) setsWon1++;
    else if (sets2[i] > sets1[i]) setsWon2++;
  }

  if (setsWon1 > setsWon2) return { setsWon: setsWon1, setsLost: setsWon2, winner: "pair1" };
  if (setsWon2 > setsWon1) return { setsWon: setsWon2, setsLost: setsWon1, winner: "pair2" };
  return { setsWon: setsWon1, setsLost: setsWon2, winner: "draw" };
}

export function isGoldenPoint(gameScore: { server: number; receiver: number }): boolean {
  return gameScore.server >= 40 && gameScore.receiver >= 40 && gameScore.server === gameScore.receiver;
}

export function getGoldenPointText(): string {
  return "Punto de Oro";
}

export function isMatchPoint(
  currentScore: { server: number; receiver: number },
  gamesWon: number,
  gamesLost: number,
  isTiebreak: boolean
): boolean {
  if (isTiebreak) {
    const total = currentScore.server + currentScore.receiver;
    return total >= 6 && Math.abs(currentScore.server - currentScore.receiver) >= 1;
  }
  return gamesWon >= 5 && gamesWon - gamesLost >= 1;
}

export function isDeathSudden(
  currentScore: { server: number; receiver: number },
  requiredPoints: number
): boolean {
  return currentScore.server >= requiredPoints - 1 && currentScore.receiver >= requiredPoints - 1;
}

export function getDeathSuddenText(): string {
  return "MUERTE SÚBITA";
}
