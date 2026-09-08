import type { Match, Pair, ZoneStanding } from "@/types/tournament";

interface QualifiedPair {
  pairId: string;
  zonePosition: number;
  zoneName: string;
}

export function generateEliminationBracket(
  qualifiedPairs: QualifiedPair[]
): { round: string; matches: { pair1: string; pair2: string }[] }[] {
  const totalSlots = getNextPowerOf2(qualifiedPairs.length);

  const seeded = seedPairs(qualifiedPairs, totalSlots);

  const rounds: { round: string; matches: { pair1: string; pair2: string }[] }[] = [];

  const roundNames = getRoundNames(totalSlots);

  let currentMatches: { pair1: string; pair2: string }[] = [];

  for (let i = 0; i < seeded.length; i += 2) {
    if (seeded[i].pairId === "BYE" && seeded[i + 1]?.pairId === "BYE") continue;
    currentMatches.push({
      pair1: seeded[i].pairId,
      pair2: seeded[i + 1]?.pairId ?? "BYE",
    });
  }

  let matchIndex = 0;
  for (const roundName of roundNames) {
    if (currentMatches.length === 0) break;

    rounds.push({
      round: roundName,
      matches: currentMatches.map((m, i) => ({
        ...m,
      })),
    });

    const nextMatches: { pair1: string; pair2: string }[] = [];
    for (let i = 0; i < currentMatches.length; i += 2) {
      nextMatches.push({
        pair1: `winner_${roundName}_${i}`,
        pair2: `winner_${roundName}_${i + 1}`,
      });
    }
    currentMatches = nextMatches;
  }

  return rounds;
}

function getNextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

function seedPairs(pairs: QualifiedPair[], totalSlots: number): { pairId: string; seed: number }[] {
  const seeded: { pairId: string; seed: number }[] = [];

  const sorted = [...pairs].sort((a, b) => a.zonePosition - b.zonePosition);

  for (let i = 0; i < totalSlots; i++) {
    if (i < sorted.length) {
      seeded[i] = { pairId: sorted[i].pairId, seed: i + 1 };
    } else {
      seeded[i] = { pairId: "BYE", seed: 0 };
    }
  }

  return seeded;
}

function getRoundNames(totalSlots: number): string[] {
  const names: string[] = [];
  let slots = totalSlots;

  if (slots >= 16) names.push("octavos");
  if (slots >= 8) names.push("cuartos");
  names.push("semifinal");
  names.push("final");

  return names;
}

export function generateRoundRobinMatches(pairIds: string[]): { pair1: string; pair2: string }[] {
  const matches: { pair1: string; pair2: string }[] = [];

  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      matches.push({ pair1: pairIds[i], pair2: pairIds[j] });
    }
  }

  return matches;
}
