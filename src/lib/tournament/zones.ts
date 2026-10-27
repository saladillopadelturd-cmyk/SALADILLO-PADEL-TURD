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
