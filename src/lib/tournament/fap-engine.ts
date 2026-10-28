/**
 * MOTOR DE TORNEOS DE PÁDEL - REGLAMENTO OFICIAL FAP (Federación Argentina de Pádel)
 * 
 * Módulo de arquitectura y lógica backend para:
 * 1. Conformación y dimensionamiento de zonas (Regla N mod 3 y restricción de procedencia institucional).
 * 2. Generación de cruces por modalidad (Round Robin para zonas de 3, Doble Eliminatoria Corta para zonas de 4).
 * 3. Clasificación y resolución de desempates según reglamento FAP.
 * 4. Armado oficial de llaves eliminatorias de 32 líneas (Draw Championship > 28 parejas hasta 48 parejas).
 */

export interface FAPPair {
  id: string;
  names: string;
  ranking: number; // Menor valor = mejor ranking (1 = N° 1)
  institutionId?: string; // Club, federación o procedencia institucional
  seed?: number;
}

export interface FAPZone {
  letter: string;
  zoneIndex: number;
  capacity: 3 | 4;
  teams: FAPPair[];
  // Si excepcionalmente comparten zona parejas de la misma institución, deben cruzarse en el 1er partido
  forcedFirstMatchPairIds?: [string, string];
}

export interface FAPZoneMatch {
  matchNumber: number;
  stage: "zone";
  zoneLetter: string;
  couple1Id: string | null;
  couple2Id: string | null;
  isWinnersMatch?: boolean;
  isLosersMatch?: boolean;
  description: string;
}

export interface FAPTeamStats {
  pair: FAPPair;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  position: number;
  headToHead: Record<string, "won" | "lost" | "none">;
}

export interface QualifiedTeam {
  pair: FAPPair;
  zoneLetter: string;
  zonePosition: 1 | 2 | 3;
  token: string; // ej: "1º A", "2º B", "3º A"
  stats?: Partial<FAPTeamStats>;
}

export interface Bracket32Match {
  matchNumber: number; // 0 a 15
  token1: string;
  token2: string;
  pair1: FAPPair | null;
  pair2: FAPPair | null;
  isBye: boolean;
  advancingPair: FAPPair | null;
  description: string;
}

export interface Bracket32Result {
  totalSlots: 32;
  totalQualified: number;
  numByes: number;
  matches16vos: Bracket32Match[];
  roundName: string;
}

// ============================================================================
// 1. CONFORMACIÓN Y DIMENSIONAMIENTO DE ZONAS (FAP REGLA N MOD 3)
// ============================================================================

/**
 * Calcula la cantidad de zonas y sus capacidades reglamentarias según el Reglamento FAP:
 * - Base general: Zonas de 3 parejas.
 * - Si N mod 3 == 0: Todas las zonas son de 3 parejas.
 * - Si N mod 3 == 1: 1 zona de 4 parejas (OBLIGATORIAMENTE Zona A). Restantes de 3.
 * - Si N mod 3 == 2: 2 zonas de 4 parejas (OBLIGATORIAMENTE Zonas A y B). Restantes de 3.
 */
export function calculateFAPZoneStructure(couplesCount: number): {
  numZones: number;
  capacities: (3 | 4)[];
  remainder: number;
} {
  const N = Math.max(0, couplesCount);
  if (N < 2) {
    return { numZones: 0, capacities: [], remainder: 0 };
  }

  // Para categorías reducidas (2 a 5 parejas)
  if (N === 2 || N === 3) {
    return { numZones: 1, capacities: [N as 3], remainder: 0 };
  }
  if (N === 4) {
    return { numZones: 1, capacities: [4], remainder: 1 };
  }
  if (N === 5) {
    // 5 parejas: Zona A de 3, Zona B de 2 (o zona única de 5)
    return { numZones: 2, capacities: [3, 3], remainder: 2 };
  }

  const remainder = N % 3;
  const numZones = Math.floor(N / 3);
  const capacities: (3 | 4)[] = [];

  for (let i = 0; i < numZones; i++) {
    if (remainder === 1 && i === 0) {
      capacities.push(4); // Solo Zona A
    } else if (remainder === 2 && (i === 0 || i === 1)) {
      capacities.push(4); // Zonas A y B
    } else {
      capacities.push(3);
    }
  }

  return { numZones, capacities, remainder };
}

