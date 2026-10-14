import type { Match, MatchStage } from "@/types/tournament";

export interface AutoScheduleOptions {
  courtCount: number;
  courtNames?: string[];
  matchDurationMinutes: number;
  startDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm", ej. "09:00"
  breakBetweenMinutes?: number;
  onlyUnscheduled?: boolean;
  stageFilter?: "all" | "zone" | "playoff";
}

export interface ScheduledMatchAssignment {
  matchId: string;
  courtName: string;
  scheduledTime: string; // Formato ISO para base de datos TIMESTAMPTZ
  slotIndex: number;
}

export interface AutoScheduleResult {
  assignments: ScheduledMatchAssignment[];
  totalMatches: number;
  totalSlots: number;
  estimatedDurationMinutes: number;
  startTime: string;
  estimatedEndTime: string;
  courtsUsed: string[];
}

/**
 * Orden jerárquico de fases para asegurar que las fases previas se programen antes.
 */
const STAGE_ORDER: Record<string, number> = {
  zone: 0,
  round_of_32: 1,
  round_of_16: 2,
  quarter: 3,
  semi: 4,
  third_place: 5,
  final: 6,
};

/**
 * Parsea una fecha YYYY-MM-DD y una hora HH:mm a un objeto Date local.
 */
export function parseStartDateTime(startDate: string, startTime: string): Date {
  const [year, month, day] = startDate.split("-").map(Number);
  const [hours, minutes] = startTime.split(":").map(Number);
  // Usar mes 0-indexado
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
}

/**
 * Normaliza un valor de horario ingresado manualmente por el admin
 * para que siempre sea aceptado por columnas TIMESTAMPTZ de Postgres.
 */
export function normalizeScheduledTime(
  rawInput: string | null | undefined,
  fallbackDate?: string
): string | null {
  if (!rawInput || !rawInput.trim()) return null;
  const trimmed = rawInput.trim();

  // Si ya es un ISO string o tiene fecha completa válida
  const parsedDirect = Date.parse(trimmed);
  if (!isNaN(parsedDirect)) {
    return new Date(parsedDirect).toISOString();
  }

  // Si contiene hora en formato HH:mm o HH:mm hs (ej. "14:30", "14:30 hs", "9:00")
  const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, "0");
    const minutes = timeMatch[2];
    const baseDate = fallbackDate || new Date().toISOString().split("T")[0];
    const combined = `${baseDate}T${hours}:${minutes}:00`;
    const parsedCombined = Date.parse(combined);
    if (!isNaN(parsedCombined)) {
      return new Date(parsedCombined).toISOString();
    }
  }

  return trimmed;
}

/**
 * Genera nombres de canchas por defecto según la cantidad.
 */
export function generateDefaultCourtNames(count: number): string[] {
  const names: string[] = [];
  for (let i = 1; i <= count; i++) {
    names.push(`Cancha ${i}`);
  }
  return names;
}

/**
 * Algoritmo de Programación Automática de Partidos.
 * Asigna cancha y horario garantizando:
 * 1. Ninguna pareja juega 2 partidos en el mismo turno simultáneo.
 * 2. Las fases previas (zonas, octavos, cuartos, semis) se programan cronológicamente antes que las posteriores.
 * 3. Se prioriza el descanso entre turnos sucesivos para las parejas siempre que sea posible.
 */
