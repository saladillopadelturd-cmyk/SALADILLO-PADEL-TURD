/**
 * MOTOR DE TORNEOS DE PÁDEL - REGLAMENTO OFICIAL FAP (Federación Argentina de Pádel)
 * 
 * Alcance: Fase de Zonas (Estructura, Conformación, Modalidad de Juego y Definición de Clasificados)
 * 
 * 1. REGLAS DE ESTRUCTURA Y CONFORMACIÓN DE ZONAS
 *    - Base general: Zonas de 3 parejas.
 *    - Excedentes (Módulo 3):
 *      - N mod 3 == 0: Todas las zonas son de 3 parejas.
 *      - N mod 3 == 1: 1 zona de 4 parejas (OBLIGATORIAMENTE Zona A). Restantes de 3.
 *      - N mod 3 == 2: 2 zonas de 4 parejas (OBLIGATORIAMENTE Zonas A y B). Restantes de 3.
 *    - Procedencia institucional (Restricción de no enfrentamiento):
 *      - Parejas de una misma institución/federación no pueden compartir zona.
 *      - Si excepcionalmente coinciden, se enfrentan OBLIGATORIAMENTE en el PRIMER PARTIDO de la zona.
 * 
 * 2. MODALIDAD DE JUEGO Y DEFINICIÓN DE CLASIFICADOS
 *    - Zonas de 3 parejas:
 *      - Round Robin (todos contra todos, 3 partidos totales).
 *      - Clasifican exactamente 2 parejas (1° y 2°). El 3° queda eliminado.
 *      - Criterios de desempate oficiales FAP:
 *        1. Diferencia de sets.
 *        2. Diferencia de games.
 *        3. Games a favor.
 *        4. Games en contra.
 *        5. Resultado en cancha / enfrentamiento directo (H2H).
 *    - Zonas de 4 parejas:
 *      - Doble eliminatoria corta (4 partidos totales):
 *        Ronda 1: Mayor ranking vs Menor ranking (P1 vs P4), intermedias entre sí (P2 vs P3).
 *        Ronda 2: Ganador vs Ganador (define 1° y 2°) y Perdedor vs Perdedor (define 3° clasificado y 4° eliminado).
 *      - Clasifican exactamente 3 parejas (1°, 2° y 3°). El que pierde sus 2 partidos queda eliminado.
 *      - Criterios de desempate oficiales FAP:
 *        1. Resultado en cancha.
 *        2. Diferencia de sets.
 *        3. Diferencia de games.
 *        4. Games a favor.
 *        5. Games en contra.
 *        6. Sorteo.
 */

export interface FAPPair {
  id: string;
  names: string;
  ranking: number; // Menor valor numérico = mejor ranking deportivo (1 = N° 1)
  institutionId?: string; // Club, federación o entidad de procedencia
  seed?: number;
}

export interface FAPZone {
  letter: string;
  zoneIndex: number;
  capacity: 3 | 4;
  teams: FAPPair[];
  // Registro de colisión institucional inevitable para forzar el cruce en Fecha 1
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

// ============================================================================
// 1. REGLAS DE ESTRUCTURA Y CONFORMACIÓN DE ZONAS (N MOD 3)
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