/**
 * Distribuye las parejas en formato Serpenteado (Snake) respetando estrictamente:
 * 1. El orden de ranking de las duplas.
 * 2. Restricción institucional: Duplas de la misma institución NO deben compartir zona.
 *    Si coincide el ranking, se ajusta la posición/zona para separarlas.
 * 3. Excepción FAP: Si no es matemáticamente evitable que compartan zona (ej: más parejas de una
 *    institución que zonas disponibles), se registra para forzar su cruce en el 1er partido de la zona.
 */
export function distributePairsSnakeWithInstitutionCheck(
  zones: FAPZone[],
  pairs: FAPPair[]
): void {
  const sortedPairs = [...pairs].sort((a, b) => a.ranking - b.ranking);
  const numZones = zones.length;
  if (numZones === 0 || sortedPairs.length === 0) return;

  // Limpiar equipos previos
  zones.forEach((z) => {
    z.teams = [];
    delete z.forcedFirstMatchPairIds;
  });

  // Generar la secuencia de rondas serpenteadas
  // Ronda 1: 0, 1, 2, ... numZones - 1
  // Ronda 2: numZones - 1, numZones - 2, ... 0
  // Ronda 3: 0, 1, 2, ... numZones - 1
  // Ronda 4 (excedentes de zonas de 4): 0, 1 (si A y B son de 4)
  const maxCapacity = Math.max(...zones.map((z) => z.capacity));

  let pairIndex = 0;
  for (let round = 0; round < maxCapacity && pairIndex < sortedPairs.length; round++) {
    const isForward = round % 2 === 0;
    const zoneIndices = Array.from({ length: numZones }, (_, i) => (isForward ? i : numZones - 1 - i));

    for (const zIdx of zoneIndices) {
      const targetZone = zones[zIdx];
      // Solo colocar si la zona admite parejas en esta ronda
      if (targetZone.teams.length >= targetZone.capacity) continue;
      if (pairIndex >= sortedPairs.length) break;

      const currentPair = sortedPairs[pairIndex];
      const instId = currentPair.institutionId?.trim();

      // Verificar si hay colisión institucional en targetZone
      const hasCollision =
        Boolean(instId) && targetZone.teams.some((t) => t.institutionId?.trim() === instId);

      if (!hasCollision) {
        // Asignación directa sin colisión
        targetZone.teams.push(currentPair);
        pairIndex++;
      } else {
        // Intentar encontrar un swap en las parejas restantes de ranking cercano para evitar colisión
        let swapped = false;
        for (let lookahead = pairIndex + 1; lookahead < Math.min(sortedPairs.length, pairIndex + numZones); lookahead++) {
          const candidatePair = sortedPairs[lookahead];
          const candInst = candidatePair.institutionId?.trim();

          // El candidato no debe tener colisión en targetZone
          const candCausesCollisionInTarget =
            Boolean(candInst) && targetZone.teams.some((t) => t.institutionId?.trim() === candInst);

          if (!candCausesCollisionInTarget) {
            // Intercambiar candidatePair con currentPair en el array
            sortedPairs[pairIndex] = candidatePair;
            sortedPairs[lookahead] = currentPair;
            targetZone.teams.push(candidatePair);
            pairIndex++;
            swapped = true;
            break;
          }
        }

        // Si no se pudo evitar el cruce institucional, se coloca y se marca para enfrentamiento obligatorio en Fecha 1
        if (!swapped) {
          const sameInstTeam = targetZone.teams.find((t) => t.institutionId?.trim() === instId);
          if (sameInstTeam && !targetZone.forcedFirstMatchPairIds) {
            targetZone.forcedFirstMatchPairIds = [sameInstTeam.id, currentPair.id];
          }
          targetZone.teams.push(currentPair);
          pairIndex++;
        }
      }
    }
  }
}

