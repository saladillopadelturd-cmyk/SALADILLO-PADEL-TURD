import type { MatchStage } from "@/types/tournament";

export interface QualifiedPair {
  pairId: string;
  zoneId?: string;
  zoneName: string;
  zonePosition: number; // 1 = primero de zona, 2 = segundo, 3 = tercero
  points: number;
  gameDifference: number;
  gamesWon?: number;
}

export interface PlayoffMatchSlot {
  matchNumber: number;
  stage: MatchStage;
  roundName: string;
  couple1Id: string | null;
  couple2Id: string | null;
  isBye: boolean;
  winnerCoupleId?: string | null;
  nextMatchIndex?: number;
}

export interface BracketRoundView {
  round: string;
  stage: MatchStage;
  matches: {
    pair1: string;
    pair2: string;
    winner?: string;
    score?: string;
  }[];
}

/**
 * Devuelve la potencia de 2 mayor o igual a n (4, 8, 16, 32...).
 */
export function getNextPowerOf2(n: number): number {
  let power = 2;
  while (power < n) {
    power *= 2;
  }
  return Math.max(power, 4); // Mínimo cuadro de 4 (semifinales)
}

/**
 * Traduce el número de slots a la etapa inicial correspondiente.
 */
export function getInitialStage(totalSlots: number): MatchStage {
  if (totalSlots >= 16) return "round_of_16";
  if (totalSlots >= 8) return "quarter";
  return "semi";
}

/**
 * Devuelve las etapas sucesivas del cuadro según el tamaño.
 */
export function getStagesSequence(totalSlots: number): MatchStage[] {
  if (totalSlots >= 16) return ["round_of_16", "quarter", "semi", "final"];
  if (totalSlots >= 8) return ["quarter", "semi", "final"];
  return ["semi", "final"];
}

export function getStageName(stage: MatchStage): string {
  switch (stage) {
    case "round_of_16":
      return "Octavos de Final";
    case "quarter":
      return "Cuartos de Final";
    case "semi":
      return "Semifinal";
    case "final":
      return "Final";
    default:
      return stage;
  }
}

/**
 * Normaliza las etiquetas de etapas de partido (en inglés o español)
 * a las constantes de tipo canónicas de MatchStage.
 */
export function normalizeStage(stage: MatchStage | string): MatchStage {
  switch (stage) {
    case "octavos":
    case "round_of_16":
      return "round_of_16";
    case "cuartos":
    case "quarter":
      return "quarter";
    case "semifinal":
    case "semi":
      return "semi";
    case "final":
      return "final";
    default:
      return stage as MatchStage;
  }
}

/**
 * Obtiene la etapa siguiente en el cuadro de eliminación directa.
 * Retorna null si la etapa actual es la Final o una fase no eliminatoria.
 */
export function getNextStage(stage: MatchStage | string): MatchStage | null {
  const norm = normalizeStage(stage);
  switch (norm) {
    case "round_of_16":
      return "quarter";
    case "quarter":
      return "semi";
    case "semi":
      return "final";
    default:
      return null;
  }
}

export interface NextPlayoffSlot {
  targetMatchId: string;
  slotField: "couple1_id" | "couple2_id";
  targetStage: MatchStage;
  targetMatchIndex: number;
}

/**
 * Determina a qué partido y a qué slot (couple1_id o couple2_id) de la siguiente ronda
 * debe avanzar la pareja ganadora de un partido de playoffs.
 * 
 * Regla Canónica de Cuadro Eliminatorio:
 * - Ronda N (k partidos, índices 0 a k-1) alimenta a Ronda N+1 (k/2 partidos).
 * - El ganador del partido i avanza al partido Math.floor(i / 2) de la siguiente ronda.
 * - Si i es par (i % 2 === 0), ingresa como couple1_id.
 * - Si i es impar (i % 2 === 1), ingresa como couple2_id.
 */
export function findNextPlayoffMatchSlot<
  T extends {
    id: string;
    stage: MatchStage | string;
    match_number?: number | null;
    created_at?: string;
  }
