/**
 * Utilidades para el cálculo y distribución óptima de zonas en torneos SPT.
 * 
 * Reglas de pádel SPT:
 * - Las zonas se conforman de 3 o 4 parejas (definido por el Admin).
 * - Para N parejas inscritas, se busca la distribución más equitativa posible.
 *   Ej: 20 parejas con zonas de 4 -> 5 zonas de 4 parejas (Zonas A, B, C, D, E).
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
}

/**
 * Calcula la cantidad óptima de zonas y su distribución según la cantidad de parejas inscritas.
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
    return {
      numZones: 1,
      zoneSize,
      distribution: [{ zoneIndex: 0, zoneName: "Zona A", targetCount: 0 }],
      summary: "0 parejas registradas",
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
  // Las primeras remainder zonas reciben baseCount + 1, las demás baseCount
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

  return {
    numZones,
    zoneSize,
    distribution,
    summary,
  };
}
