import type { Match, ZoneStanding } from "@/types/tournament";

export interface ZoneTeamStats {
  pairId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  // Registro de resultados directos contra cada rival para desempate H2H
  headToHead: Record<string, "won" | "lost" | "none">;
}

/**
 * Parsea un string de score (ej: "9-5", "9-8 (7-4)", "3-1") en games numéricos.
 */
function parseScoreNumbers(scoreStr?: string | null): { g1: number; g2: number } | null {
  if (!scoreStr) return null;
  const match = scoreStr.match(/(\d+)\s*[-/]\s*(\d+)/);
  if (!match) return null;
  return {
    g1: parseInt(match[1], 10),
    g2: parseInt(match[2], 10),
  };
}

/**
 * Extrae estadísticas de games y sets de un partido completado.
 */
function extractMatchStats(match: Match, p1Id: string, p2Id: string): {
  g1: number;
  g2: number;
  s1: number;
  s2: number;
} {
  let g1 = 0;
  let g2 = 0;
  let s1 = 0;
  let s2 = 0;

  // 1. Si tiene score_pair1 y score_pair2 estructurados
  if (match.score_pair1 && match.score_pair2) {
    g1 = match.score_pair1.games_won ?? 0;
    g2 = match.score_pair2.games_won ?? 0;

    const sets1 = match.score_pair1.sets ?? [];
    const sets2 = match.score_pair2.sets ?? [];
    for (let i = 0; i < Math.min(sets1.length, sets2.length); i++) {
      if (sets1[i] > sets2[i]) s1++;
      else if (sets2[i] > sets1[i]) s2++;
    }
    return { g1, g2, s1, s2 };
  }

  // 2. Si tiene scores en columnas de sets (score_set1, score_set2, score_super_tb)
  const set1Parsed = parseScoreNumbers(match.score_set1);
  if (set1Parsed) {
    g1 += set1Parsed.g1;
    g2 += set1Parsed.g2;
    if (set1Parsed.g1 > set1Parsed.g2) s1++;
    else if (set1Parsed.g2 > set1Parsed.g1) s2++;
  }

  const set2Parsed = parseScoreNumbers(match.score_set2);
  if (set2Parsed) {
    g1 += set2Parsed.g1;
    g2 += set2Parsed.g2;
    if (set2Parsed.g1 > set2Parsed.g2) s1++;
    else if (set2Parsed.g2 > set2Parsed.g1) s2++;
  }

  // Si hubo Super Tie-Break en set 3
  const superTbParsed = parseScoreNumbers(match.score_super_tb);
  if (superTbParsed) {
    if (superTbParsed.g1 > superTbParsed.g2) s1++;
    else if (superTbParsed.g2 > superTbParsed.g1) s2++;
  }

  // Si no hubo sets pero hay un ganador definido y era partido único de 9 games
  if (g1 === 0 && g2 === 0 && (match.winner_couple_id || match.winner_id)) {
    const winnerId = match.winner_couple_id || match.winner_id;
    if (winnerId === p1Id) {
      g1 = 9;
      g2 = 0;
      s1 = 1;
    } else if (winnerId === p2Id) {
      g1 = 0;
      g2 = 9;
      s2 = 1;
    }
  }

  return { g1, g2, s1, s2 };
}

/**
 * Calcula la tabla de posiciones de una zona en formato Round-Robin.
 * Criterios oficiales de desempate SPT / FIP:
 * 1. Puntos (PG = 2 pts, PP = 1 pt por jugar, WO = 0 pts)
 * 2. Enfrentamiento directo (Head-to-head) en caso de empate de 2 parejas
 * 3. Diferencia de sets (sets a favor - sets en contra)
 * 4. Diferencia de games (games a favor - games en contra)
 * 5. Mayor cantidad de games ganados (a favor)
 * 6. Menor cantidad de games recibidos (en contra)
 */
