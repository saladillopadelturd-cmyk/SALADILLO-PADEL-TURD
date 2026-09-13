import type { Match } from "@/types/tournament";

/**
 * Escala oficial de puntos Saladillo Padel Tour (SPT).
 */
export const SPT_POINTS_SCALE = {
  champion: 100, // Campeón
  runner_up: 70, // Subcampeón
  semifinalist: 50, // Semifinalista (3° y 4° puesto)
  quarterfinalist: 30, // Cuartofinalista (5° al 8°)
  round_of_16: 15, // Octavofinalista (9° al 16°)
  group_stage: 10, // Fase de zonas / Participación
} as const;

export type TournamentStageReached = keyof typeof SPT_POINTS_SCALE;

/**
 * Genera una clave canónica para identificar la pareja independientemente del orden de los jugadores.
 */
export function getCoupleKey(p1Id: string, p2Id: string): string {
  return [p1Id, p2Id].sort().join("_");
}

export interface CoupleTournamentStats {
  coupleId: string;
  player1Id: string;
  player2Id: string;
  coupleKey: string;
  matchesWon: number;
  matchesLost: number;
  highestStage: TournamentStageReached;
  pointsEarned: number;
  finalPosition: number;
}

export interface CoupleRankingRecord {
  coupleKey: string;
  player1Id: string;
  player2Id: string;
  category: string;
  points: number;
  tournamentsPlayed: number;
  matchesWon: number;
  matchesLost: number;
}

export interface IndividualRankingRecord {
  playerId: string;
  category: string;
  points: number;
  tournamentsPlayed: number;
  matchesWon: number;
  matchesLost: number;
}

/**
 * Determina el resultado y puntos obtenidos por cada pareja en un torneo según sus partidos.
 */
export function calculateTournamentStageStats(
  matches: Match[],
  couples: { id: string; player1_id: string; player2_id: string }[]
): Record<string, CoupleTournamentStats> {
  const statsMap: Record<string, CoupleTournamentStats> = {};

  couples.forEach((c) => {
    statsMap[c.id] = {
      coupleId: c.id,
      player1Id: c.player1_id,
      player2Id: c.player2_id,
      coupleKey: getCoupleKey(c.player1_id, c.player2_id),
      matchesWon: 0,
      matchesLost: 0,
      highestStage: "group_stage",
      pointsEarned: SPT_POINTS_SCALE.group_stage,
      finalPosition: 16,
    };
  });

  const completedMatches = matches.filter((m) => m.status === "completed");

  completedMatches.forEach((m) => {
    const c1 = m.couple1_id || m.pair1_id;
    const c2 = m.couple2_id || m.pair2_id;
    const winner = m.winner_couple_id || m.winner_id;

    if (c1 && statsMap[c1]) {
      if (winner === c1) statsMap[c1].matchesWon++;
      else if (winner === c2) statsMap[c1].matchesLost++;
    }
    if (c2 && statsMap[c2]) {
      if (winner === c2) statsMap[c2].matchesWon++;
      else if (winner === c1) statsMap[c2].matchesLost++;
    }

    // Progreso en etapas eliminatorias
    if (m.stage === "round_of_16") {
      if (c1 && statsMap[c1] && statsMap[c1].pointsEarned < SPT_POINTS_SCALE.round_of_16) {
        statsMap[c1].highestStage = "round_of_16";
        statsMap[c1].pointsEarned = SPT_POINTS_SCALE.round_of_16;
        statsMap[c1].finalPosition = 9;
      }
      if (c2 && statsMap[c2] && statsMap[c2].pointsEarned < SPT_POINTS_SCALE.round_of_16) {
        statsMap[c2].highestStage = "round_of_16";
        statsMap[c2].pointsEarned = SPT_POINTS_SCALE.round_of_16;
        statsMap[c2].finalPosition = 9;
      }
    }

    if (m.stage === "quarter") {
      if (c1 && statsMap[c1] && statsMap[c1].pointsEarned < SPT_POINTS_SCALE.quarterfinalist) {
        statsMap[c1].highestStage = "quarterfinalist";
        statsMap[c1].pointsEarned = SPT_POINTS_SCALE.quarterfinalist;
        statsMap[c1].finalPosition = 5;
      }
      if (c2 && statsMap[c2] && statsMap[c2].pointsEarned < SPT_POINTS_SCALE.quarterfinalist) {
        statsMap[c2].highestStage = "quarterfinalist";
        statsMap[c2].pointsEarned = SPT_POINTS_SCALE.quarterfinalist;
        statsMap[c2].finalPosition = 5;
      }
    }

    if (m.stage === "semi") {
      if (c1 && statsMap[c1] && statsMap[c1].pointsEarned < SPT_POINTS_SCALE.semifinalist) {
        statsMap[c1].highestStage = "semifinalist";
        statsMap[c1].pointsEarned = SPT_POINTS_SCALE.semifinalist;
        statsMap[c1].finalPosition = 3;
      }
      if (c2 && statsMap[c2] && statsMap[c2].pointsEarned < SPT_POINTS_SCALE.semifinalist) {
        statsMap[c2].highestStage = "semifinalist";
        statsMap[c2].pointsEarned = SPT_POINTS_SCALE.semifinalist;
        statsMap[c2].finalPosition = 3;
      }
    }
  });

  // Finalistas: Campeón y Subcampeón
  const finalMatch = completedMatches.find((m) => m.stage === "final");
  if (finalMatch) {
    const championId = finalMatch.winner_couple_id || finalMatch.winner_id;
    const c1 = finalMatch.couple1_id || finalMatch.pair1_id;
    const c2 = finalMatch.couple2_id || finalMatch.pair2_id;
    const runnerUpId = championId === c1 ? c2 : c1;

    if (championId && statsMap[championId]) {
      statsMap[championId].highestStage = "champion";
      statsMap[championId].pointsEarned = SPT_POINTS_SCALE.champion;
      statsMap[championId].finalPosition = 1;
    }

    if (runnerUpId && statsMap[runnerUpId]) {
      statsMap[runnerUpId].highestStage = "runner_up";
      statsMap[runnerUpId].pointsEarned = SPT_POINTS_SCALE.runner_up;
      statsMap[runnerUpId].finalPosition = 2;
    }
  }

  return statsMap;
}