  // Categorías reducidas excepcionales (2 a 5 parejas)
  if (N === 2 || N === 3) {
    return { numZones: 1, capacities: [N as 3], remainder: 0 };
  }
  if (N === 4) {
    return { numZones: 1, capacities: [4], remainder: 1 };
  }
  if (N === 5) {
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
 * Distribuye las parejas en formato Serpenteado (Snake) respetando:
 * 1. Orden de ranking deportivo de las parejas.
 * 2. Restricción institucional: Las parejas de una misma institución NO pueden compartir zona.
 *    Si el ranking determina coincidencia, se ajusta la posición/zona para separarlas.
 * 3. Excepción FAP: Si la coincidencia es matemáticamente inevitable (ej: más parejas de un mismo
 *    club que zonas totales), se registra para obligar su cruce en el primer partido de la zona.
 */
export function distributePairsSnakeWithInstitutionCheck(
  zones: FAPZone[],
  pairs: FAPPair[]
): void {
  const sortedPairs = [...pairs].sort((a, b) => a.ranking - b.ranking);
  const numZones = zones.length;
  if (numZones === 0 || sortedPairs.length === 0) return;

  // Limpiar estados previos
  zones.forEach((z) => {
    z.teams = [];
    delete z.forcedFirstMatchPairIds;
  });

  const maxCapacity = Math.max(...zones.map((z) => z.capacity));

  let pairIndex = 0;
  for (let round = 0; round < maxCapacity && pairIndex < sortedPairs.length; round++) {
    const isForward = round % 2 === 0;
    const zoneIndices = Array.from({ length: numZones }, (_, i) => (isForward ? i : numZones - 1 - i));

    for (const zIdx of zoneIndices) {
      const targetZone = zones[zIdx];
      if (targetZone.teams.length >= targetZone.capacity) continue;
      if (pairIndex >= sortedPairs.length) break;

      const currentPair = sortedPairs[pairIndex];
      const instId = currentPair.institutionId?.trim();

      // Verificar si ya existe una pareja de esa misma institución en targetZone
      const hasCollision =
        Boolean(instId) && targetZone.teams.some((t) => t.institutionId?.trim() === instId);

      if (!hasCollision) {
        targetZone.teams.push(currentPair);
        pairIndex++;
      } else {
        // Buscar un candidato de swap en rankings cercanos para evitar la coincidencia
        let swapped = false;
        for (
          let lookahead = pairIndex + 1;
          lookahead < Math.min(sortedPairs.length, pairIndex + numZones);
          lookahead++
        ) {
          const candidatePair = sortedPairs[lookahead];
          const candInst = candidatePair.institutionId?.trim();

          const candCausesCollisionInTarget =
            Boolean(candInst) && targetZone.teams.some((t) => t.institutionId?.trim() === candInst);

          if (!candCausesCollisionInTarget) {
            sortedPairs[pairIndex] = candidatePair;
            sortedPairs[lookahead] = currentPair;
            targetZone.teams.push(candidatePair);
            pairIndex++;
            swapped = true;
            break;
          }
        }

        // Si no se pudo evitar matemáticamente, se asigna y se marca para cruce en Partido 1
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
 * Función principal para generar las zonas cumpliendo el Reglamento FAP.
 */
export function generateZones(pairs: FAPPair[]): FAPZone[] {
  const { capacities } = calculateFAPZoneStructure(pairs.length);
  const zones: FAPZone[] = capacities.map((capacity, i) => ({
    letter: String.fromCharCode(65 + i), // Zona A, B, C...
    zoneIndex: i,
    capacity,
    teams: [],
  }));

  distributePairsSnakeWithInstitutionCheck(zones, pairs);
  return zones;
}

// ============================================================================
// 2. MODALIDAD DE JUEGO Y GENERACIÓN DE FIXTURES DE ZONA
// ============================================================================

/**
 * Genera los partidos oficiales de una zona:
 * - Zonas de 3 parejas: Round Robin (3 partidos totales).
 *   Si hubo colisión institucional forzada, ese enfrentamiento es OBLIGATORIAMENTE el Partido 1.
 * - Zonas de 4 parejas: Doble eliminatoria corta (4 partidos totales).
 *   Ronda 1: Mayor ranking vs Menor ranking (P1 vs P4) y Parejas intermedias (P2 vs P3).
 *   Ronda 2: Ganador vs Ganador (define 1° y 2°) y Perdedor vs Perdedor (define 3° y 4° eliminado).
 */
export function generateFAPZoneMatches(zone: FAPZone): FAPZoneMatch[] {
  const matches: FAPZoneMatch[] = [];
  const teamIds = zone.teams.map((t) => t.id);

  if (zone.capacity === 4 && teamIds.length === 4) {
    // Zona de 4: Doble eliminatoria corta FAP
    matches.push({
      matchNumber: 1,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: teamIds[0], // Mayor ranking (P1)
      couple2Id: teamIds[3], // Menor ranking (P4)
      description: "Ronda 1: Mayor ranking (P1) vs Menor ranking (P4)",
    });
    matches.push({
      matchNumber: 2,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: teamIds[1], // Intermedia (P2)
      couple2Id: teamIds[2], // Intermedia (P3)
      description: "Ronda 1: Parejas intermedias (P2 vs P3)",
    });
    matches.push({
      matchNumber: 3,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: null, // Ganador Partido 1
      couple2Id: null, // Ganador Partido 2
      isWinnersMatch: true,
      description: "Ronda 2: Ganadores vs Ganadores (Define 1° y 2° puesto)",
    });
    matches.push({
      matchNumber: 4,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: null, // Perdedor Partido 1
      couple2Id: null, // Perdedor Partido 2
      isLosersMatch: true,
      description: "Ronda 2: Perdedores vs Perdedores (Define 3° clasificado y 4° eliminado)",
    });
    return matches;
  }

  // Zona de 3: Round Robin (3 partidos)
  if (teamIds.length >= 3) {
    let p1 = teamIds[0];
    let p2 = teamIds[1];
    let p3 = teamIds[2];

    // Regla de procedencia institucional: Si deben cruzarse, OBLIGATORIAMENTE en el 1er partido
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
      description: `Partido 1: ${zone.forcedFirstMatchPairIds ? "Enfrentamiento institucional obligatorio (Fecha 1)" : "P1 vs P2"}`,
    });
    matches.push({
      matchNumber: 2,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: p2,
      couple2Id: p3,
      description: "Partido 2: P2 vs P3",
    });
    matches.push({
      matchNumber: 3,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: p1,
      couple2Id: p3,
      description: "Partido 3: P1 vs P3",
    });
    return matches;
  }

  // Categoría reducida: 2 parejas
  if (teamIds.length === 2) {
    matches.push({
      matchNumber: 1,
      stage: "zone",
      zoneLetter: zone.letter,
      couple1Id: teamIds[0],
      couple2Id: teamIds[1],
      description: "Partido único: P1 vs P2",
    });
  }

  return matches;
}

// ============================================================================
// 3. DEFINICIÓN DE TABLAS DE POSICIONES Y DESEMPATES FAP
// ============================================================================

export interface MatchResultInput {
  matchNumber?: number;
  couple1Id: string;
  couple2Id: string;
  winnerCoupleId: string;
  setsWon1: number;
  setsWon2: number;
  gamesWon1: number;
  gamesWon2: number;
  isWinnersMatch?: boolean;
  isLosersMatch?: boolean;
}

/**
 * Calcula la tabla de posiciones oficial de una zona aplicando los criterios
 * estrictos del Reglamento FAP.
 * 
 * - En Zonas de 3 parejas (Round Robin):
 *   1. Puntos (PG = 2, PP = 1, WO = 0)
 *   2. Diferencia de sets
 *   3. Diferencia de games
 *   4. Games a favor
 *   5. Games en contra
 *   6. Resultado en cancha / H2H (en empate de 2 parejas)
 * 
 * - En Zonas de 4 parejas (Doble eliminatoria corta):
 *   1° = Ganador del Partido Ganadores vs Ganadores
 *   2° = Perdedor del Partido Ganadores vs Ganadores
 *   3° = Ganador del Partido Perdedores vs Perdedores (clasifica)
 *   4° = Perdedor del Partido Perdedores vs Perdedores (eliminado con 2 derrotas)
 *   Criterios auxiliares / empates:
 *   1. Resultado en cancha
 *   2. Diferencia de sets
 *   3. Diferencia de games
 *   4. Games a favor
 *   5. Games en contra
 *   6. Sorteo
 */
export function calculateFAPZoneStandings(
  zone: FAPZone,
  completedMatches: MatchResultInput[]
): FAPTeamStats[] {
  const statsMap = new Map<string, FAPTeamStats>();

  zone.teams.forEach((pair) => {
    statsMap.set(pair.id, {
      pair,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
      position: 0,
      headToHead: {},
    });
  });

  completedMatches.forEach((m) => {
    const s1 = statsMap.get(m.couple1Id);
    const s2 = statsMap.get(m.couple2Id);
    if (!s1 || !s2) return;

    s1.matchesPlayed++;
    s2.matchesPlayed++;

    s1.setsWon += m.setsWon1;
    s1.setsLost += m.setsWon2;
    s2.setsWon += m.setsWon2;
    s2.setsLost += m.setsWon1;

    s1.gamesWon += m.gamesWon1;
    s1.gamesLost += m.gamesWon2;
    s2.gamesWon += m.gamesWon2;
    s2.gamesLost += m.gamesWon1;

    if (m.winnerCoupleId === m.couple1Id) {
      s1.matchesWon++;
      s1.points += 2;
      s2.matchesLost++;
      s2.points += 1;
      s1.headToHead[m.couple2Id] = "won";
      s2.headToHead[m.couple1Id] = "lost";
    } else if (m.winnerCoupleId === m.couple2Id) {
      s2.matchesWon++;
      s2.points += 2;
      s1.matchesLost++;
      s1.points += 1;
      s2.headToHead[m.couple1Id] = "won";
      s1.headToHead[m.couple2Id] = "lost";
    }
  });

  const list = Array.from(statsMap.values());

  // Definición oficial para Zonas de 4 parejas (Doble eliminatoria)
  if (zone.capacity === 4) {
    const winnersMatch = completedMatches.find((m) => m.isWinnersMatch || m.matchNumber === 3);
    const losersMatch = completedMatches.find((m) => m.isLosersMatch || m.matchNumber === 4);

    const positions = new Map<string, number>();

    if (winnersMatch && winnersMatch.winnerCoupleId) {
      const winner = winnersMatch.winnerCoupleId;
      const loser = winner === winnersMatch.couple1Id ? winnersMatch.couple2Id : winnersMatch.couple1Id;
      positions.set(winner, 1);
      positions.set(loser, 2);
    }

    if (losersMatch && losersMatch.winnerCoupleId) {
      const winner = losersMatch.winnerCoupleId;
      const loser = winner === losersMatch.couple1Id ? losersMatch.couple2Id : losersMatch.couple1Id;
      positions.set(winner, 3);
      positions.set(loser, 4);
    }

    if (positions.size === 4) {
      list.sort((a, b) => (positions.get(a.pair.id) || 0) - (positions.get(b.pair.id) || 0));
      list.forEach((s, i) => {
        s.position = i + 1;
      });
      return list;
    }
  }

  // Criterios oficiales de desempate FAP (Zonas de 3 parejas / general):
  // 1. Puntos totales
  // 2. Diferencia de sets
  // 3. Diferencia de games
  // 4. Games a favor
  // 5. Games en contra
  // 6. Enfrentamiento directo (Head to Head)
  list.sort((a, b) => {
    // 1. Puntos
    if (b.points !== a.points) return b.points - a.points;

    // 2. Diferencia de sets
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;

    // 3. Diferencia de games
    const gameDiffA = a.gamesWon - a.gamesLost;
    const gameDiffB = b.gamesWon - b.gamesLost;
    if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;

    // 4. Games a favor
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;

    // 5. Menor cantidad de games en contra
    if (a.gamesLost !== b.gamesLost) return a.gamesLost - b.gamesLost;

    // 6. Enfrentamiento directo
    if (a.headToHead[b.pair.id] === "won") return -1;
    if (a.headToHead[b.pair.id] === "lost") return 1;

    return 0;
  });

  list.forEach((s, i) => {
    s.position = i + 1;
  });

  return list;
}

// ============================================================================
// 4. CLASIFICADOS A SEGUNDA ETAPA SEGÚN TIPO DE ZONA
// ============================================================================

/**
 * Resuelve y retorna las parejas clasificadas a la siguiente etapa:
 * - Zonas de 3 parejas: Clasifican exactamente 2 parejas (1° y 2°). El 3° queda eliminado.
 * - Zonas de 4 parejas: Clasifican exactamente 3 parejas (1°, 2° y 3°). El 4° (doble derrota) queda eliminado.
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

    // 1° puesto siempre clasifica
    if (sorted.length >= 1 && sorted[0]) {
      firsts.push({
        pair: sorted[0].pair,
        zoneLetter: zone.zoneLetter,
        zonePosition: 1,
        token: `1º ${zone.zoneLetter}`,
        stats: sorted[0],
      });
    }

    // 2° puesto siempre clasifica
    if (sorted.length >= 2 && sorted[1]) {
      seconds.push({
        pair: sorted[1].pair,
        zoneLetter: zone.zoneLetter,
        zonePosition: 2,
        token: `2º ${zone.zoneLetter}`,
        stats: sorted[1],
      });
    }

    // 3° puesto: SOLO clasifica en zonas de 4 parejas (en zonas de 3 el 3° queda eliminado)
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
