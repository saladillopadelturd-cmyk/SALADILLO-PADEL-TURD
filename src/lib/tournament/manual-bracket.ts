import type { MatchStage } from "@/types/tournament";
import { getStageName } from "./elimination";

export interface ManualCoupleEntry {
  id: string; // couple_id
  name: string;
  zoneName?: string;
  zonePosition?: number;
  ranking?: number;
  action?: "seed" | "play" | null;
}

export interface AnchoredMatchSlot {
  matchIndex: number; // 0, 1, 2, ...
  type: "empty" | "seed" | "match";
  couple1Id: string | null;
  couple2Id: string | null;
}

export interface PreviewMatchCouple {
  id: string | null;
  name: string;
  isEmpty?: boolean;
  isWaiting?: boolean;
  isBye?: boolean;
  isSeed?: boolean;
  isFeeder?: boolean;
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
  unpairedPlayCouples: string[];
  totalEntries: number;
  assignedCount: number;
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
 * Calcula la potencia de 2 para el bracket según el número total de parejas.
 */
export function calculateBracketSlots(totalCount: number): number {
  let initialSlots = 2;
  while (initialSlots < Math.max(totalCount, 2)) {
    initialSlots *= 2;
  }
  return Math.max(initialSlots, 2);
}

/**
 * Inicializa los slots anclados de la ronda 1 totalmente vacíos.
 */
export function initializeR1Slots(totalCouplesCount: number): AnchoredMatchSlot[] {
  const slots = calculateBracketSlots(totalCouplesCount);
  const numMatches = Math.max(1, slots / 2);
  const r1Slots: AnchoredMatchSlot[] = [];

  for (let i = 0; i < numMatches; i++) {
    r1Slots.push({
      matchIndex: i,
      type: "empty",
      couple1Id: null,
      couple2Id: null,
    });
  }

  return r1Slots;
}

/**
 * Asigna una pareja como SEMBRADA en el primer slot disponible sin alterar otros slots.
 */
export function assignSeedToSlots(
  currentSlots: AnchoredMatchSlot[],
  coupleId: string
): AnchoredMatchSlot[] {
  // 1. Si ya estaba asignada, primero liberamos su posición anterior sin tocar a nadie más
  const cleaned = removeCoupleFromSlots(currentSlots, coupleId);

  // 2. Buscamos el primer slot totalmente vacío
  const nextSlots = cleaned.map((s) => ({ ...s }));
  const targetIdx = nextSlots.findIndex((s) => s.type === "empty");

  if (targetIdx !== -1) {
    nextSlots[targetIdx] = {
      ...nextSlots[targetIdx],
      type: "seed",
      couple1Id: coupleId,
      couple2Id: null,
    };
  }

  return nextSlots;
}

/**
 * Asigna una pareja para JUGAR en el primer slot disponible (completando un cruce o abriendo uno nuevo)
 * SIN alterar la ubicación de parejas colocadas previamente.
 */
export function assignPlayToSlots(
  currentSlots: AnchoredMatchSlot[],
  coupleId: string
): AnchoredMatchSlot[] {
  // 1. Si ya estaba asignada, liberamos su posición anterior
  const cleaned = removeCoupleFromSlots(currentSlots, coupleId);
  const nextSlots = cleaned.map((s) => ({ ...s }));

  // 2. Buscamos primero si hay algún cruce de tipo "match" con pareja 1 asignada pero esperando rival
  const waitingMatchIdx = nextSlots.findIndex(
    (s) => s.type === "match" && s.couple1Id !== null && s.couple2Id === null
  );

  if (waitingMatchIdx !== -1) {
    // Se asigna como pareja 2 de ese mismo cruce, manteniendo a pareja 1 en su posición fija
    nextSlots[waitingMatchIdx] = {
      ...nextSlots[waitingMatchIdx],
      couple2Id: coupleId,
    };
    return nextSlots;
  }

  // 3. Si no hay cruce esperando rival, buscamos el primer slot totalmente vacío
  const emptyMatchIdx = nextSlots.findIndex((s) => s.type === "empty");
  if (emptyMatchIdx !== -1) {
    nextSlots[emptyMatchIdx] = {
      ...nextSlots[emptyMatchIdx],
      type: "match",
      couple1Id: coupleId,
      couple2Id: null,
    };
  }

  return nextSlots;
}

/**
 * Elimina una pareja específica de los slots de la llave (al presionar la 'X').
 * Por ningún motivo altera la ubicación de ninguna otra pareja en la llave.
 */
export function removeCoupleFromSlots(
  currentSlots: AnchoredMatchSlot[],
  coupleId: string
): AnchoredMatchSlot[] {
  return currentSlots.map((slot) => {
    // Si no contiene a la pareja, queda exactamente igual
    if (slot.couple1Id !== coupleId && slot.couple2Id !== coupleId) {
      return slot;
    }

    // Si estaba sembrada en este slot
    if (slot.type === "seed") {
      return {
        ...slot,
        type: "empty",
        couple1Id: null,
        couple2Id: null,
      };
    }

    // Si estaba jugando
    if (slot.type === "match") {
      if (slot.couple1Id === coupleId) {
        if (slot.couple2Id) {
          // Si había rival, el rival pasa a couple1Id y espera nuevo rival en este mismo cruce fijo
          return {
            ...slot,
            couple1Id: slot.couple2Id,
            couple2Id: null,
          };
        } else {
          // Si estaba sola, el cruce vuelve a estar vacío
          return {
            ...slot,
            type: "empty",
            couple1Id: null,
            couple2Id: null,
          };
        }
      }

      if (slot.couple2Id === coupleId) {
        // Se quita couple2Id, couple1Id queda intacta esperando rival en el mismo cruce
        return {
          ...slot,
          couple2Id: null,
        };
      }
    }

    return slot;
  });
}

/**
 * Construye la estructura completa del cuadro (todas las rondas de izquierda a derecha)
 * a partir del estado ANCLADO de los slots de Ronda 1.
 */
export function buildManualPlayoffBracketFromSlots(
  couplesMap: Map<string, { id: string; name: string }>,
  r1Slots: AnchoredMatchSlot[],
  totalCouplesCount: number,
  startingMatchNumber: number = 101
): ManualBracketResult {
  const initialSlots = calculateBracketSlots(totalCouplesCount);
  const allStages = getStagesHierarchy(initialSlots);
  const initialStage = allStages[0];

  let curMatchNumber = startingMatchNumber;
  const previewRounds: PreviewRound[] = [];
  const matchesByStage: Map<MatchStage, PreviewMatch[]> = new Map();

  // 1. Crear esqueleto de todas las rondas
  let slotsInStage = initialSlots;
  for (let sIdx = 0; sIdx < allStages.length; sIdx++) {
    const stage = allStages[sIdx];
    const numMatches = Math.max(1, slotsInStage / 2);
    const stageMatches: PreviewMatch[] = [];

    for (let mIdx = 0; mIdx < numMatches; mIdx++) {
      const matchNum = curMatchNumber++;
      stageMatches.push({
        matchNumber: matchNum,
        stage,
        couple1: { id: null, name: "Vacío", isEmpty: true },
        couple2: { id: null, name: "Vacío", isEmpty: true },
        isBye: false,
        status: "pending",
      });
    }

    matchesByStage.set(stage, stageMatches);
    previewRounds.push({
      stage,
      stageName: getStageName(stage),
      matches: stageMatches,
    });

    slotsInStage = numMatches;
  }

  // 2. Poblar Ronda 1 según el estado anclado de r1Slots
  const r1Matches = matchesByStage.get(initialStage) || [];
  const unpairedPlayCouples: string[] = [];
  let assignedCount = 0;

  for (let i = 0; i < r1Slots.length; i++) {
    const slot = r1Slots[i];
    if (i >= r1Matches.length) break;
    const match = r1Matches[i];

    if (slot.type === "empty") {
      match.couple1 = { id: null, name: "Vacío", isEmpty: true };
      match.couple2 = { id: null, name: "Vacío", isEmpty: true };
      match.isBye = false;
      match.status = "pending";
    } else if (slot.type === "seed" && slot.couple1Id) {
      const c = couplesMap.get(slot.couple1Id);
      const cName = c?.name || "Pareja Sembrada";
      assignedCount++;

      match.couple1 = { id: slot.couple1Id, name: cName, isSeed: true };
      match.couple2 = { id: null, name: "BYE (Pase directo)", isBye: true };
      match.isBye = true;
      match.status = "completed";
      match.winnerId = slot.couple1Id;

      // Propagar inmediatamente al slot de la siguiente instancia (R2)
      if (allStages.length > 1) {
        const nextStage = allStages[1];
        const nextMatches = matchesByStage.get(nextStage) || [];
        const targetMatchIdx = Math.floor(i / 2);
        const isSlot1 = i % 2 === 0;

        if (targetMatchIdx < nextMatches.length) {
          const nextMatch = nextMatches[targetMatchIdx];
          const slotData: PreviewMatchCouple = {
            id: slot.couple1Id,
            name: cName,
            isSeed: true,
          };
          if (isSlot1) {
            nextMatch.couple1 = slotData;
          } else {
            nextMatch.couple2 = slotData;
          }
        }
      }
    } else if (slot.type === "match" && slot.couple1Id) {
      const c1 = couplesMap.get(slot.couple1Id);
      const c1Name = c1?.name || "Pareja 1";
      assignedCount++;

      match.couple1 = { id: slot.couple1Id, name: c1Name };
      match.isBye = false;
      match.status = "pending";

      if (slot.couple2Id) {
        const c2 = couplesMap.get(slot.couple2Id);
        const c2Name = c2?.name || "Pareja 2";
        assignedCount++;

        match.couple2 = { id: slot.couple2Id, name: c2Name };

        // En la siguiente ronda, el slot muestra el ganador esperado
        if (allStages.length > 1) {
          const nextStage = allStages[1];
          const nextMatches = matchesByStage.get(nextStage) || [];
          const targetMatchIdx = Math.floor(i / 2);
          const isSlot1 = i % 2 === 0;

          if (targetMatchIdx < nextMatches.length) {
            const nextMatch = nextMatches[targetMatchIdx];
            const slotData: PreviewMatchCouple = {
              id: null,
              name: `Ganador P#${match.matchNumber}`,
              isFeeder: true,
            };
            if (isSlot1) {
              nextMatch.couple1 = slotData;
            } else {
              nextMatch.couple2 = slotData;
            }
          }
        }
      } else {
        match.couple2 = { id: null, name: "Esperando rival...", isWaiting: true };
        unpairedPlayCouples.push(slot.couple1Id);
      }
    }
  }

  // 3. Generar la lista de partidos a insertar en la base de datos
  const matchesToInsert: MatchToInsert[] = [];

  for (const stage of allStages) {
    const stageMatches = matchesByStage.get(stage) || [];
    for (const m of stageMatches) {
      const c1 = m.couple1.isEmpty ? null : m.couple1.id;
      const c2 = m.couple2.isEmpty || m.couple2.isWaiting || m.couple2.isBye ? null : m.couple2.id;
      const isMBye = m.isBye;

      const hasContent =
        !m.couple1.isEmpty || !m.couple2.isEmpty || m.couple1.isFeeder || m.couple2.isFeeder;

      if (hasContent) {
        matchesToInsert.push({
          stage,
          match_number: m.matchNumber,
          couple1_id: c1,
          couple2_id: c2,
          winner_couple_id: isMBye ? m.winnerId ?? c1 : null,
          score_set1: isMBye ? "BYE (Pasa de ronda)" : null,
          status: isMBye ? "completed" : "pending",
        });
      }
    }
  }

  return {
    initialStage,
    allStages,
    matchesToInsert,
    previewRounds,
    unpairedPlayCouples,
    totalEntries: totalCouplesCount,
    assignedCount,
  };
}

/**
 * Función puente compatible que construye slots anclados a partir de un array de parejas.
 */
export function buildManualPlayoffBracket(
  orderedCouples: ManualCoupleEntry[],
  startingMatchNumber: number = 101
): ManualBracketResult & { unpairedPlayCouple: ManualCoupleEntry | null } {
  let r1Slots = initializeR1Slots(orderedCouples.length);
  const couplesMap = new Map<string, { id: string; name: string }>();

  orderedCouples.forEach((c) => {
    couplesMap.set(c.id, { id: c.id, name: c.name });
  });

  for (const c of orderedCouples) {
    if (c.action === "seed") {
      r1Slots = assignSeedToSlots(r1Slots, c.id);
    } else if (c.action === "play") {
      r1Slots = assignPlayToSlots(r1Slots, c.id);
    }
  }

  const result = buildManualPlayoffBracketFromSlots(
    couplesMap,
    r1Slots,
    orderedCouples.length,
    startingMatchNumber
  );

  const unpairedCoupleObj =
    result.unpairedPlayCouples.length > 0
      ? orderedCouples.find((c) => c.id === result.unpairedPlayCouples[0]) || null
      : null;

  return {
    ...result,
    unpairedPlayCouple: unpairedCoupleObj,
  };
}
