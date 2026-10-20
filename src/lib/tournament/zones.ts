/**
 * Utilidades para el cálculo y distribución óptima de zonas en torneos SPT.
 * 
 * Reglas de pádel SPT:
 * - Cada torneo se puede crear sin determinar cantidad de zonas ni parejas por zona.
 * - Una vez cerrada la inscripción, se determina la cantidad definitiva de parejas.
 * - El sistema ofrece sugerencias para zonas de 4 y zonas de 3 parejas.
 * - En caso de haber parejas sobrantes, puede haber una zona con menos parejas.
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
 * 1. Con zonas objetivo de 4 parejas por zona (con zona de parejas sobrantes si aplica).
 * 2. Con zonas objetivo de 3 parejas por zona (con zona de parejas sobrantes si aplica).
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
        summary: "1 zona (a definir al cerrar inscripción)",
        hasRemainder: false,
        distribution: [{ zoneName: "Zona A", count: safeCount }],
      };
    }

    const fullZones = Math.floor(safeCount / 4);
    const remainder = safeCount % 4;

    let numZones = fullZones;
    let remainderZonesCount = 0;
    let remainderSize = 0;

    if (remainder > 0) {
      numZones += 1;
      remainderZonesCount = 1;
      remainderSize = remainder;
    }

    if (numZones === 0) {
      numZones = 1;
      remainderZonesCount = 1;
      remainderSize = safeCount;
    }

    const distribution: { zoneName: string; count: number }[] = [];
    for (let i = 0; i < fullZones; i++) {
      distribution.push({
        zoneName: `Zona ${String.fromCharCode(65 + i)}`,
        count: 4,
      });
    }
    if (remainder > 0) {
      distribution.push({
        zoneName: `Zona ${String.fromCharCode(65 + fullZones)}`,
        count: remainder,
      });
    }

    let summary = "";
    if (remainder === 0) {
      summary = `${fullZones} ${fullZones === 1 ? "zona exacta" : "zonas exactas"} de 4 parejas`;
    } else if (fullZones === 0) {
      summary = `1 zona de ${remainder} parejas`;
    } else {
      summary = `${fullZones} ${fullZones === 1 ? "zona" : "zonas"} de 4 parejas + 1 zona de ${remainder} parejas sobrantes`;
    }

    return {
      targetZoneSize: 4,
      numZones,
      fullZonesCount: fullZones,
      remainderZonesCount,
      remainderSize,
      summary,
      title: "Opción: Zonas de 4 parejas",
      hasRemainder: remainder > 0,
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
        summary: "1 zona (a definir al cerrar inscripción)",
        hasRemainder: false,
        distribution: [{ zoneName: "Zona A", count: safeCount }],
      };
    }

    const fullZones = Math.floor(safeCount / 3);
    const remainder = safeCount % 3;

    let numZones = fullZones;
    let remainderZonesCount = 0;
    let remainderSize = 0;

    if (remainder > 0) {
      numZones += 1;
      remainderZonesCount = 1;
      remainderSize = remainder;
    }

    if (numZones === 0) {
      numZones = 1;
      remainderZonesCount = 1;
      remainderSize = safeCount;
    }

    const distribution: { zoneName: string; count: number }[] = [];
    for (let i = 0; i < fullZones; i++) {
      distribution.push({
        zoneName: `Zona ${String.fromCharCode(65 + i)}`,
        count: 3,
      });
    }
    if (remainder > 0) {
      distribution.push({
        zoneName: `Zona ${String.fromCharCode(65 + fullZones)}`,
        count: remainder,
      });
    }

    let summary = "";
    if (remainder === 0) {
      summary = `${fullZones} ${fullZones === 1 ? "zona exacta" : "zonas exactas"} de 3 parejas`;
    } else if (fullZones === 0) {
      summary = `1 zona de ${remainder} parejas`;
    } else {
      summary = `${fullZones} ${fullZones === 1 ? "zona" : "zonas"} de 3 parejas + 1 zona de ${remainder} parejas sobrantes`;
    }

    return {
      targetZoneSize: 3,
      numZones,
      fullZonesCount: fullZones,
      remainderZonesCount,
      remainderSize,
      summary,
      title: "Opción: Zonas de 3 parejas",
      hasRemainder: remainder > 0,
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
 * Regla de Oro SPT:
 * Todas las zonas deben tener la misma cantidad de parejas.
 * Si no se logra esta condición, se calcula cuántas parejas y cuántos jugadores faltan para conseguirlo.
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

  // 1. Determinar el número de zonas
  let numZones = customNumZones && customNumZones >= 1 ? customNumZones : 0;

  if (!numZones) {
    // Si no está forzado, calcular el número óptimo
    // Para múltiplo exacto (ej: 20 parejas / 4 = 5 zonas exactas)
    if (couplesCount % zoneSize === 0) {
      numZones = couplesCount / zoneSize;
    } else {
      // Buscar el número de zonas que mantenga cada zona lo más cercana a 3 o 4
      const candidateZones = Math.round(couplesCount / zoneSize);
      numZones = Math.max(1, candidateZones);
    }
  }

  // Asegurar al menos 1 zona y no más zonas que parejas
  numZones = Math.max(1, Math.min(numZones, couplesCount));

  // 2. Distribuir las parejas entre las numZones
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
  // Si remainder === 0 cuando se fuerza numZones, todas las zonas tienen baseCount.
  // En modo automático o si baseCount != zoneSize, calculamos el desfasaje respecto al objetivo reglamentario.
  let isEqual = false;
  let missingCouples = 0;

  if (customNumZones && customNumZones >= 1) {
    // Si el usuario fijó la cantidad de zonas:
    const rem = couplesCount % customNumZones;
    isEqual = rem === 0 && baseCount >= 2;
    missingCouples = rem === 0 ? 0 : customNumZones - rem;
  } else {
    // Modo automático según targetZoneSize (3 o 4):
    const rem = couplesCount % zoneSize;
    isEqual = rem === 0 && couplesCount >= zoneSize;
    missingCouples = rem === 0 ? 0 : zoneSize - rem;
  }

  const missingPlayers = missingCouples * 2;
  let warningMessage: string | null = null;

  if (!isEqual) {
    const targetCouplesPerZone = customNumZones && customNumZones >= 1
      ? Math.ceil(couplesCount / customNumZones)
      : zoneSize;

    warningMessage = `Atención: Las zonas no tienen la misma cantidad de parejas. Faltan ${missingPlayers} jugadores (${missingCouples} ${
      missingCouples === 1 ? "pareja" : "parejas"
    }) para que todas las zonas queden completas y equitativas de ${targetCouplesPerZone} parejas.`;
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
