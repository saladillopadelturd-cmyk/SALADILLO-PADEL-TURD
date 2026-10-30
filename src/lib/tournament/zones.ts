/**
 * Utilidades para el cálculo y distribución óptima de zonas en torneos SPT.
 * 
 * Reglas de pádel SPT:
 * - Cada torneo se puede crear sin determinar cantidad de zonas ni parejas por zona.
 * - Una vez cerrada la inscripción, se determina la cantidad definitiva de parejas.
 * - El sistema ofrece sugerencias para zonas de 4 y zonas de 3 parejas.
 * - NUNCA debe haber zonas vacías ni zonas con una sola pareja (mínimo 2 parejas por zona).
 * - En caso de haber parejas sobrantes, se redistribuyen de modo que ninguna zona tenga menos de 2 parejas.
 * - El administrador confirma manualmente cuántas parejas por zona tendrá el torneo.
 */

import type { Zone, Couple, MatchStage } from "@/types/tournament";

export interface ZoneDistribution {
  numZones: number;
  zoneSize: number;
  distribution: {
    zoneIndex: number;
    zoneName: string;
    targetCount: number;
  }[];
  summary: string;
  isEqual: boolean;
  missingCouples: number;
  missingPlayers: number;
  warningMessage: string | null;
}

export interface ZoneSuggestion {
  targetZoneSize: 3 | 4;
  numZones: number;
  fullZonesCount: number;
  remainderZonesCount: number;
  remainderSize: number;
  summary: string;
  title: string;
  hasRemainder: boolean;
  distribution: { zoneName: string; count: number }[];
}

/**
 * Calcula sugerencias de conformación de zonas para un total de parejas dado.
 * Genera dos alternativas:
 * 1. Con zonas objetivo de 4 parejas por zona.
 * 2. Con zonas objetivo de 3 parejas por zona.
 * 
 * Regla inquebrantable SPT:
 * NUNCA debe haber zonas vacías ni zonas con una sola pareja (cada zona debe tener >= 2 parejas).
 */