export function calculateRoundRobinStandings(
  matches: Match[],
  pairIds: string[]
): ZoneStanding[] {
  const standings: Record<string, ZoneTeamStats> = {};

  // Inicialización de estadísticas para cada pareja de la zona
  pairIds.forEach((id) => {
    standings[id] = {
      pairId: id,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
      headToHead: {},
    };
  });

  // Procesar cada partido completado de la zona
  matches
    .filter((m) => m.status === "completed")
    .forEach((match) => {
      const p1Id = match.couple1_id || match.pair1_id;
      const p2Id = match.couple2_id || match.pair2_id;
      if (!p1Id || !p2Id) return;

      const s1 = standings[p1Id];
      const s2 = standings[p2Id];
      if (!s1 || !s2) return;

      s1.matchesPlayed++;
      s2.matchesPlayed++;

      const { g1, g2, s1: sets1, s2: sets2 } = extractMatchStats(match, p1Id, p2Id);
      s1.gamesWon += g1;
      s1.gamesLost += g2;
      s2.gamesWon += g2;
      s2.gamesLost += g1;

      s1.setsWon += sets1;
      s1.setsLost += sets2;
      s2.setsWon += sets2;
      s2.setsLost += sets1;

      const winnerId = match.winner_couple_id || match.winner_id;
      if (winnerId === p1Id) {
        s1.matchesWon++;
        s1.points += 2; // Victoria = 2 pts
        s2.matchesLost++;
        s2.points += 1; // Derrota jugada = 1 pt
        s1.headToHead[p2Id] = "won";
        s2.headToHead[p1Id] = "lost";
      } else if (winnerId === p2Id) {
        s2.matchesWon++;
        s2.points += 2;
        s1.matchesLost++;
        s1.points += 1;
        s2.headToHead[p1Id] = "won";
        s1.headToHead[p2Id] = "lost";
      } else {
        // En pádel oficial no hay empates, pero como salvaguarda:
        s1.points += 1;
        s2.points += 1;
      }
    });

  const list = Object.values(standings);

  // Contar cuántos equipos tienen cada puntaje para saber si es empate de 2 o triple
  const pointsCount: Record<number, number> = {};
  list.forEach((s) => {
    pointsCount[s.points] = (pointsCount[s.points] || 0) + 1;
  });

  // Ordenamiento con criterios de desempate oficiales SPT / FIP:
  // 1. Puntos totales
  // 2. Head-to-Head (si empatan exactamente 2 parejas en puntos)
  // 3. Diferencia de sets
  // 4. Diferencia de games
  // 5. Mayor cantidad de games a favor
  // 6. Menor cantidad de games en contra
  // 7. Head-to-Head como desempate residual
  list.sort((a, b) => {
    // 1. Puntos totales
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    // 2. Si son exactamente 2 parejas empatadas en puntos, el enfrentamiento directo tiene máxima prioridad
    if (pointsCount[a.points] === 2) {
      if (a.headToHead[b.pairId] === "won") return -1;
      if (a.headToHead[b.pairId] === "lost") return 1;
    }

    // 3. Diferencia de sets
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffB !== setDiffA) {
      return setDiffB - setDiffA;
    }

    // 4. Diferencia de games
    const gameDiffA = a.gamesWon - a.gamesLost;
    const gameDiffB = b.gamesWon - b.gamesLost;
    if (gameDiffB !== gameDiffA) {
      return gameDiffB - gameDiffA;
    }

    // 5. Mayor cantidad de games a favor
    if (b.gamesWon !== a.gamesWon) {
      return b.gamesWon - a.gamesWon;
    }

    // 6. Menor cantidad de games en contra
    if (a.gamesLost !== b.gamesLost) {
      return a.gamesLost - b.gamesLost;
    }

    // 7. H2H residual (en caso de que en un grupo de 3+, dos hayan quedado igualadas en todo lo anterior)
    if (a.headToHead[b.pairId] === "won") return -1;
    if (a.headToHead[b.pairId] === "lost") return 1;

    return 0;
  });

  return list.map((s, i) => ({
    id: `standing_${s.pairId}`,
    zone_id: "",
    pair_id: s.pairId,
    couple_id: s.pairId,
    matches_played: s.matchesPlayed,
    matches_won: s.matchesWon,
    matches_lost: s.matchesLost,
    sets_won: s.setsWon,
    sets_lost: s.setsLost,
    games_won: s.gamesWon,
    games_lost: s.gamesLost,
    points: s.points,
    position: i + 1,
  }));
}

/**
 * Regla de Eliminación SPT:
 * En cada zona de 3 o 4 parejas, la PEOR clasificada (última de la tabla) queda eliminada.
 * Todas las demás avanzan a eliminación directa (cuadro principal).
 *
 * - Zona de 3 parejas -> Clasifican 2 parejas (1° y 2°). Queda eliminada la 3°.
 * - Zona de 4 parejas -> Clasifican 3 parejas (1°, 2° y 3°). Queda eliminada la 4°.
 */
export function getQualifiedPairs(
  standings: ZoneStanding[]
): ZoneStanding[] {
  if (!standings || standings.length <= 1) return standings;
  // Se excluye a la última clasificada (la peor de la zona)
  return standings.slice(0, standings.length - 1);
}

/**
 * Devuelve la pareja eliminada de la zona (la peor clasificada).
 */
export function getEliminatedPair(
  standings: ZoneStanding[]
): ZoneStanding | null {
  if (!standings || standings.length <= 1) return null;
  return standings[standings.length - 1];
}
