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
  isEqual: boolean;
  missingCouples: number;
  missingPlayers: number;
  warningMessage: string | null;
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
