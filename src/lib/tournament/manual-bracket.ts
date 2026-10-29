import type { MatchStage } from "@/types/tournament";
import { getStageName, normalizeStage } from "./elimination";

export interface ManualCoupleEntry {
  id: string; // couple_id
  name: string;
  zoneName?: string;
  zonePosition?: number;
  ranking?: number;
  action: "seed" | "play";
}

export interface PreviewMatchCouple {
  id: string | null;
  name: string;
  isBye?: boolean;
  isSeed?: boolean;
}

export interface PreviewMatch {
  matchNumber: number;
  stage: MatchStage;
  couple1: PreviewMatchCouple;
  couple2: PreviewMatchCouple;
  isBye: boolean;
  status: "pending" | "completed";
  winnerId?: string | null;
  originatingMatch1Number?: number;
  originatingMatch2Number?: number;
}

export interface PreviewRound {
  stage: MatchStage;
  stageName: string;
  matches: PreviewMatch[];
}

export interface MatchToInsert {
  stage: MatchStage;
  match_number: number;
  couple1_id: string | null;
  couple2_id: string | null;
  winner_couple_id: string | null;
  score_set1: string | null;
  status: "pending" | "completed";
}

export interface ManualBracketResult {
  initialStage: MatchStage;
  allStages: MatchStage[];
  matchesToInsert: MatchToInsert[];
  previewRounds: PreviewRound[];
  unpairedPlayCouple: ManualCoupleEntry | null;
  totalEntries: number;
}

/**
 * Retorna las etapas eliminatorias según el número de slots en la etapa inicial.
 */
export function getStagesHierarchy(initialSlots: number): MatchStage[] {
  if (initialSlots >= 32) {
    return ["round_of_32", "round_of_16", "quarter", "semi", "final"];
  }
  if (initialSlots >= 16) {
    return ["round_of_16", "quarter", "semi", "final"];
  }
  if (initialSlots >= 8) {
    return ["quarter", "semi", "final"];
  }
  if (initialSlots >= 4) {
    return ["semi", "final"];
  }
  return ["final"];
}

/**
 * Construye el cuadro de eliminación directa 100% manual:
 * - Recorre la lista de duplas de arriba hacia abajo.
 * - Dupla 'seed' (Sembrar): Recibe pase directo / BYE en la ronda inicial y avanza a la siguiente ronda esperando rival.
 * - Dupla 'play' (Jugar): Juega contra la próxima dupla marcada con 'play'.
 * - El orden secuencial de arriba hacia abajo determina la disposición exacta de los cruces de llaves.
 */
