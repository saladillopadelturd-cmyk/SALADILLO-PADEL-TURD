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
  matchIndex: number; // 0 a 15 (16 cruces de 16vos de final)
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
 * Las etapas canónicas del cuadro principal de eliminación:
 * 1. 16vos de Final (round_of_32): donde juegan las parejas para jugar
 * 2. 8vos de Final (round_of_16): donde aparecen las parejas sembradas
 * 3. Cuartos de Final (quarter)
 * 4. Semifinales (semi)
 * 5. Gran Final (final)
 */
export const OFFICIAL_STAGES: MatchStage[] = [
  "round_of_32",
  "round_of_16",
  "quarter",
  "semi",
  "final",
];

export const NUM_16VOS_MATCHES = 16;
export const NUM_8VOS_MATCHES = 8;
export const NUM_QUARTER_MATCHES = 4;
export const NUM_SEMI_MATCHES = 2;
export const NUM_FINAL_MATCHES = 1;

/**
 * Inicializa los 16 cruces de 16vos de final totalmente vacíos.
 */
export function initializeR1Slots(_totalCouplesCount?: number): AnchoredMatchSlot[] {
  const r1Slots: AnchoredMatchSlot[] = [];
  for (let i = 0; i < NUM_16VOS_MATCHES; i++) {
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
 * Asigna una pareja como SEMBRADA para que aparezca directamente en 8VOS DE FINAL.
 * En 16vos de final recibe pase libre (BYE) y en 8vos de final aparece en su cruce correspondiente esperando rival.
 * Por ningún motivo altera la ubicación de parejas colocadas previamente.
 */
export function assignSeedToSlots(
  currentSlots: AnchoredMatchSlot[],
  coupleId: string
): AnchoredMatchSlot[] {
  // 1. Si ya estaba asignada, liberamos su posición anterior sin tocar a nadie más
  const cleaned = removeCoupleFromSlots(currentSlots, coupleId);
  const nextSlots = cleaned.map((s) => ({ ...s }));

  // 2. Buscamos el primer cruce de 8vos disponible (preferentemente slot par de 16vos: 0, 2, 4, 6...)
  // para que ingrese en la ranura superior de 8vos de final
  let targetIdx = -1;

  // Prioridad 1: Cruce par de 16vos totalmente vacío (ranura superior de 8vos)
  for (let i = 0; i < NUM_16VOS_MATCHES; i += 2) {
    if (nextSlots[i].type === "empty") {
      targetIdx = i;
      break;
    }
  }

  // Prioridad 2: Si todos los pares están ocupados, cualquier cruce impar totalmente vacío
  if (targetIdx === -1) {
    for (let i = 1; i < NUM_16VOS_MATCHES; i += 2) {
      if (nextSlots[i].type === "empty") {
        targetIdx = i;
        break;
      }
    }
  }

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
 * Asigna una pareja para JUGAR en 16VOS DE FINAL.
 * Jugará su cruce en 16vos contra otra pareja marcada con 'Jugar'.
 * El ganador avanzará a 8vos de final para enfrentar a la pareja sembrada o al ganador de otra llave.
 * Por ningún motivo altera la ubicación de parejas colocadas previamente.
 */
export function assignPlayToSlots(
  currentSlots: AnchoredMatchSlot[],
  coupleId: string
): AnchoredMatchSlot[] {
  // 1. Si ya estaba asignada, liberamos su posición anterior
  const cleaned = removeCoupleFromSlots(currentSlots, coupleId);
  const nextSlots = cleaned.map((s) => ({ ...s }));

  // 2. Buscamos primero si hay algún cruce de 16vos de tipo "match" con pareja 1 asignada pero esperando rival
  const waitingMatchIdx = nextSlots.findIndex(
    (s) => s.type === "match" && s.couple1Id !== null && s.couple2Id === null
  );

  if (waitingMatchIdx !== -1) {
    // Se asigna como pareja 2 de ese mismo cruce de 16vos, manteniendo fija a la pareja 1
    nextSlots[waitingMatchIdx] = {
      ...nextSlots[waitingMatchIdx],
      couple2Id: coupleId,
    };
    return nextSlots;
  }

  // 3. Si no hay cruce esperando rival, buscamos el primer cruce de 16vos totalmente vacío
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

    // Si estaba sembrada
    if (slot.type === "seed") {
      return {
        ...slot,
        type: "empty",
        couple1Id: null,
        couple2Id: null,
      };
    }

    // Si estaba jugando en 16vos
    if (slot.type === "match") {
      if (slot.couple1Id === coupleId) {
        if (slot.couple2Id) {
          // Si había rival, el rival pasa a couple1Id y sigue esperando nuevo rival en el mismo cruce de 16vos
          return {
            ...slot,
            couple1Id: slot.couple2Id,
            couple2Id: null,
          };
        } else {
          // Si estaba sola, el cruce de 16vos vuelve a estar vacío
          return {
            ...slot,
            type: "empty",
            couple1Id: null,
            couple2Id: null,
          };
        }
      }

      if (slot.couple2Id === coupleId) {
        // Se quita couple2Id, couple1Id queda intacta esperando rival en el mismo cruce de 16vos
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
 * Construye la estructura completa del cuadro eliminatorio:
 * - 16vos de Final: partidos entre parejas que juegan
 * - 8vos de Final: parejas sembradas y ganadores de 16vos
 * - Cuartos de Final
 * - Semifinales
 * - Gran Final
 */
export function buildManualPlayoffBracketFromSlots(
  couplesMap: Map<string, { id: string; name: string }>,
  r1Slots: AnchoredMatchSlot[],
  totalCouplesCount: number,
  startingMatchNumber: number = 101
): ManualBracketResult {
  const allStages = OFFICIAL_STAGES;
  const initialStage: MatchStage = "round_of_32";

  let curMatchNumber = startingMatchNumber;
  const previewRounds: PreviewRound[] = [];
  const matchesByStage: Map<MatchStage, PreviewMatch[]> = new Map();

  // Cantidad fija de cruces por etapa
  const stageMatchCounts: Record<MatchStage, number> = {
    round_of_32: NUM_16VOS_MATCHES,
    round_of_16: NUM_8VOS_MATCHES,
    quarter: NUM_QUARTER_MATCHES,
    semi: NUM_SEMI_MATCHES,
    final: NUM_FINAL_MATCHES,
    zone: 0,
    third_place: 0,
  };

  // 1. Crear esqueleto vacío de todas las rondas de izquierda a derecha
  for (const stage of allStages) {
    const numMatches = stageMatchCounts[stage] || 1;
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
  }

  // 2. Poblar 16vos de Final y 8vos de Final
  const r16Matches = matchesByStage.get("round_of_32") || [];
  const r8Matches = matchesByStage.get("round_of_16") || [];
  const unpairedPlayCouples: string[] = [];
  let assignedCount = 0;

  for (let i = 0; i < r1Slots.length; i++) {
    const slot = r1Slots[i];
    if (i >= r16Matches.length) break;
    const match16 = r16Matches[i];

    const target8Idx = Math.floor(i / 2);
    const isSlot1In8 = i % 2 === 0;
    const match8 = r8Matches[target8Idx];

    if (slot.type === "empty") {
      match16.couple1 = { id: null, name: "Vacío", isEmpty: true };
      match16.couple2 = { id: null, name: "Vacío", isEmpty: true };
      match16.isBye = false;
      match16.status = "pending";
    } else if (slot.type === "seed" && slot.couple1Id) {
      // Pareja SEMBRADA:
      const c = couplesMap.get(slot.couple1Id);
      const cName = c?.name || "Pareja Sembrada";
      assignedCount++;

      // En 16vos: Cruce con BYE (pase directo a 8vos)
      match16.couple1 = { id: slot.couple1Id, name: cName, isSeed: true };
      match16.couple2 = { id: null, name: "BYE (Pase directo a 8vos)", isBye: true };
      match16.isBye = true;
      match16.status = "completed";
      match16.winnerId = slot.couple1Id;

      // En 8vos: APARECE DIRECTAMENTE EN 8VOS DE FINAL
      if (match8) {
        const slotData: PreviewMatchCouple = {
          id: slot.couple1Id,
          name: cName,
          isSeed: true,
        };
        if (isSlot1In8) {
          match8.couple1 = slotData;
        } else {
          match8.couple2 = slotData;
        }
      }
    } else if (slot.type === "match" && slot.couple1Id) {
      // Parejas para JUGAR en 16vos:
      const c1 = couplesMap.get(slot.couple1Id);
      const c1Name = c1?.name || "Pareja 1";
      assignedCount++;

      match16.couple1 = { id: slot.couple1Id, name: c1Name };
      match16.isBye = false;
      match16.status = "pending";

      if (slot.couple2Id) {
        const c2 = couplesMap.get(slot.couple2Id);
        const c2Name = c2?.name || "Pareja 2";
        assignedCount++;

        match16.couple2 = { id: slot.couple2Id, name: c2Name };

        // En 8vos: Ranura muestra al ganador esperado del partido de 16vos
        if (match8) {
          const slotData: PreviewMatchCouple = {
            id: null,
            name: `Ganador P#${match16.matchNumber} (16vos)`,
            isFeeder: true,
          };
          if (isSlot1In8) {
            match8.couple1 = slotData;
          } else {
            match8.couple2 = slotData;
          }
        }
      } else {
        match16.couple2 = { id: null, name: "Esperando rival en 16vos...", isWaiting: true };
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
          score_set1: isMBye ? "BYE (Pase directo a 8vos)" : null,
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