export function autoScheduleMatches(
  matches: Match[],
  options: AutoScheduleOptions
): AutoScheduleResult {
  const {
    courtCount,
    courtNames: customCourtNames,
    matchDurationMinutes,
    startDate,
    startTime,
    breakBetweenMinutes = 0,
    onlyUnscheduled = false,
    stageFilter = "all",
  } = options;

  if (courtCount < 1) {
    throw new Error("Debe haber al menos 1 cancha disponible para programar.");
  }

  if (matchDurationMinutes < 10) {
    throw new Error("El tiempo estimado por partido debe ser de al menos 10 minutos.");
  }

  // 1. Resolver nombres de canchas
  const courts: string[] = [];
  for (let i = 0; i < courtCount; i++) {
    if (customCourtNames && customCourtNames[i] && customCourtNames[i].trim()) {
      courts.push(customCourtNames[i].trim());
    } else {
      courts.push(`Cancha ${i + 1}`);
    }
  }

  // 2. Filtrar partidos según stageFilter y onlyUnscheduled
  let targetMatches = matches.filter((m) => {
    if (stageFilter === "zone" && m.stage !== "zone") return false;
    if (stageFilter === "playoff" && m.stage === "zone") return false;
    if (onlyUnscheduled && m.scheduled_time && m.court_name) return false;
    return true;
  });

  if (targetMatches.length === 0) {
    const startDt = parseStartDateTime(startDate, startTime);
    return {
      assignments: [],
      totalMatches: 0,
      totalSlots: 0,
      estimatedDurationMinutes: 0,
      startTime: startDt.toISOString(),
      estimatedEndTime: startDt.toISOString(),
      courtsUsed: courts,
    };
  }

  // 3. Ordenamiento inteligente inicial:
  //    - Primero por nivel de fase (zonas primero, luego octavos, cuartos, semis, final).
  //    - Si están en fase de grupos (zone): alternar por rondas/zonas para intercalar partidos y permitir descanso.
  //    - Si están en eliminatorias: por match_number.
  const zoneMatches = targetMatches.filter((m) => m.stage === "zone");
  const playoffMatches = targetMatches
    .filter((m) => m.stage !== "zone")
    .sort((a, b) => {
      const orderA = STAGE_ORDER[a.stage] ?? 99;
      const orderB = STAGE_ORDER[b.stage] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.match_number ?? 0) - (b.match_number ?? 0);
    });

  // Agrupar partidos de zona por zone_id para intercalar rondas
  const zoneGroupsMap = new Map<string, Match[]>();
  for (const m of zoneMatches) {
    const zId = m.zone_id || "default";
    if (!zoneGroupsMap.has(zId)) zoneGroupsMap.set(zId, []);
    zoneGroupsMap.get(zId)!.push(m);
  }

  // Intercalar partidos de zonas (Round Robin interleaved)
  const interleavedZoneMatches: Match[] = [];
  const zoneArrays = Array.from(zoneGroupsMap.values());
  let maxZoneLen = 0;
  for (const arr of zoneArrays) {
    if (arr.length > maxZoneLen) maxZoneLen = arr.length;
  }

  for (let round = 0; round < maxZoneLen; round++) {
    for (const arr of zoneArrays) {
      if (round < arr.length) {
        interleavedZoneMatches.push(arr[round]);
      }
    }
  }

  // Lista unificada para programar
  const unassigned = [...interleavedZoneMatches, ...playoffMatches];

  // 4. Algoritmo de Turnos (Slots)
  const assignments: ScheduledMatchAssignment[] = [];
  const startDateTime = parseStartDateTime(startDate, startTime);
  let currentSlotTime = new Date(startDateTime.getTime());
  let slotIndex = 0;

  // Mapa para trackear el último slot en que jugó cada pareja
  const coupleLastSlot = new Map<string, number>();

  // Guardar en qué slot terminó la fase de grupos y cada fase de playoff
  let highestZoneSlot = -1;
  const stageCompletedSlot = new Map<string, number>();

  while (unassigned.length > 0) {
    const couplesInThisSlot = new Set<string>();
    const stagesInThisSlot = new Set<string>();
    let assignedInThisSlot = 0;

    // Determinar la fase mínima que todavía tiene partidos pendientes
    const currentMinStage = unassigned[0].stage;
    const currentMinStageOrder = STAGE_ORDER[currentMinStage] ?? 0;

    for (let c = 0; c < courts.length; c++) {
      if (unassigned.length === 0) break;

      const courtName = courts[c];

      // Buscar el mejor partido elegible para esta cancha en este slot
      let bestCandidateIndex = -1;
      let bestRestScore = -Infinity;

      for (let i = 0; i < unassigned.length; i++) {
        const candidate = unassigned[i];
        const candidateStageOrder = STAGE_ORDER[candidate.stage] ?? 0;

        // Regla: No mezclar fases eliminatorias avanzadas antes de que termine la fase anterior
        if (candidateStageOrder > currentMinStageOrder) {
          // Si todavía quedan partidos de la fase previa en la lista, no saltar a la siguiente fase
          const prevStageHasPending = unassigned.some(
            (m) => (STAGE_ORDER[m.stage] ?? 0) < candidateStageOrder
          );
          if (prevStageHasPending) {
            continue;
          }
        }

        // Regla de fases deportivas: Una fase posterior no puede disputarse en el mismo turno
        // en que se está disputando una fase anterior (ej: la final no puede jugarse mientras se juegan las semis)
        if (candidateStageOrder > 0) {
          let hasLowerStageInSlot = false;
          for (const st of stagesInThisSlot) {
            const order = STAGE_ORDER[st] ?? 0;
            // La final y el tercer puesto pueden compartir turno si ambas son las finales, pero no con semis o rondas previas
            if (order < candidateStageOrder) {
              if (!(st === "third_place" && candidate.stage === "final")) {
                hasLowerStageInSlot = true;
                break;
              }
            }
          }
          if (hasLowerStageInSlot) {
            continue;
          }
        }

        const c1 = candidate.couple1_id;
        const c2 = candidate.couple2_id;

        // Regla 1: Ninguna pareja puede tener 2 partidos en el mismo turno
        if (c1 && couplesInThisSlot.has(c1)) continue;
        if (c2 && couplesInThisSlot.has(c2)) continue;

        // Heurística de descanso: premiar parejas que no jugaron en el slot inmediatamente anterior
        let restScore = 0;
        if (c1) {
          const lastC1 = coupleLastSlot.get(c1);
          if (lastC1 !== undefined) {
            const diff = slotIndex - lastC1;
            restScore += diff > 1 ? 10 : -5;
          } else {
            restScore += 15; // Primera vez que juegan
          }
        }
        if (c2) {
          const lastC2 = coupleLastSlot.get(c2);
          if (lastC2 !== undefined) {
            const diff = slotIndex - lastC2;
            restScore += diff > 1 ? 10 : -5;
          } else {
            restScore += 15;
          }
        }

        // Si es el primer candidato válido o tiene mejor descanso
        if (bestCandidateIndex === -1 || restScore > bestRestScore) {
          bestCandidateIndex = i;
          bestRestScore = restScore;

          // Si tiene muy buen descanso, podemos tomarlo directamente
          if (restScore >= 20) {
            break;
          }
        }
      }

      if (bestCandidateIndex !== -1) {
        const [chosenMatch] = unassigned.splice(bestCandidateIndex, 1);

        assignments.push({
          matchId: chosenMatch.id,
          courtName,
          scheduledTime: currentSlotTime.toISOString(),
          slotIndex,
        });

        if (chosenMatch.couple1_id) {
          couplesInThisSlot.add(chosenMatch.couple1_id);
          coupleLastSlot.set(chosenMatch.couple1_id, slotIndex);
        }
        if (chosenMatch.couple2_id) {
          couplesInThisSlot.add(chosenMatch.couple2_id);
          coupleLastSlot.set(chosenMatch.couple2_id, slotIndex);
        }

        stagesInThisSlot.add(chosenMatch.stage);

        if (chosenMatch.stage === "zone") {
          highestZoneSlot = Math.max(highestZoneSlot, slotIndex);
        }
        stageCompletedSlot.set(chosenMatch.stage, slotIndex);

        assignedInThisSlot++;
      }
    }

    // Avanzar tiempo para el siguiente slot
    const slotDurationMs = (matchDurationMinutes + breakBetweenMinutes) * 60 * 1000;
    currentSlotTime = new Date(currentSlotTime.getTime() + slotDurationMs);
    slotIndex++;

    // Guardarraíl para evitar bucles infinitos en caso de configuraciones atípicas
    if (slotIndex > targetMatches.length + 50) {
      // Asignar los restantes de forma forzada a las canchas en los siguientes turnos
      while (unassigned.length > 0) {
        for (let c = 0; c < courts.length && unassigned.length > 0; c++) {
          const match = unassigned.shift()!;
          assignments.push({
            matchId: match.id,
            courtName: courts[c],
            scheduledTime: currentSlotTime.toISOString(),
            slotIndex,
          });
        }
        currentSlotTime = new Date(currentSlotTime.getTime() + slotDurationMs);
        slotIndex++;
      }
      break;
    }
  }

  const totalSlots = slotIndex;
  const estimatedDurationMinutes = totalSlots * matchDurationMinutes + Math.max(0, totalSlots - 1) * breakBetweenMinutes;
  
  // Calcular hora final estimada (último slot + duración del partido)
  const lastSlotStart = assignments.length > 0
    ? new Date(assignments[assignments.length - 1].scheduledTime)
    : startDateTime;
  const estimatedEndTime = new Date(
    lastSlotStart.getTime() + matchDurationMinutes * 60 * 1000
  ).toISOString();

  return {
    assignments,
    totalMatches: assignments.length,
    totalSlots,
    estimatedDurationMinutes,
    startTime: startDateTime.toISOString(),
    estimatedEndTime,
    courtsUsed: courts,
  };
}