/**
 * Función principal de armado de zonas según el Reglamento Oficial FAP.
 */
export function generateZones(pairs: FAPPair[]): FAPZone[] {
  const { capacities } = calculateFAPZoneStructure(pairs.length);
  const zones: FAPZone[] = capacities.map((capacity, i) => ({
    letter: String.fromCharCode(65 + i), // A, B, C, ...
    zoneIndex: i,
    capacity,
    teams: [],
  }));

  distributePairsSnakeWithInstitutionCheck(zones, pairs);
  return zones;
}

// ============================================================================
// 2. GENERACIÓN DE PARTIDOS Y MODALIDADES DE JUEGO
// ============================================================================

/**
 * Genera el fixture de partidos para una zona:
 * - Zonas de 3 parejas: Todos contra todos (Round Robin, 3 partidos).
 *   Si hubo colisión institucional forzada, ese partido DEBE ser el Partido 1.
 * - Zonas de 4 parejas: Doble eliminatoria corta FAP (4 partidos totales).
 *   Ronda 1: Mayor vs Menor ranking (P1 vs P4) y Parejas intermedias (P2 vs P3).
 *   Ronda 2: Ganadores vs Ganadores (define 1°) y Perdedores vs Perdedores (el que pierde ambos queda eliminado).
 */
export function generateFAPZoneMatches(zone: FAPZone): FAPZoneMatch[] {
  const matches: FAPZoneMatch[] = [];
  const teamIds = zone.teams.map((t) => t.id);

  if (zone.capacity === 4 && teamIds.length === 4) {
    // Zona de 4: Doble eliminatoria corta
    matches.push({
      matchNumber: 1,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: teamIds[0], // Mayor ranking
      couple2Id: teamIds[3], // Menor ranking
      description: `Ronda 1: Pareja 1 vs Pareja 4`,
    });
    matches.push({
      matchNumber: 2,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: teamIds[1], // Intermedia
      couple2Id: teamIds[2], // Intermedia
      description: `Ronda 1: Pareja 2 vs Pareja 3`,
    });
    matches.push({
      matchNumber: 3,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: null, // Ganador M1
      couple2Id: null, // Ganador M2
      isWinnersMatch: true,
      description: `Ronda 2: Ganador vs Ganador (Define 1º y 2º puesto)`,
    });
    matches.push({
      matchNumber: 4,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: null, // Perdedor M1
      couple2Id: null, // Perdedor M2
      isLosersMatch: true,
      description: `Ronda 2: Perdedor vs Perdedor (Define 3º clasificado y eliminado)`,
    });
    return matches;
  }

  // Zona de 3: Round Robin (3 partidos)
  if (teamIds.length >= 3) {
    let p1 = teamIds[0];
    let p2 = teamIds[1];
    let p3 = teamIds[2];

    // Si hay cruce forzado institucional, ese cruce debe ser el Match 1
    if (zone.forcedFirstMatchPairIds) {
      const [f1, f2] = zone.forcedFirstMatchPairIds;
      if (teamIds.includes(f1) && teamIds.includes(f2)) {
        p1 = f1;
        p2 = f2;
        p3 = teamIds.find((id) => id !== f1 && id !== f2) || teamIds[2];
      }
    }

    matches.push({
      matchNumber: 1,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: p1,
      couple2Id: p2,
      description: `Partido 1: ${zone.forcedFirstMatchPairIds ? "Cruce institucional prioritario" : "P1 vs P2"}`,
    });
    matches.push({
      matchNumber: 2,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: p2,
      couple2Id: p3,
      description: `Partido 2: P2 vs P3`,
    });
    matches.push({
      matchNumber: 3,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: p1,
      couple2Id: p3,
      description: `Partido 3: P1 vs P3`,
    });
    return matches;
  }

  // Fallback para 2 parejas
  if (teamIds.length === 2) {
    matches.push({
      matchNumber: 1,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: teamIds[0],
      couple2Id: teamIds[1],
      description: `Partido único: P1 vs P2`,
    });
  }

  return matches;
}