/**
 * Actualiza los rankings de parejas e individuales acumulados tras la conclusión de un torneo.
 * - Ranking por Pareja: acumula puntos sólo para esa dupla específica.
 * - Ranking Individual: acumula puntos para cada jugador independientemente de con quién compita.
 */
export function processDoubleRankingUpdate(params: {
  existingCoupleRankings: Map<string, CoupleRankingRecord>;
  existingIndividualRankings: Map<string, IndividualRankingRecord>;
  tournamentStats: Record<string, CoupleTournamentStats>;
  category: string;
}): {
  updatedCoupleRankings: Map<string, CoupleRankingRecord>;
  updatedIndividualRankings: Map<string, IndividualRankingRecord>;
} {
  const {
    existingCoupleRankings,
    existingIndividualRankings,
    tournamentStats,
    category,
  } = params;

  const updatedCoupleRankings = new Map(existingCoupleRankings);
  const updatedIndividualRankings = new Map(existingIndividualRankings);

  for (const stats of Object.values(tournamentStats)) {
    const { coupleKey, player1Id, player2Id, pointsEarned, matchesWon, matchesLost } = stats;

    // 1. Ranking de Pareja (Acumula para la clave de pareja)
    const currentCoupleRec = updatedCoupleRankings.get(coupleKey);
    if (currentCoupleRec) {
      updatedCoupleRankings.set(coupleKey, {
        ...currentCoupleRec,
        points: currentCoupleRec.points + pointsEarned,
        tournamentsPlayed: currentCoupleRec.tournamentsPlayed + 1,
        matchesWon: currentCoupleRec.matchesWon + matchesWon,
        matchesLost: currentCoupleRec.matchesLost + matchesLost,
      });
    } else {
      updatedCoupleRankings.set(coupleKey, {
        coupleKey,
        player1Id,
        player2Id,
        category,
        points: pointsEarned,
        tournamentsPlayed: 1,
        matchesWon,
        matchesLost,
      });
    }

    // 2. Ranking Individual (Acumula independientemente para cada jugador)
    for (const pId of [player1Id, player2Id]) {
      if (!pId) continue;
      const currentIndivRec = updatedIndividualRankings.get(pId);
      if (currentIndivRec) {
        updatedIndividualRankings.set(pId, {
          ...currentIndivRec,
          points: currentIndivRec.points + pointsEarned,
          tournamentsPlayed: currentIndivRec.tournamentsPlayed + 1,
          matchesWon: currentIndivRec.matchesWon + matchesWon,
          matchesLost: currentIndivRec.matchesLost + matchesLost,
        });
      } else {
        updatedIndividualRankings.set(pId, {
          playerId: pId,
          category,
          points: pointsEarned,
          tournamentsPlayed: 1,
          matchesWon,
          matchesLost,
        });
      }
    }
  }

  return { updatedCoupleRankings, updatedIndividualRankings };
}
