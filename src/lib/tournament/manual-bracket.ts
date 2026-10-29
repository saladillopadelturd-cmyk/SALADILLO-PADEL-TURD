import type { MatchStage } from "@/types/tournament";
import { getStageName } from "./elimination";

export interface ManualCoupleEntry {
  id: string; // couple_id
  name: string;
  zoneName?: string;
  zonePosition?: number;
  ranking?: number;
  action: "seed" | "play" | null;
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
  unpairedPlayCouple: ManualCoupleEntry | null;
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
 * Construye el cuadro de eliminación directa 100% manual con slots inicialmente VACÍOS:
 * - Genera el esqueleto completo de llaves según la cantidad de parejas del torneo.
 * - Todos los campos de cada llave inician VACÍOS.
 * - A medida que el administrador elige:
 *   - 'seed' (Sembrar): Ocupa la llave con pase libre (BYE) y avanza inmediatamente al slot de la siguiente instancia esperando rival.
 *   - 'play' (Jugar): Ocupa la primera ranura libre de un cruce. La siguiente pareja con 'play' completa el cruce rival.
 * - Si no hay elección ('null'), el campo permanece vacío.
 */
export function buildManualPlayoffBracket(
  orderedCouples: ManualCoupleEntry[],
  startingMatchNumber: number = 101
): ManualBracketResult {
  const totalEntries = orderedCouples.length;

  // 1. Determinar el tamaño de la llave según el total de parejas clasificadas
  // Potencia de 2 mayor o igual a totalEntries (mínimo 2 o 4)
  let initialSlots = 2;
  while (initialSlots < Math.max(totalEntries, 2)) {
    initialSlots *= 2;
  }
  initialSlots = Math.max(initialSlots, 2);

  // Etapas del cuadro completo
  const allStages = getStagesHierarchy(initialSlots);
  const initialStage = allStages[0];

  // 2. Crear el esqueleto completo de partidos con slots VACÍOS
  let curMatchNumber = startingMatchNumber;
  const previewRounds: PreviewRound[] = [];
  const matchesByStage: Map<MatchStage, PreviewMatch[]> = new Map();

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

  // 3. Poblar las llaves según las elecciones del administrador (arriba hacia abajo)
  const r1Matches = matchesByStage.get(initialStage) || [];
  let currentR1MatchIdx = 0;
  let waitingCouple: ManualCoupleEntry | null = null;
  let assignedCount = 0;

  for (const c of orderedCouples) {
    if (!c.action) continue; // Si es null, no ocupa slot todavía
    assignedCount++;

    if (c.action === "seed") {
      // Si había una pareja esperando rival de 'play', la sembrada no puede emparejarse con ella.
      // Buscamos el siguiente partido libre en R1
      if (currentR1MatchIdx < r1Matches.length) {
        const match = r1Matches[currentR1MatchIdx];
        match.couple1 = { id: c.id, name: c.name, isSeed: true };
        match.couple2 = { id: null, name: "BYE (Pase directo)", isBye: true };
        match.isBye = true;
        match.status = "completed";
        match.winnerId = c.id;

        // Propagar inmediatamente al slot correspondiente de la siguiente ronda
        if (allStages.length > 1) {
          const nextStage = allStages[1];
          const nextMatches = matchesByStage.get(nextStage) || [];
          const targetMatchIdx = Math.floor(currentR1MatchIdx / 2);
          const isSlot1 = currentR1MatchIdx % 2 === 0;

          if (targetMatchIdx < nextMatches.length) {
            const nextMatch = nextMatches[targetMatchIdx];
            const slotData: PreviewMatchCouple = {
              id: c.id,
              name: c.name,
              isSeed: true,
            };
            if (isSlot1) {
              nextMatch.couple1 = slotData;
            } else {
              nextMatch.couple2 = slotData;
            }
          }
        }

        currentR1MatchIdx++;
      }
    } else if (c.action === "play") {
      if (!waitingCouple) {
        // Primera pareja del cruce
        waitingCouple = c;
        if (currentR1MatchIdx < r1Matches.length) {
          const match = r1Matches[currentR1MatchIdx];
          match.couple1 = { id: c.id, name: c.name };
          match.couple2 = { id: null, name: "Esperando rival...", isWaiting: true };
          match.isBye = false;
          match.status = "pending";
        }
      } else {
        // Segunda pareja que completa el cruce
        if (currentR1MatchIdx < r1Matches.length) {
          const match = r1Matches[currentR1MatchIdx];
          match.couple2 = { id: c.id, name: c.name };
          match.isBye = false;
          match.status = "pending";

          // En la siguiente ronda, el slot correspondiente muestra el ganador esperado
          if (allStages.length > 1) {
            const nextStage = allStages[1];
            const nextMatches = matchesByStage.get(nextStage) || [];
            const targetMatchIdx = Math.floor(currentR1MatchIdx / 2);
            const isSlot1 = currentR1MatchIdx % 2 === 0;

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

          currentR1MatchIdx++;
        }
        waitingCouple = null;
      }
    }
  }

  // 4. Generar la lista de partidos reales a insertar en la base de datos
  // Solo se guardan los cruces que tengan al menos una acción (sembrada o jugada)
  // y las rondas subsiguientes conectadas.
  const matchesToInsert: MatchToInsert[] = [];

  // Recorrer todas las etapas
  for (const stage of allStages) {
    const stageMatches = matchesByStage.get(stage) || [];
    for (const m of stageMatches) {
      // Un partido se inserta si no está totalmente vacío
      const c1 = m.couple1.isEmpty ? null : m.couple1.id;
      const c2 = m.couple2.isEmpty || m.couple2.isWaiting || m.couple2.isBye ? null : m.couple2.id;
      const isMBye = m.isBye;

      // Si es de R1 y tiene alguna pareja o si es de rondas siguientes y alimenta a partidos
      const hasContent = !m.couple1.isEmpty || !m.couple2.isEmpty || m.couple1.isFeeder || m.couple2.isFeeder;

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
    unpairedPlayCouple: waitingCouple,
    totalEntries,
    assignedCount,
  };
}