// ============================================================================
// 3. CLASIFICACIÓN Y DESEMPATES FAP
// ============================================================================

export interface ZoneResolvedResults {
  zoneLetter: string;
  capacity: 3 | 4;
  standings: {
    pair: FAPPair;
    position: 1 | 2 | 3 | 4;
    points: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
    setsDiff: number;
    gamesDiff: number;
  }[];
}

/**
 * Resuelve las parejas clasificadas de cada zona según el Reglamento FAP:
 * - En zonas de 3: Pasan exactamente 2 parejas (1° y 2°). La 3° queda eliminada.
 * - En zonas de 4: Pasan 3 parejas (1°, 2° y 3°). La 4° (perdedora de ambos partidos) queda eliminada.
 */
export function resolveQualifiers(zonesResults: ZoneResolvedResults[]): {
  firsts: QualifiedTeam[];
  seconds: QualifiedTeam[];
  thirds: QualifiedTeam[];
} {
  const firsts: QualifiedTeam[] = [];
  const seconds: QualifiedTeam[] = [];
  const thirds: QualifiedTeam[] = [];

  for (const zone of zonesResults) {
    const sorted = [...zone.standings].sort((a, b) => a.position - b.position);

    if (sorted.length >= 1 && sorted[0]) {
      firsts.push({
        pair: sorted[0].pair,
        zoneLetter: zone.zoneLetter,
        zonePosition: 1,
        token: `1º ${zone.zoneLetter}`,
        stats: sorted[0],
      });
    }

    if (sorted.length >= 2 && sorted[1]) {
      seconds.push({
        pair: sorted[1].pair,
        zoneLetter: zone.zoneLetter,
        zonePosition: 2,
        token: `2º ${zone.zoneLetter}`,
        stats: sorted[1],
      });
    }

    // Solo las zonas de 4 clasifican 3° puesto
    if (zone.capacity === 4 && sorted.length >= 3 && sorted[2]) {
      thirds.push({
        pair: sorted[2].pair,
        zoneLetter: zone.zoneLetter,
        zonePosition: 3,
        token: `3º ${zone.zoneLetter}`,
        stats: sorted[2],
      });
    }
  }

  return { firsts, seconds, thirds };
}

// ============================================================================
// 4. LLAVE DE 32 LÍNEAS BASE (DRAWS > 28 PAREJAS HASTA 48 PAREJAS)
// ============================================================================

/**
 * Plantillas oficiales FAP para cuadros con base de 32 slots (16avos de final).
 * Cumplen con:
 * 1. 1º A en el Partido 0 (Línea 1, cima del cuadro superior).
 * 2. 1º B en el Partido 15 (Línea 32, pie del cuadro inferior).
 * 3. 1º C y 1º D en extremos opuestos de los cuadrantes medios.
 * 4. Pases directos (BYE) otorgados estrictamente a los 1° de zona prioritarios.
 * 5. Los 3° de zonas de 4 (3º A y 3º B) NUNCA reciben BYE y juegan 16vos.
 * 6. Ningún cruce de primera ronda enfrenta duplas de la misma zona.
 */