export function buildManualPlayoffBracket(
  orderedCouples: ManualCoupleEntry[],
  startingMatchNumber: number = 101
): ManualBracketResult {
  // 1. Procesar la lista de arriba hacia abajo identificando Sembradas y Partidos Jugados
  type Branch =
    | { type: "seed"; couple: ManualCoupleEntry }
    | { type: "play_match"; couple1: ManualCoupleEntry; couple2: ManualCoupleEntry };

  const branches: Branch[] = [];
  let pendingPlayCouple: ManualCoupleEntry | null = null;

  for (const c of orderedCouples) {
    if (c.action === "seed") {
      // Si había una pareja esperando rival de 'play', la sembrada no puede emparejarse con ella
      branches.push({ type: "seed", couple: c });
    } else {
      if (!pendingPlayCouple) {
        pendingPlayCouple = c;
      } else {
        branches.push({ type: "play_match", couple1: pendingPlayCouple, couple2: c });
        pendingPlayCouple = null;
      }
    }
  }

  const numBranches = branches.length;
  if (numBranches === 0) {
    return {
      initialStage: "final",
      allStages: ["final"],
      matchesToInsert: [],
      previewRounds: [],
      unpairedPlayCouple: pendingPlayCouple,
      totalEntries: orderedCouples.length,
    };
  }

  // 2. Determinar el tamaño de la llave y las etapas correspondientes
  // Cada branch representa una posición de entrada a la siguiente etapa (Ronda 2)
  // o si sólo hay 1 branch de play_match sin sembradas, es una final directa.
  let initialSlots = 2;
  while (initialSlots < numBranches) {
    initialSlots *= 2;
  }
  initialSlots = Math.max(initialSlots, 2);

  // Si todas son ramas y hay partidos preliminares, la Ronda 1 (preliminar) tiene 'initialSlots * 2' o 'initialSlots'
  // Ejemplo: si hay 4 branches (ej: 2 sembradas y 2 partidos), la Ronda 2 tiene 4 slots (Semifinales).
  // La Ronda 1 es Cuartos de Final (8 slots virtuales, 4 partidos de R1).
  const hasPlayMatches = branches.some((b) => b.type === "play_match");
  const hasSeeds = branches.some((b) => b.type === "seed");

  // Si no hay sembradas y solo hay 1 partido jugado -> final directa
  let allStages: MatchStage[];
  if (!hasSeeds && branches.length === 1 && branches[0].type === "play_match") {
    allStages = ["final"];
  } else if (!hasPlayMatches) {
    // Si todas son sembradas (raro, pero posible en tests)
    allStages = getStagesHierarchy(initialSlots);
  } else {
    // Ronda 1 contiene los partidos preliminares y los BYEs de las sembradas.
    // Ronda 2 es donde se enfrentan las sembradas con los ganadores de Ronda 1.
    const r1Slots = initialSlots * 2;
    allStages = getStagesHierarchy(r1Slots);
  }

  const initialStage = allStages[0];
  let curMatchNumber = startingMatchNumber;

  const matchesToInsert: MatchToInsert[] = [];
  const previewRounds: PreviewRound[] = [];

  // 3. Ronda 1 (Ronda Inicial)
  // Cada branch genera un cruce de R1:
  // - Si es 'seed': partido BYE (couple1 = couple, couple2 = null, winner = couple, status = completed)
  // - Si es 'play_match': partido normal (couple1, couple2, status = pending)
  const r1Matches: PreviewMatch[] = [];
  const r1BranchFeeders: { advancingId: string | null; advancingName: string; isSeed: boolean }[] = [];

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const matchNum = curMatchNumber++;

    if (branch.type === "seed") {
      matchesToInsert.push({
        stage: initialStage,
        match_number: matchNum,
        couple1_id: branch.couple.id,
        couple2_id: null,
        winner_couple_id: branch.couple.id,
        score_set1: "BYE (Pasa de ronda)",
        status: "completed",
      });

      r1Matches.push({
        matchNumber: matchNum,
        stage: initialStage,
        couple1: { id: branch.couple.id, name: branch.couple.name, isSeed: true },
        couple2: { id: null, name: "BYE (Pase directo)", isBye: true },
        isBye: true,
        status: "completed",
        winnerId: branch.couple.id,
      });

      r1BranchFeeders.push({
        advancingId: branch.couple.id,
        advancingName: branch.couple.name,
        isSeed: true,
      });
    } else {
      matchesToInsert.push({
        stage: initialStage,
        match_number: matchNum,
        couple1_id: branch.couple1.id,
        couple2_id: branch.couple2.id,
        winner_couple_id: null,
        score_set1: null,
        status: "pending",
      });

      r1Matches.push({
        matchNumber: matchNum,
        stage: initialStage,
        couple1: { id: branch.couple1.id, name: branch.couple1.name },
        couple2: { id: branch.couple2.id, name: branch.couple2.name },
        isBye: false,
        status: "pending",
      });

      r1BranchFeeders.push({
        advancingId: null,
        advancingName: `Ganador P#${matchNum}`,
        isSeed: false,
      });
    }
  }

  previewRounds.push({
    stage: initialStage,
    stageName: getStageName(initialStage),
    matches: r1Matches,
  });

  // 4. Rondas Subsiguientes (Ronda 2 hasta la Final)
  // Cada ronda sucesiva toma de a 2 los feeders de la ronda anterior
  let currentFeeders = r1BranchFeeders;

  for (let sIdx = 1; sIdx < allStages.length; sIdx++) {
    const stage = allStages[sIdx];
    const numMatchesInStage = Math.max(1, Math.ceil(currentFeeders.length / 2));
    const nextFeeders: { advancingId: string | null; advancingName: string; isSeed: boolean }[] = [];
    const stageMatches: PreviewMatch[] = [];

    for (let mIdx = 0; mIdx < numMatchesInStage; mIdx++) {
      const f1 = currentFeeders[mIdx * 2];
      const f2 = currentFeeders[mIdx * 2 + 1];
      const matchNum = curMatchNumber++;

      const c1Id = f1 ? f1.advancingId : null;
      const c1Name = f1 ? (f1.advancingId ? f1.advancingName : f1.advancingName) : "Por definir";

      const c2Id = f2 ? f2.advancingId : null;
      const c2Name = f2 ? (f2.advancingId ? f2.advancingName : f2.advancingName) : "Por definir";

      matchesToInsert.push({
        stage,
        match_number: matchNum,
        couple1_id: c1Id,
        couple2_id: c2Id,
        winner_couple_id: null,
        score_set1: null,
        status: "pending",
      });

      stageMatches.push({
        matchNumber: matchNum,
        stage,
        couple1: {
          id: c1Id,
          name: c1Name,
          isSeed: f1?.isSeed,
        },
        couple2: {
          id: c2Id,
          name: c2Name,
          isSeed: f2?.isSeed,
        },
        isBye: false,
        status: "pending",
        originatingMatch1Number: r1Matches[mIdx * 2]?.matchNumber,
        originatingMatch2Number: r1Matches[mIdx * 2 + 1]?.matchNumber,
      });

      nextFeeders.push({
        advancingId: null,
        advancingName: `Ganador P#${matchNum}`,
        isSeed: false,
      });
    }

    previewRounds.push({
      stage,
      stageName: getStageName(stage),
      matches: stageMatches,
    });

    currentFeeders = nextFeeders;
  }

  return {
    initialStage,
    allStages,
    matchesToInsert,
    previewRounds,
    unpairedPlayCouple: pendingPlayCouple,
    totalEntries: orderedCouples.length,
  };
}