export function getZoneSuggestions(couplesCount: number): {
  suggestion4: ZoneSuggestion;
  suggestion3: ZoneSuggestion;
} {
  const safeCount = Math.max(0, couplesCount);

  // 1. Sugerencia Zonas de 4
  const buildSug4 = (): ZoneSuggestion => {
    if (safeCount < 2) {
      return {
        targetZoneSize: 4,
        numZones: 1,
        fullZonesCount: 0,
        remainderZonesCount: 1,
        remainderSize: safeCount,
        title: "Zonas de 4 parejas",
        summary: "Se requieren al menos 2 parejas para conformar zonas",
        hasRemainder: false,
        distribution: [{ zoneName: "Zona A", count: safeCount }],
      };
    }

    if (safeCount === 2 || safeCount === 3) {
      return {
        targetZoneSize: 4,
        numZones: 1,
        fullZonesCount: 0,
        remainderZonesCount: 1,
        remainderSize: safeCount,
        title: "Opción: Zonas de 4 parejas",
        summary: `1 zona de ${safeCount} parejas`,
        hasRemainder: true,
        distribution: [{ zoneName: "Zona A", count: safeCount }],
      };
    }

    const fullZones = Math.floor(safeCount / 4);
    const remainder = safeCount % 4;

    const distribution: { zoneName: string; count: number }[] = [];
    let numZones = fullZones;
    let remainderZonesCount = 0;
    let remainderSize = 0;
    let summary = "";
    let hasRemainder = false;

    if (remainder === 0) {
      // Caso exacto (ej: 8, 12, 16, 20 parejas)
      for (let i = 0; i < fullZones; i++) {
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + i)}`,
          count: 4,
        });
      }
      summary = `${fullZones} ${fullZones === 1 ? "zona exacta" : "zonas exactas"} de 4 parejas`;
      hasRemainder = false;
    } else if (remainder >= 2) {
      // Sobran 2 o 3 parejas (>= 2, por lo que la zona sobrante es válida)
      numZones = fullZones + 1;
      remainderZonesCount = 1;
      remainderSize = remainder;
      hasRemainder = true;

      for (let i = 0; i < fullZones; i++) {
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + i)}`,
          count: 4,
        });
      }
      distribution.push({
        zoneName: `Zona ${String.fromCharCode(65 + fullZones)}`,
        count: remainder,
      });

      if (fullZones === 0) {
        summary = `1 zona de ${remainder} parejas`;
      } else {
        summary = `${fullZones} ${fullZones === 1 ? "zona" : "zonas"} de 4 parejas + 1 zona de ${remainder} parejas sobrantes`;
      }
    } else {
      // remainder === 1
      // REGLA: NUNCA dejar una zona con 1 sola pareja ni vacía.
      // Se toma 1 pareja de una zona de 4 para que la última zona quede con 2 parejas y la anterior con 3 parejas.
      numZones = fullZones + 1;
      remainderZonesCount = 2; // 1 zona de 3 y 1 zona de 2
      remainderSize = 2;
      hasRemainder = true;

      if (fullZones === 1) {
        // 5 parejas: se conforma 1 zona de 3 parejas y 1 zona de 2 parejas (total 5)
        distribution.push({ zoneName: "Zona A", count: 3 });
        distribution.push({ zoneName: "Zona B", count: 2 });
        summary = "1 zona de 3 parejas + 1 zona de 2 parejas";
      } else {
        // fullZones > 1 (ej: 9, 13, 17 parejas)
        // fullZones - 1 zonas de 4, 1 zona de 3, y 1 zona de 2
        for (let i = 0; i < fullZones - 1; i++) {
          distribution.push({
            zoneName: `Zona ${String.fromCharCode(65 + i)}`,
            count: 4,
          });
        }
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + fullZones - 1)}`,
          count: 3,
        });
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + fullZones)}`,
          count: 2,
        });

        const fCount = fullZones - 1;
        summary = `${fCount} ${fCount === 1 ? "zona" : "zonas"} de 4 parejas + 1 zona de 3 parejas + 1 zona de 2 parejas`;
      }
    }

    return {
      targetZoneSize: 4,
      numZones,
      fullZonesCount: remainder === 1 ? Math.max(0, fullZones - 1) : fullZones,
      remainderZonesCount,
      remainderSize,
      summary,
      title: "Opción: Zonas de 4 parejas",
      hasRemainder,
      distribution,
    };
  };

  // 2. Sugerencia Zonas de 3
  const buildSug3 = (): ZoneSuggestion => {
    if (safeCount < 2) {
      return {
        targetZoneSize: 3,
        numZones: 1,
        fullZonesCount: 0,
        remainderZonesCount: 1,
        remainderSize: safeCount,
        title: "Zonas de 3 parejas",
        summary: "Se requieren al menos 2 parejas para conformar zonas",
        hasRemainder: false,
        distribution: [{ zoneName: "Zona A", count: safeCount }],
      };
    }

    if (safeCount === 2) {
      return {
        targetZoneSize: 3,
        numZones: 1,
        fullZonesCount: 0,
        remainderZonesCount: 1,
        remainderSize: 2,
        title: "Opción: Zonas de 3 parejas",
        summary: "1 zona de 2 parejas",
        hasRemainder: true,
        distribution: [{ zoneName: "Zona A", count: 2 }],
      };
    }

    const fullZones = Math.floor(safeCount / 3);
    const remainder = safeCount % 3;

    const distribution: { zoneName: string; count: number }[] = [];
    let numZones = fullZones;
    let remainderZonesCount = 0;
    let remainderSize = 0;
    let summary = "";
    let hasRemainder = false;

    if (remainder === 0) {
      // Caso exacto (ej: 6, 9, 12, 15 parejas)
      for (let i = 0; i < fullZones; i++) {
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + i)}`,
          count: 3,
        });
      }
      summary = `${fullZones} ${fullZones === 1 ? "zona exacta" : "zonas exactas"} de 3 parejas`;
      hasRemainder = false;
    } else if (remainder === 2) {
      // Sobran 2 parejas (>= 2, zona válida)
      numZones = fullZones + 1;
      remainderZonesCount = 1;
      remainderSize = 2;
      hasRemainder = true;

      for (let i = 0; i < fullZones; i++) {
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + i)}`,
          count: 3,
        });
      }
      distribution.push({
        zoneName: `Zona ${String.fromCharCode(65 + fullZones)}`,
        count: 2,
      });

      if (fullZones === 0) {
        summary = "1 zona de 2 parejas";
      } else {
        summary = `${fullZones} ${fullZones === 1 ? "zona" : "zonas"} de 3 parejas + 1 zona de 2 parejas sobrantes`;
      }
    } else {
      // remainder === 1
      // REGLA: NUNCA dejar una zona con 1 sola pareja ni vacía.
      // Si fullZones === 1 (4 parejas): se divide en 2 zonas de 2 parejas (2 + 2 = 4)
      // Si fullZones > 1 (ej: 7, 10, 13 parejas): fullZones - 1 zonas de 3 y 2 zonas de 2 parejas
      numZones = fullZones + 1;
      remainderZonesCount = 2;
      remainderSize = 2;
      hasRemainder = true;

      if (fullZones === 1) {
        distribution.push({ zoneName: "Zona A", count: 2 });
        distribution.push({ zoneName: "Zona B", count: 2 });
        summary = "2 zonas de 2 parejas";
      } else {
        for (let i = 0; i < fullZones - 1; i++) {
          distribution.push({
            zoneName: `Zona ${String.fromCharCode(65 + i)}`,
            count: 3,
          });
        }
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + fullZones - 1)}`,
          count: 2,
        });
        distribution.push({
          zoneName: `Zona ${String.fromCharCode(65 + fullZones)}`,
          count: 2,
        });

        const fCount = fullZones - 1;
        summary = `${fCount} ${fCount === 1 ? "zona" : "zonas"} de 3 parejas + 2 zonas de 2 parejas`;
      }
    }

    return {
      targetZoneSize: 3,
      numZones,
      fullZonesCount: remainder === 1 ? Math.max(0, fullZones - 1) : fullZones,
      remainderZonesCount,
      remainderSize,
      summary,
      title: "Opción: Zonas de 3 parejas",
      hasRemainder,
      distribution,
    };
  };

  return {
    suggestion4: buildSug4(),
    suggestion3: buildSug3(),
  };
}

/**
 * Calcula la cantidad óptima de zonas y su distribución según la cantidad de parejas inscritas.
 * 
 * Reglas SPT:
 * 1. NUNCA debe haber zonas vacías ni zonas con una sola pareja (mínimo 2 parejas por zona).
 * 2. Todas las zonas deben tener la misma cantidad de parejas o una diferencia máxima de 1 pareja.
 * 3. Si no se logra igualdad perfecta, se calcula cuántas parejas y jugadores faltan para conseguirlo.
 * 
 * @param couplesCount Cantidad de parejas registradas
 * @param preferredZoneSize Tamaño objetivo por zona (3 o 4)
 * @param customNumZones Cantidad opcional de zonas forzada por el admin
 */
export function calculateOptimalZones(
  couplesCount: number,
  preferredZoneSize: number = 4,
  customNumZones?: number | null
): ZoneDistribution {
  const zoneSize = preferredZoneSize === 3 ? 3 : 4;

  if (couplesCount <= 0) {
    const missingCouples = zoneSize;
    const missingPlayers = missingCouples * 2;
    return {
      numZones: 1,
      zoneSize,
      distribution: [{ zoneIndex: 0, zoneName: "Zona A", targetCount: 0 }],
      summary: "0 parejas registradas",
      isEqual: false,
      missingCouples,
      missingPlayers,
      warningMessage: `Faltan ${missingPlayers} jugadores (${missingCouples} parejas) para conformar al menos 1 zona completa de ${zoneSize} parejas.`,
    };
  }

  if (couplesCount === 1) {
    const missingCouples = zoneSize - 1;
    const missingPlayers = missingCouples * 2;
    return {
      numZones: 1,
      zoneSize,
      distribution: [{ zoneIndex: 0, zoneName: "Zona A", targetCount: 1 }],
      summary: "1 pareja registrada",
      isEqual: false,
      missingCouples,
      missingPlayers,
      warningMessage: `Se necesita al menos 1 pareja más para conformar una zona con competencia (mínimo 2 parejas por zona; nunca zonas con 1 sola pareja).`,
    };
  }

  // 1. Determinar el número de zonas
  // Regla SPT: cada zona debe tener al menos 2 parejas.
  // Por lo tanto, el número máximo de zonas posible es Math.floor(couplesCount / 2).
  const maxPossibleZones = Math.max(1, Math.floor(couplesCount / 2));

  let numZones = customNumZones && customNumZones >= 1 ? customNumZones : 0;

  if (!numZones) {
    // Si no está forzado, calcular el número óptimo
    if (couplesCount % zoneSize === 0) {
      numZones = couplesCount / zoneSize;
    } else {
      const candidateZones = Math.round(couplesCount / zoneSize);
      numZones = Math.max(1, candidateZones);
    }
  }

  // Clampear estrictamente entre 1 y maxPossibleZones para que NUNCA haya zonas con 0 o 1 pareja
  numZones = Math.max(1, Math.min(numZones, maxPossibleZones));

  // 2. Distribuir las parejas equitativamente entre las numZones
  const baseCount = Math.floor(couplesCount / numZones);
  const remainder = couplesCount % numZones;

  const distribution = [];
  const countSummary: Record<number, number> = {};

  for (let i = 0; i < numZones; i++) {
    const targetCount = i < remainder ? baseCount + 1 : baseCount;
    distribution.push({
      zoneIndex: i,
      zoneName: `Zona ${String.fromCharCode(65 + i)}`,
      targetCount,
    });
    countSummary[targetCount] = (countSummary[targetCount] || 0) + 1;
  }

  // Construir resumen legible (ej: "5 zonas de 4 parejas" o "2 zonas de 4 y 1 zona de 3")
  const summaryParts = Object.entries(countSummary)
    .sort(([sizeA], [sizeB]) => Number(sizeB) - Number(sizeA))
    .map(([size, zonesCount]) => `${zonesCount} ${zonesCount === 1 ? "zona" : "zonas"} de ${size} parejas`);

  const summary = summaryParts.join(" y ");

  // 3. Verificación de igualdad de parejas en todas las zonas
  let isEqual = false;
  let missingCouples = 0;

  if (customNumZones && customNumZones >= 1) {
    const requestedZones = customNumZones;
    if (requestedZones > maxPossibleZones) {
      // El admin pidió más zonas de las que soportan 2 parejas por zona
      isEqual = false;
      const rem = couplesCount % numZones;
      missingCouples = rem === 0 ? 0 : numZones - rem;
    } else {
      const rem = couplesCount % requestedZones;
      isEqual = rem === 0 && baseCount >= 2;
      missingCouples = rem === 0 ? 0 : requestedZones - rem;
    }
  } else {
    // Modo automático según targetZoneSize (3 o 4):
    const rem = couplesCount % zoneSize;
    isEqual = rem === 0 && couplesCount >= zoneSize;
    missingCouples = rem === 0 ? 0 : zoneSize - rem;
  }

  const missingPlayers = missingCouples * 2;
  let warningMessage: string | null = null;

  if (!isEqual) {
    const targetCouplesPerZone = customNumZones && customNumZones >= 1 && customNumZones <= maxPossibleZones
      ? Math.ceil(couplesCount / customNumZones)
      : zoneSize;

    if (customNumZones && customNumZones > maxPossibleZones) {
      warningMessage = `Atención: No se pueden conformar ${customNumZones} zonas con ${couplesCount} parejas porque quedarían zonas vacías o con una sola pareja (mínimo 2 parejas por zona). Se ajustó a ${numZones} zonas.`;
    } else {
      warningMessage = `Atención: Las zonas no tienen la misma cantidad de parejas. Faltan ${missingPlayers} jugadores (${missingCouples} ${
        missingCouples === 1 ? "pareja" : "parejas"
      }) para que todas las zonas queden completas y equitativas de ${targetCouplesPerZone} parejas.`;
    }
  }

  return {
    numZones,
    zoneSize,
    distribution,
    summary,
    isEqual,
    missingCouples,
    missingPlayers,
    warningMessage,
  };
}

/**
 * Da formato uniforme y legible al nombre de una zona.
 * Ejemplos:
 * - "Zona A", 1 -> "Zona A"
 * - "A", 1 -> "Zona A"
 * - null, 1 -> "Zona 1"
 * - null, null -> "Zona"
 */
export function formatZoneDisplayName(
  zoneName?: string | null,
  zoneNumber?: number | null
): string {
  if (zoneName && zoneName.trim()) {
    const trimmed = zoneName.trim();
    if (/^zona\b/i.test(trimmed)) {
      return trimmed;
    }
    return `Zona ${trimmed}`;
  }
  if (zoneNumber !== undefined && zoneNumber !== null) {
    return `Zona ${zoneNumber}`;
  }
  return "Zona";
}

/**
 * Resuelve a qué zona pertenece un partido, evaluando:
 * 1. Propiedad `zone` ya poblada en el match.
 * 2. `zone_id` directo en el match.
 * 3. Asignación de parejas en `zoneCouplesMap`.
 * 4. Propiedad `zone_id` en las parejas que disputan el partido.
 */
export function resolveMatchZone(
  match: {
    stage?: string;
    zone_id?: string | null;
    zone?: Zone;
    couple1_id?: string | null;
    couple2_id?: string | null;
    couple1?: { id: string; zone_id?: string | null };
    couple2?: { id: string; zone_id?: string | null };
  },
  zones: Zone[],
  couples?: Couple[],
  zoneCouplesMap?: Record<string, string[]>
): Zone | null {
  if (match.stage !== "zone") return null;

  // 1. Relación zone ya presente
  if (match.zone) return match.zone;

  const zoneMap = new Map(zones.map((z) => [z.id, z]));

  // 2. zone_id directo
  if (match.zone_id && zoneMap.has(match.zone_id)) {
    return zoneMap.get(match.zone_id)!;
  }

  const c1Id = match.couple1_id || match.couple1?.id;
  const c2Id = match.couple2_id || match.couple2?.id;

  // 3. Lookup en zoneCouplesMap
  if (zoneCouplesMap && (c1Id || c2Id)) {
    for (const [zId, cIds] of Object.entries(zoneCouplesMap)) {
      if ((c1Id && cIds.includes(c1Id)) || (c2Id && cIds.includes(c2Id))) {
        const z = zoneMap.get(zId);
        if (z) return z;
      }
    }
  }

  // 4. Lookup en parejas (couple1 / couple2)
  if (couples && couples.length > 0) {
    if (c1Id) {
      const c1 = couples.find((c) => c.id === c1Id);
      if (c1?.zone_id && zoneMap.has(c1.zone_id)) {
        return zoneMap.get(c1.zone_id)!;
      }
    }
    if (c2Id) {
      const c2 = couples.find((c) => c.id === c2Id);
      if (c2?.zone_id && zoneMap.has(c2.zone_id)) {
        return zoneMap.get(c2.zone_id)!;
      }
    }
  }

  // 5. Fallback por si couple1 o couple2 en el objeto tienen zone_id
  if (match.couple1?.zone_id && zoneMap.has(match.couple1.zone_id)) {
    return zoneMap.get(match.couple1.zone_id)!;
  }
  if (match.couple2?.zone_id && zoneMap.has(match.couple2.zone_id)) {
    return zoneMap.get(match.couple2.zone_id)!;
  }

  return null;
}

/**
 * Obtiene el nombre formateado de la zona a la que pertenece un partido.
 * Retorna null si no es un partido de zona o si no se pudo determinar la zona.
 */
export function getMatchZoneDisplayName(
  match: Parameters<typeof resolveMatchZone>[0],
  zones: Zone[],
  couples?: Couple[],
  zoneCouplesMap?: Record<string, string[]>
): string | null {
  const zone = resolveMatchZone(match, zones, couples, zoneCouplesMap);
  if (!zone) return null;
  return formatZoneDisplayName(zone.name, zone.zone_number);
}

/**
 * Genera los cruces de partidos para una zona según la cantidad de parejas.
 * 
 * Regla Oficial SPT para zona de 4 parejas:
 * Los partidos se jugarán en el siguiente orden:
 * 1. Pareja 1 vs Pareja 4
 * 2. Pareja 2 vs Pareja 3
 * 3. Ganador vs Ganador (se define tras finalizar partidos 1 y 2)
 * 4. Perdedor vs Perdedor (se define tras finalizar partidos 1 y 2)
 * 
 * Para zonas de 3 parejas (o de otra cantidad): Round-Robin todos contra todos.
 */
export function generateZoneMatches(coupleIds: string[]): {
  couple1Id: string | null;
  couple2Id: string | null;
}[] {
  if (coupleIds.length === 4) {
    return [
      { couple1Id: coupleIds[0], couple2Id: coupleIds[3] },
      { couple1Id: coupleIds[1], couple2Id: coupleIds[2] },
      { couple1Id: null, couple2Id: null },
      { couple1Id: null, couple2Id: null },
    ];
  }

  const matches: { couple1Id: string | null; couple2Id: string | null }[] = [];
  for (let i = 0; i < coupleIds.length; i++) {
    for (let j = i + 1; j < coupleIds.length; j++) {
      matches.push({
        couple1Id: coupleIds[i],
        couple2Id: coupleIds[j],
      });
    }
  }
  return matches;
}

export interface ZoneSlotUpdate {
  matchId: string;
  couple1_id?: string | null;
  couple2_id?: string | null;
  resetScore?: boolean;
}

/**
 * Propaga automáticamente los clasificados a los partidos de Ganador vs Ganador
 * y Perdedor vs Perdedor en zonas de 4 parejas cuando concluyen los cruces iniciales.
 */
export function propagateZoneMatches<
  T extends {
    id: string;
    stage: MatchStage | string;
    zone_id?: string | null;
    match_number?: number | null;
    couple1_id?: string | null;
    couple2_id?: string | null;
    winner_couple_id?: string | null;
    status?: string | null;
    score_set1?: string | null;
    score_set2?: string | null;
    score_super_tb?: string | null;
    created_at?: string;
  }
>(
  tournamentMatches: T[]
): {
  updatedMatches: T[];
  updatesToPersist: ZoneSlotUpdate[];
} {
  const clonedMatches = tournamentMatches.map((m) => ({ ...m }));
  const updatesMap = new Map<string, ZoneSlotUpdate>();

  // Agrupar partidos de zona por zone_id
  const zoneGroups = new Map<string, T[]>();
  for (const m of clonedMatches) {
    if (m.stage === "zone" && m.zone_id) {
      if (!zoneGroups.has(m.zone_id)) zoneGroups.set(m.zone_id, []);
      zoneGroups.get(m.zone_id)!.push(m);
    }
  }

  for (const [, zMatches] of zoneGroups) {
    // Aplica a zonas con exactamente 4 partidos generados
    if (zMatches.length === 4) {
      const sorted = [...zMatches].sort((a, b) => {
        if (a.match_number != null && b.match_number != null && a.match_number !== b.match_number) {
          return a.match_number - b.match_number;
        }
        if (a.created_at && b.created_at && a.created_at !== b.created_at) {
          return a.created_at.localeCompare(b.created_at);
        }
        return (a.id || "").localeCompare(b.id || "");
      });

      const m1 = sorted[0]; // Cruce 1: P1 vs P4
      const m2 = sorted[1]; // Cruce 2: P2 vs P3
      const mWinners = sorted[2]; // Ganador vs Ganador
      const mLosers = sorted[3];  // Perdedor vs Perdedor

      // Determinar ganador y perdedor de m1
      let winner1: string | null = null;
      let loser1: string | null = null;
      if (m1.status === "completed" && m1.winner_couple_id) {
        winner1 = m1.winner_couple_id;
        loser1 = winner1 === m1.couple1_id ? (m1.couple2_id || null) : (m1.couple1_id || null);
      }

      // Determinar ganador y perdedor de m2
      let winner2: string | null = null;
      let loser2: string | null = null;
      if (m2.status === "completed" && m2.winner_couple_id) {
        winner2 = m2.winner_couple_id;
        loser2 = winner2 === m2.couple1_id ? (m2.couple2_id || null) : (m2.couple1_id || null);
      }

      // Actualizar mWinners (Ganador 1 vs Ganador 2)
      let winnersNeedsUpdate = false;
      const winnersUpdate: ZoneSlotUpdate = { matchId: mWinners.id };

      if (mWinners.couple1_id !== winner1) {
        mWinners.couple1_id = winner1;
        winnersUpdate.couple1_id = winner1;
        winnersNeedsUpdate = true;
      }
      if (mWinners.couple2_id !== winner2) {
        mWinners.couple2_id = winner2;
        winnersUpdate.couple2_id = winner2;
        winnersNeedsUpdate = true;
      }

      if (
        mWinners.winner_couple_id &&
        mWinners.winner_couple_id !== mWinners.couple1_id &&
        mWinners.winner_couple_id !== mWinners.couple2_id
      ) {
        mWinners.winner_couple_id = null;
        mWinners.status = "pending";
        mWinners.score_set1 = null;
        mWinners.score_set2 = null;
        mWinners.score_super_tb = null;
        winnersUpdate.resetScore = true;
        winnersNeedsUpdate = true;
      }

      if (winnersNeedsUpdate) {
        updatesMap.set(mWinners.id, winnersUpdate);
      }

      // Actualizar mLosers (Perdedor 1 vs Perdedor 2)
      let losersNeedsUpdate = false;
      const losersUpdate: ZoneSlotUpdate = { matchId: mLosers.id };

      if (mLosers.couple1_id !== loser1) {
        mLosers.couple1_id = loser1;
        losersUpdate.couple1_id = loser1;
        losersNeedsUpdate = true;
      }
      if (mLosers.couple2_id !== loser2) {
        mLosers.couple2_id = loser2;
        losersUpdate.couple2_id = loser2;
        losersNeedsUpdate = true;
      }

      if (
        mLosers.winner_couple_id &&
        mLosers.winner_couple_id !== mLosers.couple1_id &&
        mLosers.winner_couple_id !== mLosers.couple2_id
      ) {
        mLosers.winner_couple_id = null;
        mLosers.status = "pending";
        mLosers.score_set1 = null;
        mLosers.score_set2 = null;
        mLosers.score_super_tb = null;
        losersUpdate.resetScore = true;
        losersNeedsUpdate = true;
      }

      if (losersNeedsUpdate) {
        updatesMap.set(mLosers.id, losersUpdate);
      }
    }
  }

  return {
    updatedMatches: clonedMatches,
    updatesToPersist: Array.from(updatesMap.values()),
  };
}

export type Zone4MatchRole = "initial_1_4" | "initial_2_3" | "winners" | "losers";

/**
 * Identifica el rol y etiquetas descriptivas de un partido dentro de una zona de 4 parejas.
 */
export function getZone4MatchInfo(
  match: { id: string; stage?: string; zone_id?: string | null; match_number?: number | null; created_at?: string },
  allMatches: { id: string; stage?: string; zone_id?: string | null; match_number?: number | null; created_at?: string }[]
): {
  isZone4: boolean;
  role?: Zone4MatchRole;
  roundBadge?: string;
  roundName?: string;
  couple1Placeholder?: string;
  couple2Placeholder?: string;
} {
  if (match.stage !== "zone" || !match.zone_id) {
    return { isZone4: false };
  }

  const zoneMatches = allMatches
    .filter((m) => m.stage === "zone" && m.zone_id === match.zone_id)
    .sort((a, b) => {
      if (a.match_number != null && b.match_number != null && a.match_number !== b.match_number) {
        return a.match_number - b.match_number;
      }
      if (a.created_at && b.created_at && a.created_at !== b.created_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      return (a.id || "").localeCompare(b.id || "");
    });

  if (zoneMatches.length !== 4) {
    return { isZone4: false };
  }

  const index = zoneMatches.findIndex((m) => m.id === match.id);
  if (index === 0) {
    return {
      isZone4: true,
      role: "initial_1_4",
      roundBadge: "Ronda 1 (P1 vs P4)",
      roundName: "Ronda 1 • Pareja 1 vs Pareja 4",
    };
  }
  if (index === 1) {
    return {
      isZone4: true,
      role: "initial_2_3",
      roundBadge: "Ronda 1 (P2 vs P3)",
      roundName: "Ronda 1 • Pareja 2 vs Pareja 3",
    };
  }
  if (index === 2) {
    return {
      isZone4: true,
      role: "winners",
      roundBadge: "Ganador vs Ganador",
      roundName: "Ronda 2 • Ganador vs Ganador",
      couple1Placeholder: "Ganador P1 vs P4",
      couple2Placeholder: "Ganador P2 vs P3",
    };
  }
  if (index === 3) {
    return {
      isZone4: true,
      role: "losers",
      roundBadge: "Perdedor vs Perdedor",
      roundName: "Ronda 2 • Perdedor vs Perdedor",
      couple1Placeholder: "Perdedor P1 vs P4",
      couple2Placeholder: "Perdedor P2 vs P3",
    };
  }

  return { isZone4: false };
}