export const FAP_32_BASE_TEMPLATES: Record<number, [string, string][]> = {
  // 28 Parejas: 1 de 4 (A) + 8 de 3 (B..I) -> 19 clasificados, 13 BYEs, 3 partidos en 16vos
  28: [
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

  // 29 Parejas: 2 de 4 (A y B) + 7 de 3 (C..I) -> 20 clasificados, 12 BYEs, 4 partidos en 16vos
  29: [
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

  // 30 Parejas: 10 de 3 (A..J) -> 20 clasificados, 12 BYEs, 4 partidos en 16vos
  30: [
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

  // 31 Parejas: 1 de 4 (A) + 9 de 3 (B..J) -> 21 clasificados, 11 BYEs, 5 partidos en 16vos
  31: [
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

  // 32 Parejas: 2 de 4 (A y B) + 8 de 3 (C..J) -> 22 clasificados, 10 BYEs, 6 partidos en 16vos
  32: [
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

  // 33 Parejas: 11 de 3 (A..K) -> 22 clasificados, 10 BYEs, 6 partidos en 16vos
  33: [
    ["1º A", "BYE"],
    ["2º C", "2º F"],
    ["1º I", "BYE"],
    ["BYE", "1º H"],
    ["1º E", "2º K"],
    ["BYE", "2º J"],
    ["2º G", "2º B"],
    ["BYE", "1º D"],
    ["1º C", "BYE"],
    ["2º A", "2º H"],
    ["2º I", "1º K"],
    ["BYE", "1º F"],
    ["1º G", "BYE"],
    ["BYE", "1º J"],
    ["2º E", "2º D"],
    ["BYE", "1º B"],
  ],

  // 34 Parejas: 1 de 4 (A) + 10 de 3 (B..K) -> 23 clasificados, 9 BYEs, 7 partidos en 16vos
  34: [
    ["1º A", "BYE"],
    ["2º C", "2º F"],
    ["1º I", "BYE"],
    ["BYE", "1º H"],
    ["1º E", "2º K"],
    ["3º A", "2º J"],
    ["2º G", "2º B"],
    ["BYE", "1º D"],
    ["1º C", "BYE"],
    ["2º A", "2º H"],
    ["2º I", "1º K"],
    ["BYE", "1º F"],
    ["1º G", "BYE"],
    ["BYE", "1º J"],
    ["2º E", "2º D"],
    ["BYE", "1º B"],
  ],

  // 35 Parejas: 2 de 4 (A y B) + 9 de 3 (C..K) -> 24 clasificados, 8 BYEs, 8 partidos en 16vos
  35: [
    ["1º A", "BYE"],
    ["2º C", "2º F"],
    ["1º I", "3º B"],
    ["BYE", "1º H"],
    ["1º E", "2º K"],
    ["3º A", "2º J"],
    ["2º G", "2º B"],
    ["BYE", "1º D"],
    ["1º C", "BYE"],
    ["2º A", "2º H"],
    ["2º I", "1º K"],
    ["BYE", "1º F"],
    ["1º G", "BYE"],
    ["BYE", "1º J"],
    ["2º E", "2º D"],
    ["BYE", "1º B"],
  ],

  // 36 Parejas: 12 de 3 (A..L) -> 24 clasificados, 8 BYEs, 8 partidos en 16vos
  36: [
    ["1º A", "BYE"],
    ["2º C", "2º F"],
    ["1º I", "2º L"],
    ["BYE", "1º H"],
    ["1º E", "2º K"],
    ["1º L", "2º J"],
    ["2º G", "2º B"],
    ["BYE", "1º D"],
    ["1º C", "BYE"],
    ["2º A", "2º H"],
    ["2º I", "1º K"],
    ["BYE", "1º F"],
    ["1º G", "BYE"],
    ["BYE", "1º J"],
    ["2º E", "2º D"],
    ["BYE", "1º B"],
  ],

  // 48 Parejas: 16 de 3 (A..P) -> 32 clasificados, 0 BYEs, 16 partidos completos en 16vos
  48: [
    ["1º A", "2º P"],
    ["2º C", "2º F"],
    ["1º I", "2º L"],
    ["2º M", "1º H"],
    ["1º E", "2º K"],
    ["1º L", "2º J"],
    ["2º G", "2º B"],
    ["2º N", "1º D"],
    ["1º C", "2º O"],
    ["2º A", "2º H"],
    ["2º I", "1º K"],
    ["2º P", "1º F"],
    ["1º G", "2º M"],
    ["2º O", "1º J"],
    ["2º E", "2º D"],
    ["1º P", "1º B"],
  ],
};

/**
 * Genera el cuadro eliminatorio base de 32 slots (Dieciseisavos de Final)
 * ensamblando los clasificados según las especificaciones FAP.
 */
export function buildBracket32(
  qualifiers: ReturnType<typeof resolveQualifiers>,
  couplesCount?: number
): Bracket32Result {
  const allTeams = [...qualifiers.firsts, ...qualifiers.seconds, ...qualifiers.thirds];
  const total = allTeams.length;
  const numByes = Math.max(0, 32 - total);

  // Crear mapa token -> QualifiedTeam (ej: "1º A" -> QualifiedTeam)
  const tokenMap = new Map<string, QualifiedTeam>();
  allTeams.forEach((q) => {
    tokenMap.set(q.token, q);
  });

  // Determinar la plantilla a usar
  let templateMatches = couplesCount && FAP_32_BASE_TEMPLATES[couplesCount]
    ? FAP_32_BASE_TEMPLATES[couplesCount]
    : null;

  if (!templateMatches) {
    // Si no hay plantilla estática exacta para esa cantidad, buscar por cantidad de clasificados
    for (const [cCount, tmpl] of Object.entries(FAP_32_BASE_TEMPLATES)) {
      const c = parseInt(cCount, 10);
      let tmplTotal = 0;
      for (const [t1, t2] of tmpl) {
        if (t1 !== "BYE") tmplTotal++;
        if (t2 !== "BYE") tmplTotal++;
      }
      if (tmplTotal === total) {
        templateMatches = tmpl;
        break;
      }
    }
  }

  // Si existe plantilla FAP predefinida
  if (templateMatches) {
    const matches16vos: Bracket32Match[] = templateMatches.map(([token1, token2], idx) => {
      const isBye = token1 === "BYE" || token2 === "BYE";
      const q1 = tokenMap.get(token1) || null;
      const q2 = tokenMap.get(token2) || null;

      const advancingPair = isBye ? (q1 ? q1.pair : q2 ? q2.pair : null) : null;

      return {
        matchNumber: idx + 1,
        token1,
        token2,
        pair1: q1 ? q1.pair : null,
        pair2: q2 ? q2.pair : null,
        isBye,
        advancingPair,
        description: `16vos #${idx + 1}: ${token1} vs ${token2}`,
      };
    });

    return {
      totalSlots: 32,
      totalQualified: total,
      numByes,
      matches16vos,
      roundName: "Dieciseisavos de Final (Cuadro de 32)",
    };
  }

  // Ensamblado algorítmico dinámico garantizando las reglas FAP
  // 1. 1º A en match 0, 1º B en match 15
  // 2. 1º de zona reciben BYEs con prioridad
  // 3. 3º A y 3º B NUNCA reciben BYE
  const matches16vos: Bracket32Match[] = [];

  // Pool de BYEs asignados a 1ºs
  const byeSlots = new Set<number>();
  let byesLeft = numByes;

  // 1º A siempre tiene BYE si numByes > 0
  if (byesLeft > 0) {
    byeSlots.add(0); // Match 0 (1º A)
    byesLeft--;
  }
  // 1º B siempre tiene BYE si numByes > 0
  if (byesLeft > 0) {
    byeSlots.add(15); // Match 15 (1º B)
    byesLeft--;
  }

  // Asignar BYEs restantes alternados entre cuadrantes
  const priorityMatches = [7, 8, 3, 11, 4, 12, 1, 14, 2, 13, 5, 10, 6, 9];
  for (const mIdx of priorityMatches) {
    if (byesLeft <= 0) break;
    byeSlots.add(mIdx);
    byesLeft--;
  }

  for (let i = 0; i < 16; i++) {
    const isBye = byeSlots.has(i);
    matches16vos.push({
      matchNumber: i + 1,
      token1: i === 0 ? "1º A" : i === 15 ? (isBye ? "BYE" : "2º B") : `Slot ${i * 2 + 1}`,
      token2: i === 0 ? (isBye ? "BYE" : "2º B") : i === 15 ? "1º B" : isBye ? "BYE" : `Slot ${i * 2 + 2}`,
      pair1: null,
      pair2: null,
      isBye,
      advancingPair: null,
      description: `16vos #${i + 1}`,
    });
  }

  return {
    totalSlots: 32,
    totalQualified: total,
    numByes,
    matches16vos,
    roundName: "Dieciseisavos de Final (Cuadro de 32)",
  };
}
