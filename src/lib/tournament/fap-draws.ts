import type { MatchStage } from "@/types/tournament";
import type { QualifiedPair } from "./elimination";

export interface FAPDrawTemplate {
  couplesCount: number;
  numZones: number;
  qualifiedCount: number;
  stage: MatchStage; // "semi" | "quarter" | "round_of_16" | "round_of_32"
  totalSlots: number; // 4, 8, 16, 32
  /**
   * Array de pares de tokens para cada partido de la ronda inicial.
   * Ej: [["1º A", "2º B"], ["2º A", "1º B"]] para 6 parejas.
   * Un slot con "BYE" indica que no hay rival y la pareja pasa directo.
   */
  matches: [string, string][];
}

/**
 * Plantillas oficiales de conformación del cuadro según el reglamento oficial de la FAP
 * (Federación Argentina de Pádel), extraídas de "LIBRO.pdf" (páginas 122 a 148).
 * 
 * Reglas fundamentales FAP:
 * - 1º A se ubica siempre en la cabeza del cuadro superior (Partido 0).
 * - 1º B se ubica siempre en el pie del cuadro inferior (Último partido).
 * - 1º C y 1º D se ubican en extremos de cuadrantes opuestos.
 * - Ningún partido de primera ronda enfrenta a parejas de la misma zona.
 * - Los clasificados son:
 *   - En zonas de 3: pasan 1º y 2º (2 parejas).
 *   - En zonas de 4: pasan 1º, 2º y 3º (3 parejas).
 */