>(
  tournamentMatches: T[],
  currentMatch: { id: string; stage: MatchStage | string }
): NextPlayoffSlot | null {
  const currentNormStage = normalizeStage(currentMatch.stage);
  const nextStage = getNextStage(currentNormStage);
  if (!nextStage) return null;

  // Filtrar y ordenar partidos de la etapa actual
  const currentStageMatches = tournamentMatches
    .filter((m) => normalizeStage(m.stage) === currentNormStage)
    .sort((a, b) => {
      if (a.match_number != null && b.match_number != null && a.match_number !== b.match_number) {
        return a.match_number - b.match_number;
      }
      if (a.created_at && b.created_at && a.created_at !== b.created_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      return (a.id || "").localeCompare(b.id || "");
    });

  const currentIndex = currentStageMatches.findIndex((m) => m.id === currentMatch.id);
  if (currentIndex === -1) return null;

  // Filtrar y ordenar partidos de la etapa siguiente
  const nextStageMatches = tournamentMatches
    .filter((m) => normalizeStage(m.stage) === nextStage)
    .sort((a, b) => {
      if (a.match_number != null && b.match_number != null && a.match_number !== b.match_number) {
        return a.match_number - b.match_number;
      }
      if (a.created_at && b.created_at && a.created_at !== b.created_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      return (a.id || "").localeCompare(b.id || "");
    });

  if (nextStageMatches.length === 0) return null;

  const targetIndex = Math.floor(currentIndex / 2);
  if (targetIndex >= nextStageMatches.length) return null;

  const targetMatch = nextStageMatches[targetIndex];
  const slotField: "couple1_id" | "couple2_id" = currentIndex % 2 === 0 ? "couple1_id" : "couple2_id";

  return {
    targetMatchId: targetMatch.id,
    slotField,
    targetStage: nextStage,
    targetMatchIndex: targetIndex,
  };
}

/**
 * Cruce inteligente de Playoffs SPT:
 * - Clasificados ordenados por:
 *   1) Posición en zona (1°s primero, luego 2°s, luego 3°s).
 *   2) Mejor balance de puntos / games entre los de la misma posición.
 * - Regla FIP/SPT: Un 1° de zona NO debe cruzarse con el 2° de SU MISMA zona en la primera ronda.
 * - Los mejores 1° se colocan en extremos opuestos para ser cabezas de serie (Seeds 1, 2...).
 * - Si hay BYEs (totalSlots > clasificados), los BYEs se asignan prioritariamente a los mejores 1°s.
 */
export function generateSeededPlayoffBracket(
  qualifiedPairs: QualifiedPair[]
): {
  totalSlots: number;
  byesCount: number;
  firstRoundMatches: {
    couple1Id: string;
    couple2Id: string;
    isBye: boolean;
    advancingPairId?: string;
    description: string;
  }[];
  allStages: MatchStage[];
} {
  const count = qualifiedPairs.length;
  if (count < 2) {
    return { totalSlots: 2, byesCount: 0, firstRoundMatches: [], allStages: ["final"] };
  }

  const totalSlots = getNextPowerOf2(count);
  const byesCount = totalSlots - count;
  const allStages = getStagesSequence(totalSlots);

  // Separar y ordenar 1°s, 2°s y 3°s por mérito
  const firsts = qualifiedPairs
    .filter((p) => p.zonePosition === 1)
    .sort((a, b) => b.points - a.points || b.gameDifference - a.gameDifference);

  const seconds = qualifiedPairs
    .filter((p) => p.zonePosition === 2)
    .sort((a, b) => b.points - a.points || b.gameDifference - a.gameDifference);

  const thirds = qualifiedPairs
    .filter((p) => p.zonePosition >= 3)
    .sort((a, b) => b.points - a.points || b.gameDifference - a.gameDifference);

  const numMatchesFirstRound = totalSlots / 2;

  // Secuencia canónica de asignación de cabezas de serie para colocar
  // Seed 1 en la mitad superior y Seed 2 en la mitad inferior
  const getSeededMatchOrder = (numMatches: number): number[] => {
    if (numMatches <= 1) return [0];
    if (numMatches === 2) return [0, 1];
    if (numMatches === 4) return [0, 3, 2, 1];
    if (numMatches === 8) return [0, 7, 4, 3, 2, 5, 6, 1];
    // General para cualquier potencia de 2
    const order: number[] = [0, numMatches - 1];
    for (let step = numMatches / 2; step >= 1; step = Math.floor(step / 2)) {
      const currentLen = order.length;
      if (currentLen >= numMatches) break;
      for (let j = 0; j < currentLen && order.length < numMatches; j++) {
        const nextIdx = (order[j] + step) % numMatches;
        if (!order.includes(nextIdx)) {
          order.push(nextIdx);
        }
      }
    }
    return order;
  };

  const seedMatchIndices = getSeededMatchOrder(numMatchesFirstRound);

  // Estructura de partidos para cada slot
  const matchSlots: {
    couple1?: QualifiedPair;
    couple2?: QualifiedPair;
    isBye: boolean;
    advancingPairId?: string;
    description: string;
  }[] = Array.from({ length: numMatchesFirstRound }, () => ({
    isBye: false,
    description: "",
  }));

  // Asignar los cabezas de serie (1°s de zona) en las posiciones canónicas
  const seedsToPlace = [...firsts];
  const opponentsPool = [...seconds, ...thirds];

  // Si hay más slots que 1°s, rellenar semillas con los mejores 2°s
  const topSeeds: QualifiedPair[] = [];
  for (let i = 0; i < numMatchesFirstRound; i++) {
    if (seedsToPlace.length > 0) {
      topSeeds.push(seedsToPlace.shift()!);
    } else if (opponentsPool.length > 0) {
      topSeeds.push(opponentsPool.shift()!);
    }
  }

  // Colocar cada topSeed en su match según seedMatchIndices
  topSeeds.forEach((seed, seedRank) => {
    const matchIdx = seedMatchIndices[seedRank] ?? seedRank;
    matchSlots[matchIdx].couple1 = seed;
  });

  // Asignar BYEs prioritariamente a las mejores cabezas de serie
  const byeAssignedMatches = new Set<number>();
  for (let b = 0; b < byesCount; b++) {
    const matchIdx = seedMatchIndices[b];
    if (matchIdx !== undefined) {
      matchSlots[matchIdx].isBye = true;
      matchSlots[matchIdx].advancingPairId = matchSlots[matchIdx].couple1?.pairId;
      byeAssignedMatches.add(matchIdx);
    }
  }

  // Asignar los rivales restantes a los matches que no tienen BYE,
  // garantizando globalmente que no provengan de la misma zona en primera ronda.
  // Se utiliza un algoritmo de búsqueda por retroceso (backtracking) de 2 fases:
  // Fase 1: Búsqueda estricta de asignación con 0 cruces de la misma zona.
  // Fase 2: Fallback solo si matemáticamente es imposible evitar cruce (ej: más de la mitad de una sola zona).
  const nonByeSlots = matchSlots.filter((slot) => !slot.isBye);
  const used = new Array(opponentsPool.length).fill(false);
  const assignment: (QualifiedPair | undefined)[] = new Array(nonByeSlots.length).fill(undefined);

  function solveNoConflict(slotIdx: number): boolean {
    if (slotIdx === nonByeSlots.length) return true;

    const forbiddenZone = nonByeSlots[slotIdx].couple1?.zoneName;

    for (let i = 0; i < opponentsPool.length; i++) {
      if (!used[i] && opponentsPool[i].zoneName !== forbiddenZone) {
        used[i] = true;
        assignment[slotIdx] = opponentsPool[i];
        if (solveNoConflict(slotIdx + 1)) return true;
        used[i] = false;
        assignment[slotIdx] = undefined;
      }
    }

    return false;
  }

  function solveWithFallback(slotIdx: number): boolean {
    if (slotIdx === nonByeSlots.length) return true;

    for (let i = 0; i < opponentsPool.length; i++) {
      if (!used[i]) {
        used[i] = true;
        assignment[slotIdx] = opponentsPool[i];
        if (solveWithFallback(slotIdx + 1)) return true;
        used[i] = false;
        assignment[slotIdx] = undefined;
      }
    }

    return false;
  }

  const success = solveNoConflict(0);
  if (!success) {
    used.fill(false);
    assignment.fill(undefined);
    solveWithFallback(0);
  }

  nonByeSlots.forEach((slot, idx) => {
    slot.couple2 = assignment[idx];
  });

  const firstRoundMatches = matchSlots.map((slot) => {
    const c1 = slot.couple1;
    const c2 = slot.couple2;
    const c1Id = c1 ? c1.pairId : "BYE";
    const c2Id = slot.isBye ? "BYE" : c2 ? c2.pairId : "BYE";
    const advancingId = slot.isBye ? (c1 ? c1.pairId : c2?.pairId) : undefined;

    return {
      couple1Id: c1Id,
      couple2Id: c2Id,
      isBye: slot.isBye,
      advancingPairId: advancingId,
      description: `${c1?.zoneName ? `1° ${c1.zoneName}` : "Clasificado"} vs ${
        slot.isBye ? "BYE" : c2?.zoneName ? `2° ${c2.zoneName}` : "Clasificado"
      }`,
    };
  });

  return {
    totalSlots,
    byesCount,
    firstRoundMatches,
    allStages,
  };
}

/**
 * Función compatible con Bracket.tsx para renderizar visualmente el cuadro.
 */
export function generateEliminationBracket(
  qualifiedPairs: { pairId: string; zonePosition: number; zoneName: string }[]
): { round: string; matches: { pair1: string; pair2: string }[] }[] {
  const pairsWithStats: QualifiedPair[] = qualifiedPairs.map((p) => ({
    pairId: p.pairId,
    zoneName: p.zoneName,
    zonePosition: p.zonePosition,
    points: 0,
    gameDifference: 0,
  }));

  const bracketData = generateSeededPlayoffBracket(pairsWithStats);
  const rounds: { round: string; matches: { pair1: string; pair2: string }[] }[] = [];

  let currentMatches = bracketData.firstRoundMatches.map((m) => ({
    pair1: m.couple1Id,
    pair2: m.couple2Id,
  }));

  for (const stage of bracketData.allStages) {
    if (currentMatches.length === 0) break;

    rounds.push({
      round: stage,
      matches: currentMatches,
    });

    const nextMatches: { pair1: string; pair2: string }[] = [];
    for (let i = 0; i < currentMatches.length; i += 2) {
      nextMatches.push({
        pair1: `Ganador M${i + 1}`,
        pair2: `Ganador M${i + 2}`,
      });
    }
    currentMatches = nextMatches;
  }

  return rounds;
}

/**
 * Genera todos los cruces round-robin para parejas de una zona.
 */
export function generateRoundRobinMatches(pairIds: string[]): { pair1: string; pair2: string }[] {
  const matches: { pair1: string; pair2: string }[] = [];
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      matches.push({ pair1: pairIds[i], pair2: pairIds[j] });
    }
  }
  return matches;
}