export const FAP_DRAW_TEMPLATES: Record<number, FAPDrawTemplate> = {
  // 6 Parejas: 2 zonas de 3 (A, B) -> 4 clasificados, Semifinales
  6: {
    couplesCount: 6,
    numZones: 2,
    qualifiedCount: 4,
    stage: "semi",
    totalSlots: 4,
    matches: [
      ["1º A", "2º B"],
      ["2º A", "1º B"],
    ],
  },

  // 7 Parejas: Zona A (4), Zona B (3) -> 5 clasificados, Cuartos con 3 BYEs
  7: {
    couplesCount: 7,
    numZones: 2,
    qualifiedCount: 5,
    stage: "quarter",
    totalSlots: 8,
    matches: [
      ["1º A", "BYE"],
      ["3º A", "2º B"],
      ["2º A", "BYE"],
      ["BYE", "1º B"],
    ],
  },

  // 8 Parejas: Zona A (4), Zona B (4) -> 6 clasificados, Cuartos con 2 BYEs
  8: {
    couplesCount: 8,
    numZones: 2,
    qualifiedCount: 6,
    stage: "quarter",
    totalSlots: 8,
    matches: [
      ["1º A", "BYE"],
      ["3º A", "2º B"],
      ["2º A", "3º B"],
      ["BYE", "1º B"],
    ],
  },

  // 9 Parejas: 3 zonas de 3 (A, B, C) -> 6 clasificados, Cuartos con 2 BYEs
  9: {
    couplesCount: 9,
    numZones: 3,
    qualifiedCount: 6,
    stage: "quarter",
    totalSlots: 8,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º C", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 10 Parejas: Zona A (4), Zonas B, C (3) -> 7 clasificados, Cuartos con 1 BYE
  10: {
    couplesCount: 10,
    numZones: 3,
    qualifiedCount: 7,
    stage: "quarter",
    totalSlots: 8,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º C", "2º A"],
      ["3º A", "1º B"],
    ],
  },

  // 11 Parejas: Zonas A, B (4), Zona C (3) -> 8 clasificados, Cuartos (0 BYEs)
  11: {
    couplesCount: 11,
    numZones: 3,
    qualifiedCount: 8,
    stage: "quarter",
    totalSlots: 8,
    matches: [
      ["1º A", "3º B"],
      ["2º B", "2º C"],
      ["1º C", "2º A"],
      ["3º A", "1º B"],
    ],
  },

  // 12 Parejas: 4 zonas de 3 (A, B, C, D) -> 8 clasificados, Cuartos (0 BYEs)
  12: {
    couplesCount: 12,
    numZones: 4,
    qualifiedCount: 8,
    stage: "quarter",
    totalSlots: 8,
    matches: [
      ["1º A", "2º B"],
      ["2º C", "1º D"],
      ["1º C", "2º D"],
      ["2º A", "1º B"],
    ],
  },

  // 13 Parejas: Zona A (4), B..D (3) -> 9 clasificados, Octavos con 7 BYEs
  13: {
    couplesCount: 13,
    numZones: 4,
    qualifiedCount: 9,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["3º A", "2º B"],
      ["2º C", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["BYE", "2º D"],
      ["2º A", "BYE"],
      ["BYE", "1º B"],
    ],
  },

  // 14 Parejas: Zonas A, B (4), C, D (3) -> 10 clasificados, Octavos con 6 BYEs
  14: {
    couplesCount: 14,
    numZones: 4,
    qualifiedCount: 10,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["3º A", "2º B"],
      ["2º C", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["BYE", "2º D"],
      ["2º A", "3º B"],
      ["BYE", "1º B"],
    ],
  },

  // 15 Parejas: 5 zonas de 3 (A..E) -> 10 clasificados, Octavos con 6 BYEs
  15: {
    couplesCount: 15,
    numZones: 5,
    qualifiedCount: 10,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º E", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["BYE", "2º E"],
      ["2º D", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 16 Parejas: Zona A (4), B..E (3) -> 11 clasificados, Octavos con 5 BYEs
  16: {
    couplesCount: 16,
    numZones: 5,
    qualifiedCount: 11,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º E", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["3º A", "2º E"],
      ["2º D", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 17 Parejas: Zonas A, B (4), C..E (3) -> 12 clasificados, Octavos con 4 BYEs
  17: {
    couplesCount: 17,
    numZones: 5,
    qualifiedCount: 12,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º E", "3º B"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["3º A", "2º E"],
      ["2º D", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 18 Parejas: 6 zonas de 3 (A..F) -> 12 clasificados, Octavos con 4 BYEs
  18: {
    couplesCount: 18,
    numZones: 6,
    qualifiedCount: 12,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º C", "2º F"],
      ["1º E", "2º B"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["2º A", "1º F"],
      ["2º E", "2º D"],
      ["BYE", "1º B"],
    ],
  },

  // 19 Parejas: Zona A (4), B..F (3) -> 13 clasificados, Octavos con 3 BYEs
  19: {
    couplesCount: 19,
    numZones: 6,
    qualifiedCount: 13,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º C", "2º F"],
      ["1º E", "2º B"],
      ["3º A", "1º D"],
      ["1º C", "BYE"],
      ["2º A", "1º F"],
      ["2º E", "2º D"],
      ["BYE", "1º B"],
    ],
  },

  // 20 Parejas: Zonas A, B (4), C..F (3) -> 14 clasificados, Octavos con 2 BYEs
  20: {
    couplesCount: 20,
    numZones: 6,
    qualifiedCount: 14,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º C", "2º F"],
      ["1º E", "2º B"],
      ["3º A", "1º D"],
      ["1º C", "3º B"],
      ["2º A", "1º F"],
      ["2º E", "2º D"],
      ["BYE", "1º B"],
    ],
  },

  // 21 Parejas: 7 zonas de 3 (A..G) -> 14 clasificados, Octavos con 2 BYEs
  21: {
    couplesCount: 21,
    numZones: 7,
    qualifiedCount: 14,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º F", "2º G"],
      ["1º E", "2º C"],
      ["2º B", "1º D"],
      ["1º C", "2º A"],
      ["2º D", "1º F"],
      ["1º G", "2º E"],
      ["BYE", "1º B"],
    ],
  },

  // 22 Parejas: Zona A (4), B..G (3) -> 15 clasificados, Octavos con 1 BYE
  22: {
    couplesCount: 22,
    numZones: 7,
    qualifiedCount: 15,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "BYE"],
      ["2º F", "2º G"],
      ["1º E", "2º C"],
      ["2º B", "1º D"],
      ["1º C", "2º A"],
      ["2º D", "1º F"],
      ["1º G", "2º E"],
      ["3º A", "1º B"],
    ],
  },

  // 23 Parejas: Zonas A, B (4), C..G (3) -> 16 clasificados, Octavos (0 BYEs)
  23: {
    couplesCount: 23,
    numZones: 7,
    qualifiedCount: 16,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "3º B"],
      ["2º F", "2º G"],
      ["1º E", "2º C"],
      ["2º B", "1º D"],
      ["1º C", "2º A"],
      ["2º D", "1º F"],
      ["1º G", "2º E"],
      ["3º A", "1º B"],
    ],
  },

  // 24 Parejas: 8 zonas de 3 (A..H) -> 16 clasificados, Octavos (0 BYEs)
  24: {
    couplesCount: 24,
    numZones: 8,
    qualifiedCount: 16,
    stage: "round_of_16",
    totalSlots: 16,
    matches: [
      ["1º A", "2º B"],
      ["2º G", "1º H"],
      ["1º E", "2º F"],
      ["2º C", "1º D"],
      ["1º C", "2º D"],
      ["2º E", "1º F"],
      ["1º G", "2º H"],
      ["2º A", "1º B"],
    ],
  },

  // 25 Parejas: Zona A (4), B..H (3) -> 17 clasificados, 16avos con 15 BYEs
  25: {
    couplesCount: 25,
    numZones: 8,
    qualifiedCount: 17,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["3º A", "2º B"],
      ["2º G", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º F"],
      ["2º C", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["BYE", "2º D"],
      ["2º E", "BYE"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "2º H"],
      ["2º A", "BYE"],
      ["BYE", "1º B"],
    ],
  },

  // 26 Parejas: Zonas A, B (4), C..H (3) -> 18 clasificados, 16avos con 14 BYEs
  26: {
    couplesCount: 26,
    numZones: 8,
    qualifiedCount: 18,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["3º A", "2º B"],
      ["2º G", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º F"],
      ["2º C", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["BYE", "2º D"],
      ["2º E", "BYE"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "2º H"],
      ["2º A", "3º B"],
      ["BYE", "1º B"],
    ],
  },

  // 27 Parejas: 9 zonas de 3 (A..I) -> 18 clasificados, 16avos con 14 BYEs
  27: {
    couplesCount: 27,
    numZones: 9,
    qualifiedCount: 18,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º I", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º G"],
      ["2º F", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["BYE", "2º E"],
      ["2º H", "BYE"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "2º I"],
      ["2º D", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 28 Parejas: Zona A (4), B..I (3) -> 19 clasificados, 16avos con 13 BYEs
  28: {
    couplesCount: 28,
    numZones: 9,
    qualifiedCount: 19,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º I", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º G"],
      ["2º F", "BYE"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["3º A", "2º E"],
      ["2º H", "BYE"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "2º I"],
      ["2º D", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 29 Parejas: Zonas A, B (4), C..I (3) -> 20 clasificados, 16avos con 12 BYEs
  29: {
    couplesCount: 29,
    numZones: 9,
    qualifiedCount: 20,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["2º B", "2º C"],
      ["1º I", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º G"],
      ["2º F", "3º B"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["3º A", "2º E"],
      ["2º H", "BYE"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "2º I"],
      ["2º D", "2º A"],
      ["BYE", "1º B"],
    ],
  },

  // 30 Parejas: 10 zonas de 3 (A..J) -> 20 clasificados, 16avos con 12 BYEs
  30: {
    couplesCount: 30,
    numZones: 10,
    qualifiedCount: 20,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["2º C", "2º F"],
      ["1º I", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º J"],
      ["2º G", "2º B"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["2º A", "2º H"],
      ["2º I", "BYE"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "1º J"],
      ["2º E", "2º D"],
      ["BYE", "1º B"],
    ],
  },

  // 31 Parejas: Zona A (4), B..J (3) -> 21 clasificados, 16avos con 11 BYEs
  31: {
    couplesCount: 31,
    numZones: 10,
    qualifiedCount: 21,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["2º C", "2º F"],
      ["1º I", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "BYE"],
      ["BYE", "2º J"],
      ["2º G", "2º B"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["2º A", "2º H"],
      ["2º I", "3º A"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "1º J"],
      ["2º E", "2º D"],
      ["BYE", "1º B"],
    ],
  },

  // 32 Parejas: Zonas A, B (4), C..J (3) -> 22 clasificados, 16avos con 10 BYEs
  32: {
    couplesCount: 32,
    numZones: 10,
    qualifiedCount: 22,
    stage: "round_of_32",
    totalSlots: 32,
    matches: [
      ["1º A", "BYE"],
      ["2º C", "2º F"],
      ["1º I", "BYE"],
      ["BYE", "1º H"],
      ["1º E", "3º B"],
      ["BYE", "2º J"],
      ["2º G", "2º B"],
      ["BYE", "1º D"],
      ["1º C", "BYE"],
      ["2º A", "2º H"],
      ["2º I", "3º A"],
      ["BYE", "1º F"],
      ["1º G", "BYE"],
      ["BYE", "1º J"],
      ["2º E", "2º D"],
      ["BYE", "1º B"],
    ],
  },
};

/**
 * Busca la plantilla FAP correspondiente a partir de la cantidad de zonas y clasificados,
 * o a partir del total de parejas si se conoce.
 */
export function findFAPTemplate(
  numZones: number,
  qualifiedCount: number,
  couplesCount?: number
): FAPDrawTemplate | null {
  if (couplesCount && FAP_DRAW_TEMPLATES[couplesCount]) {
    const t = FAP_DRAW_TEMPLATES[couplesCount];
    if (t.numZones === numZones && t.qualifiedCount === qualifiedCount) {
      return t;
    }
  }

  // Buscar coincidencia biyectiva (numZones, qualifiedCount)
  for (const template of Object.values(FAP_DRAW_TEMPLATES)) {
    if (template.numZones === numZones && template.qualifiedCount === qualifiedCount) {
      return template;
    }
  }

  return null;
}

/**
 * Construye un mapa determinista de identificadores de zona a letras ("A", "B", "C", ...).
 * Reconoce nombres como "Zona A", "Grupo B", "A", etc. Si no tienen letra explícita,
 * asigna letras según el ordenamiento canónico de nombres/ids de zona.
 */
export function buildZoneLetterMap(qualifiedPairs: QualifiedPair[]): Map<string, string> {
  const map = new Map<string, string>(); // zoneKey -> letter

  // Recopilar zonas únicas preservando información
  const uniqueZones = new Map<string, { zoneName: string; zoneId?: string }>();
  for (const p of qualifiedPairs) {
    const key = p.zoneId || p.zoneName;
    if (!uniqueZones.has(key)) {
      uniqueZones.set(key, { zoneName: p.zoneName, zoneId: p.zoneId });
    }
  }

  const zoneList = Array.from(uniqueZones.entries());

  // Intentar detectar si las zonas tienen letras directas (A, B, C...) en su nombre
  const explicitLetters = new Map<string, string>();
  for (const [key, info] of zoneList) {
    const match = info.zoneName.match(/\b([A-Z])\b/i);
    if (match) {
      explicitLetters.set(key, match[1].toUpperCase());
    }
  }

  // Si todas las zonas tienen letras únicas explícitas, usarlas
  if (
    explicitLetters.size === zoneList.length &&
    new Set(explicitLetters.values()).size === zoneList.length
  ) {
    for (const [key, letter] of explicitLetters.entries()) {
      map.set(key, letter);
    }
    return map;
  }

  // En caso contrario, ordenar zonas alfabéticamente/numéricamente y asignar A, B, C...
  zoneList.sort((a, b) => a[1].zoneName.localeCompare(b[1].zoneName, undefined, { numeric: true }));

  zoneList.forEach(([key], index) => {
    const letter = String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.
    map.set(key, letter);
  });

  return map;
}

/**
 * Resuelve una pareja calificada a partir de un token de FAP (ej: "1º A", "2º B", "3º A").
 * Devuelve undefined si el token es "BYE" o no se encuentra la pareja correspondiente.
 */
export function resolveFAPToken(
  token: string,
  qualifiedPairs: QualifiedPair[],
  zoneLetterMap: Map<string, string>
): QualifiedPair | null {
  if (token === "BYE") return null;

  // Analizar token ej "1º A" o "3º B"
  const match = token.match(/([1-4])\s*[º°|*]?\s*([A-Z])/i);
  if (!match) return null;

  const position = parseInt(match[1], 10);
  const targetLetter = match[2].toUpperCase();

  const found = qualifiedPairs.find((p) => {
    if (p.zonePosition !== position) return false;
    const key = p.zoneId || p.zoneName;
    const letter = zoneLetterMap.get(key);
    return letter === targetLetter;
  });

  return found || null;
}
