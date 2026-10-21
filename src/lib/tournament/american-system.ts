import type { ScoreData } from "@/types/tournament";

/**
 * Resultado de un partido en Sistema Americano a 9 games o por diferencia de games.
 */
export interface AmericanoResult {
  gamesWon: number;
  gamesLost: number;
  winner: "pair1" | "pair2" | "draw";
  tiebreakPoints?: { pair1: number; pair2: number };
  isTiebreak: boolean;
  scoreText: string;
}

/**
 * Resultado de un partido en Sistema Americano 2 sets a 3 games + Super Tie-Break.
 */
export interface TwoSetsResult {
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  superTbWon?: boolean;
  superTbScore?: { pair1: number; pair2: number };
  winner: "pair1" | "pair2" | "draw";
  scoreText: string;
}

export interface TieBreakResult {
  winner: "pair1" | "pair2";
  points1: number;
  points2: number;
  isSuddenDeath: boolean;
  scoreText: string;
}

export interface MatchValidationResult {
  isValid: boolean;
  error?: string;
  winner?: "pair1" | "pair2";
  scoreSummary?: string;
}

// ============================================================================
// 1. REGLA GLOBAL: PUNTO DE ORO (GOLDEN POINT)
// ============================================================================

/**
 * En 40-40 SIEMPRE se juega con Punto de Oro (sin ventajas).
 * La pareja receptora elige el lado para recibir el servicio.
 */
export function isGoldenPoint(score1: number | string, score2: number | string): boolean {
  // Manejo de valores numéricos (40, 40) o strings ("40", "40")
  const s1 = typeof score1 === "string" ? parseInt(score1, 10) : score1;
  const s2 = typeof score2 === "string" ? parseInt(score2, 10) : score2;
  return s1 >= 40 && s2 >= 40 && s1 === s2;
}

export function getGoldenPointText(): string {
  return "Punto de Oro (40-40 - Restador elige lado)";
}

export function getGoldenPointRules(): { description: string; receiverChoice: boolean } {
  return {
    description:
      "Al llegar a 40-40 (iguales), no se juega con ventajas. Se disputa un único punto decisivo donde la pareja restadora elige el lado de recepción. Quien gane el punto se adjudica el game.",
    receiverChoice: true,
  };
}

// ============================================================================
// 2. SISTEMA AMERICANO A 9 GAMES (Empate 8-8 -> Tie-Break a 7 'Muere en 7')
// ============================================================================

/**
 * Tie-Break de 9 games:
 * Se juega cuando el marcador llega a 8-8.
 * Es a 7 puntos con regla estricta de "muere en 7":
 * El primero en llegar a 7 puntos gana el tie-break, SIN necesidad de diferencia de 2.
 * Si van 6-6, el primero que llega a 7 gana 7-6 inmediatamente.
 */
export function evaluateTieBreak7Points(points1: number, points2: number): TieBreakResult | null {
  if (points1 < 0 || points2 < 0) return null;
  if (points1 > 7 || points2 > 7) return null;

  // "Muere en 7": el primero en llegar a 7 gana inmediatamente
  if (points1 === 7 && points2 < 7) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: points2 === 6,
      scoreText: `7-${points2}`,
    };
  }

  if (points2 === 7 && points1 < 7) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: points1 === 6,
      scoreText: `${points1}-7`,
    };
  }

  return null; // Aún en juego o no finalizado
}

/**
 * Valida si un resultado de Sistema Americano a 9 games es reglamentario.
 * Casos válidos:
 * - 9-0 a 9-7 (ganador directo con 9 games)
 * - 8-8 con Tie-Break a 7 'muere en 7' (el ganador del TB se anota el game 9 -> 9-8 con TB 7-x)
 */
export function validateAmericano9Games(
  games1: number,
  games2: number,
  tbPoints1?: number,
  tbPoints2?: number
): MatchValidationResult {
  if (games1 < 0 || games2 < 0) {
    return { isValid: false, error: "Los games no pueden ser negativos" };
  }

  // Si uno llegó a 9 y el otro tiene 7 o menos, no requiere tiebreak
  if (games1 === 9 && games2 < 8) {
    return {
      isValid: true,
      winner: "pair1",
      scoreSummary: `9-${games2}`,
    };
  }

  if (games2 === 9 && games1 < 8) {
    return {
      isValid: true,
      winner: "pair2",
      scoreSummary: `${games1}-9`,
    };
  }

  // Si empataron 8-8, debe definirse por Tie-break a 7 que muere en 7
  if ((games1 === 9 && games2 === 8) || (games1 === 8 && games2 === 9) || (games1 === 8 && games2 === 8)) {
    if (tbPoints1 === undefined || tbPoints2 === undefined) {
      return {
        isValid: false,
        error: "En 8-8 es obligatorio registrar los puntos del Tie-Break a 7",
      };
    }

    const tbResult = evaluateTieBreak7Points(tbPoints1, tbPoints2);
    if (!tbResult) {
      return {
        isValid: false,
        error: `Puntuación de Tie-Break inválida (${tbPoints1}-${tbPoints2}). Debe ser a 7 puntos y morir en 7 (ej: 7-6, 7-5, 7-0).`,
      };
    }

    const winner = tbResult.winner;
    const finalGames1 = winner === "pair1" ? 9 : 8;
    const finalGames2 = winner === "pair2" ? 9 : 8;

    return {
      isValid: true,
      winner,
      scoreSummary: `${finalGames1}-${finalGames2} (${tbResult.scoreText})`,
    };
  }

  return {
    isValid: false,
    error: `Marcador inválido para Americano a 9 games (${games1}-${games2}). El ganador debe alcanzar 9 games o desempatar 8-8 en Tie-Break.`,
  };
}

/**
 * Calcula el ganador y balance de games para un partido de 9 games.
 */
export function calculateAmericano9Games(
  score1: ScoreData,
  score2: ScoreData
): AmericanoResult {
  const g1 = score1.games_won;
  const g2 = score2.games_won;
  const tb1 = score1.tiebreak?.[0];
  const tb2 = score2.tiebreak?.[0];

  const validation = validateAmericano9Games(g1, g2, tb1, tb2);

  if (validation.isValid && validation.winner) {
    return {
      gamesWon: validation.winner === "pair1" ? g1 : g2,
      gamesLost: validation.winner === "pair1" ? g2 : g1,
      winner: validation.winner,
      tiebreakPoints: tb1 !== undefined && tb2 !== undefined ? { pair1: tb1, pair2: tb2 } : undefined,
      isTiebreak: (g1 === 8 && g2 === 8) || (g1 === 9 && g2 === 8 && tb1 !== undefined) || (g2 === 9 && g1 === 8 && tb2 !== undefined),
      scoreText: validation.scoreSummary ?? `${g1}-${g2}`,
    };
  }

  // Fallback para partidos en curso o sin tiebreak cargado
  if (g1 > g2) {
    return { gamesWon: g1, gamesLost: g2, winner: "pair1", isTiebreak: false, scoreText: `${g1}-${g2}` };
  }
  if (g2 > g1) {
    return { gamesWon: g2, gamesLost: g1, winner: "pair2", isTiebreak: false, scoreText: `${g1}-${g2}` };
  }
  return { gamesWon: g1, gamesLost: g2, winner: "draw", isTiebreak: false, scoreText: `${g1}-${g2}` };
}

// ============================================================================
// 3. SISTEMA AMERICANO 2 SETS A 3 GAMES + SUPER TIE-BREAK (Muere en 11)
// ============================================================================

/**
 * Super Tie-Break de desempate en tercer set (cuando van 1-1 en sets):
 * - Es a 10 puntos.
 * - Regla especial: "Muere en 11".
 *   Si empatan 10-10, el primero que llega a 11 puntos gana el partido (11-10)
 *   sin necesidad de ventaja de 2 puntos.
 * - Si un equipo llega a 10 y el otro tiene 9 o menos (ej: 10-8, 10-5), gana normalmente.
 */
export function evaluateSuperTieBreak(points1: number, points2: number): TieBreakResult | null {
  if (points1 < 0 || points2 < 0) return null;
  if (points1 > 11 || points2 > 11) return null;

  // Victoria a 10 puntos si el rival tiene 9 o menos
  if (points1 === 10 && points2 <= 8) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  if (points2 === 10 && points1 <= 8) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  // Si llegaron a 9-9 o 10-10: regla "muere en 11"
  if (points1 === 10 && points2 === 9) {
    return null;
  }
  if (points2 === 10 && points1 === 9) {
    return null;
  }
  if (points1 === 10 && points2 === 10) {
    return null;
  }

  if (points1 === 11 && (points2 === 9 || points2 === 10)) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: points2 === 10,
      scoreText: `11-${points2}`,
    };
  }

  if (points2 === 11 && (points1 === 9 || points1 === 10)) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: points1 === 10,
      scoreText: `${points1}-11`,
    };
  }

  return null; // Aún en juego o marcador inválido
}

/**
 * Valida un set corto a 3 games.
 * Marcadores reglamentarios válidos para sets a 3 games:
 * - 3-0, 3-1, 3-2 (gana quien llega a 3 games)
 */
export function validateShortSet(games1: number, games2: number): { isValid: boolean; winner?: "pair1" | "pair2"; error?: string } {
  if (games1 === 3 && games2 < 3) return { isValid: true, winner: "pair1" };
  if (games2 === 3 && games1 < 3) return { isValid: true, winner: "pair2" };
  return {
    isValid: false,
    error: `Marcador de set inválido (${games1}-${games2}). Debe terminar cuando una pareja alcance 3 games (3-0, 3-1, 3-2).`,
  };
}

/**
 * Valida un partido completo de 2 sets a 3 games con Super Tie-Break que 'muere en 11'.
 */
export function validateAmericano2Sets(
  set1: [number, number],
  set2: [number, number],
  superTb?: [number, number]
): MatchValidationResult {
  const vSet1 = validateShortSet(set1[0], set1[1]);
  if (!vSet1.isValid) return { isValid: false, error: `Set 1: ${vSet1.error}` };

  const vSet2 = validateShortSet(set2[0], set2[1]);
  if (!vSet2.isValid) return { isValid: false, error: `Set 2: ${vSet2.error}` };

  // Si una pareja ganó ambos sets (2-0), el partido terminó
  if (vSet1.winner === vSet2.winner) {
    return {
      isValid: true,
      winner: vSet1.winner,
      scoreSummary: `${set1[0]}-${set1[1]}, ${set2[0]}-${set2[1]}`,
    };
  }

  // Empate 1-1 en sets: se exige Super Tie-Break
  if (!superTb) {
    return {
      isValid: false,
      error: "Con sets empatados 1-1, es obligatorio disputar el Super Tie-Break a 10 puntos (muere en 11)",
    };
  }

  const tbResult = evaluateSuperTieBreak(superTb[0], superTb[1]);
  if (!tbResult) {
    return {
      isValid: false,
      error: `Super Tie-Break inválido (${superTb[0]}-${superTb[1]}). Se juega a 10 puntos con muerte súbita en 11 (máximo 11-10).`,
    };
  }

  return {
    isValid: true,
    winner: tbResult.winner,
    scoreSummary: `${set1[0]}-${set1[1]}, ${set2[0]}-${set2[1]}, [${tbResult.scoreText}]`,
  };
}

/**
 * Calcula el resultado de un partido de 2 sets a 3 games + Super TB a partir de ScoreData.
 */
export function calculateTwoSetsScore(
  score1: ScoreData,
  score2: ScoreData
): TwoSetsResult {
  const sets1 = score1.sets ?? [];
  const sets2 = score2.sets ?? [];

  let setsWon1 = 0;
  let setsWon2 = 0;
  let totalGames1 = 0;
  let totalGames2 = 0;

  for (let i = 0; i < Math.min(sets1.length, sets2.length); i++) {
    totalGames1 += sets1[i];
    totalGames2 += sets2[i];
    if (sets1[i] > sets2[i]) setsWon1++;
    else if (sets2[i] > sets1[i]) setsWon2++;
  }

  // Si hay Super Tie-Break
  let superTbWon: boolean | undefined;
  let superTbScore: { pair1: number; pair2: number } | undefined;
  const stb1 = score1.tiebreak?.[0];
  const stb2 = score2.tiebreak?.[0];

  if (stb1 !== undefined && stb2 !== undefined) {
    superTbScore = { pair1: stb1, pair2: stb2 };
    const tbResult = evaluateSuperTieBreak(stb1, stb2);
    if (tbResult) {
      if (tbResult.winner === "pair1") {
        setsWon1++;
        superTbWon = true;
      } else {
        setsWon2++;
        superTbWon = false;
      }
    }
  }

  let winner: "pair1" | "pair2" | "draw" = "draw";
  if (setsWon1 > setsWon2) winner = "pair1";
  else if (setsWon2 > setsWon1) winner = "pair2";

  const scoreText = sets1
    .map((s, idx) => `${s}-${sets2[idx]}`)
    .concat(superTbScore ? [`[${superTbScore.pair1}-${superTbScore.pair2}]`] : [])
    .join(", ");

  return {
    setsWon: setsWon1,
    setsLost: setsWon2,
    gamesWon: totalGames1,
    gamesLost: totalGames2,
    superTbWon,
    superTbScore,
    winner,
    scoreText,
  };
}

// ============================================================================
// 4. SISTEMA 2 SETS + SUPER TIE-BREAK (2 sets a 6 games, TB a 7 en 6-6, Super TB a 11)
// ============================================================================

/**
 * Tie-Break estándar a 7 puntos para set a 6 games (cuando van 6-6):
 * - El objetivo es llegar a 7 puntos.
 * - Si un equipo llega a 7 y el otro tiene 5 o menos (7-0 a 7-5), gana el tie-break.
 * - Si empatan 6-6, se resuelve por muerte súbita en 7 (7-6) o con diferencia de 2 (8-6, 9-7, etc.).
 */
export function evaluateTieBreak7PointsStandard(points1: number, points2: number): TieBreakResult | null {
  if (points1 < 0 || points2 < 0) return null;

  // Ganador directo con 7 puntos y rival con 5 o menos
  if (points1 === 7 && points2 <= 5) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `7-${points2}`,
    };
  }

  if (points2 === 7 && points1 <= 5) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-7`,
    };
  }

  // Muerte súbita en 7 o definición en 7-6
  if (points1 === 7 && points2 === 6) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: true,
      scoreText: "7-6",
    };
  }

  if (points2 === 7 && points1 === 6) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: true,
      scoreText: "6-7",
    };
  }

  // Si se jugó con diferencia de 2 más allá de 6-6 (ej: 8-6, 9-7, 10-8)
  if (points1 >= 7 && points1 - points2 === 2) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  if (points2 >= 7 && points2 - points1 === 2) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  return null;
}

/**
 * Super Tie-Break a 11 puntos:
 * - Se disputa en caso de empate 1-1 en sets.
 * - Es a 11 puntos.
 * - Si un equipo llega a 11 y el rival tiene 9 o menos (11-0 a 11-9), gana el super tie-break.
 * - Si van 10-10, quien alcanza 11 puntos gana (11-10 en muerte súbita) o con diferencia de 2 (12-10).
 */
export function evaluateSuperTieBreak11Points(points1: number, points2: number): TieBreakResult | null {
  if (points1 < 0 || points2 < 0) return null;

  // Victoria con 11 puntos y rival con 9 o menos
  if (points1 === 11 && points2 <= 9) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  if (points2 === 11 && points1 <= 9) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  // Muerte súbita en 11 (11-10 / 10-11)
  if (points1 === 11 && points2 === 10) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: true,
      scoreText: "11-10",
    };
  }

  if (points2 === 11 && points1 === 10) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: true,
      scoreText: "10-11",
    };
  }

  // Diferencia de 2 más allá de 10-10 (ej: 12-10, 13-11)
  if (points1 >= 11 && points1 - points2 === 2) {
    return {
      winner: "pair1",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  if (points2 >= 11 && points2 - points1 === 2) {
    return {
      winner: "pair2",
      points1,
      points2,
      isSuddenDeath: false,
      scoreText: `${points1}-${points2}`,
    };
  }

  return null;
}

/**
 * Valida un set tradicional a 6 games.
 * Casos válidos:
 * - 6-0, 6-1, 6-2, 6-3, 6-4
 * - 7-5 / 5-7
 * - 7-6 / 6-7 (con Tie-Break a 7 puntos en caso de 6-6)
 */
export function validateStandardSet(
  games1: number,
  games2: number,
  tbPoints1?: number,
  tbPoints2?: number
): { isValid: boolean; winner?: "pair1" | "pair2"; error?: string; tbResult?: TieBreakResult } {
  if (games1 < 0 || games2 < 0) {
    return { isValid: false, error: "Los games no pueden ser negativos" };
  }

  // 6-0 a 6-4
  if (games1 === 6 && games2 <= 4) return { isValid: true, winner: "pair1" };
  if (games2 === 6 && games1 <= 4) return { isValid: true, winner: "pair2" };

  // 7-5 / 5-7
  if (games1 === 7 && games2 === 5) return { isValid: true, winner: "pair1" };
  if (games2 === 7 && games1 === 5) return { isValid: true, winner: "pair2" };

  // 7-6 / 6-7 (Tie-Break en 6-6)
  if ((games1 === 7 && games2 === 6) || (games1 === 6 && games2 === 7)) {
    if (tbPoints1 !== undefined && tbPoints2 !== undefined) {
      const tb = evaluateTieBreak7PointsStandard(tbPoints1, tbPoints2);
      if (!tb) {
        return {
          isValid: false,
          error: `Puntuación de Tie-Break a 7 puntos inválida (${tbPoints1}-${tbPoints2}).`,
        };
      }
      const expectedWinner = games1 > games2 ? "pair1" : "pair2";
      if (tb.winner !== expectedWinner) {
        return {
          isValid: false,
          error: `El ganador del tie-break (${tb.winner}) no coincide con el ganador del set (${expectedWinner}).`,
        };
      }
      return { isValid: true, winner: expectedWinner, tbResult: tb };
    }
    // Si no se detallaron puntos específicos del TB, 7-6 / 6-7 es reglamentario
    return { isValid: true, winner: games1 > games2 ? "pair1" : "pair2" };
  }

  return {
    isValid: false,
    error: `Marcador de set inválido (${games1}-${games2}). Debe ser a 6 games (ej: 6-4, 6-3, 7-5 o 7-6 en Tie-Break).`,
  };
}

/**
 * Valida un partido de la modalidad "2 set + super tie break":
 * - 2 sets a 6 games.
 * - En caso de 6-6 definen con un tie break a 7 puntos.
 * - Si empatan 1-1 en sets, definen con un super tie break a 11 puntos.
 */
export function validateTwoSetsSuperTieBreak(
  set1: [number, number],
  set2: [number, number],
  superTb?: [number, number],
  tbSet1?: [number, number],
  tbSet2?: [number, number]
): MatchValidationResult {
  const vSet1 = validateStandardSet(set1[0], set1[1], tbSet1?.[0], tbSet1?.[1]);
  if (!vSet1.isValid) return { isValid: false, error: `Set 1: ${vSet1.error}` };

  const vSet2 = validateStandardSet(set2[0], set2[1], tbSet2?.[0], tbSet2?.[1]);
  if (!vSet2.isValid) return { isValid: false, error: `Set 2: ${vSet2.error}` };

  const s1Text = vSet1.tbResult ? `${set1[0]}-${set1[1]} (${vSet1.tbResult.scoreText})` : `${set1[0]}-${set1[1]}`;
  const s2Text = vSet2.tbResult ? `${set2[0]}-${set2[1]} (${vSet2.tbResult.scoreText})` : `${set2[0]}-${set2[1]}`;

  // Si una pareja ganó ambos sets (2-0)
  if (vSet1.winner === vSet2.winner) {
    return {
      isValid: true,
      winner: vSet1.winner,
      scoreSummary: `${s1Text}, ${s2Text}`,
    };
  }

  // Si van 1-1 en sets, se exige el Super Tie-Break a 11 puntos
  if (!superTb) {
    return {
      isValid: false,
      error: "Con sets empatados 1-1, es obligatorio disputar el Super Tie-Break a 11 puntos.",
    };
  }

  const tbResult = evaluateSuperTieBreak11Points(superTb[0], superTb[1]);
  if (!tbResult) {
    return {
      isValid: false,
      error: `Super Tie-Break inválido (${superTb[0]}-${superTb[1]}). El desempate es a 11 puntos (ej: 11-9, 11-8 o 11-10).`,
    };
  }

  return {
    isValid: true,
    winner: tbResult.winner,
    scoreSummary: `${s1Text}, ${s2Text}, [${tbResult.scoreText}]`,
  };
}

/**
 * Calcula el resultado de un partido de "2 set + super tie break" a partir de ScoreData.
 */
export function calculateTwoSetsSuperTieBreakScore(
  score1: ScoreData,
  score2: ScoreData
): TwoSetsResult {
  const sets1 = score1.sets ?? [];
  const sets2 = score2.sets ?? [];

  let setsWon1 = 0;
  let setsWon2 = 0;
  let totalGames1 = 0;
  let totalGames2 = 0;

  for (let i = 0; i < Math.min(sets1.length, sets2.length); i++) {
    totalGames1 += sets1[i];
    totalGames2 += sets2[i];
    if (sets1[i] > sets2[i]) setsWon1++;
    else if (sets2[i] > sets1[i]) setsWon2++;
  }

  // Super Tie-Break en set 3
  let superTbWon: boolean | undefined;
  let superTbScore: { pair1: number; pair2: number } | undefined;
  const stb1 = score1.tiebreak?.[0];
  const stb2 = score2.tiebreak?.[0];

  if (stb1 !== undefined && stb2 !== undefined) {
    superTbScore = { pair1: stb1, pair2: stb2 };
    const tbResult = evaluateSuperTieBreak11Points(stb1, stb2);
    if (tbResult) {
      if (tbResult.winner === "pair1") {
        setsWon1++;
        superTbWon = true;
      } else {
        setsWon2++;
        superTbWon = false;
      }
    }
  }

  let winner: "pair1" | "pair2" | "draw" = "draw";
  if (setsWon1 > setsWon2) winner = "pair1";
  else if (setsWon2 > setsWon1) winner = "pair2";

  const scoreText = sets1
    .map((s, idx) => `${s}-${sets2[idx]}`)
    .concat(superTbScore ? [`[${superTbScore.pair1}-${superTbScore.pair2}]`] : [])
    .join(", ");

  return {
    setsWon: setsWon1,
    setsLost: setsWon2,
    gamesWon: totalGames1,
    gamesLost: totalGames2,
    superTbWon,
    superTbScore,
    winner,
    scoreText,
  };
}

// ============================================================================
// 5. ROUND ROBIN POR DIFERENCIA DE GAMES (Sistema Tradicional)
// ============================================================================

export function calculateGameDifference(gamesWon: number, gamesLost: number): number {
  return gamesWon - gamesLost;
}

export function calculateSetDifference(setsWon: number, setsLost: number): number {
  return setsWon - setsLost;
}

// ============================================================================
// 5. AYUDAS DE ESTADO DEL PARTIDO (PUNTO DE PARTIDO / MUERTE SÚBITA)
// ============================================================================

export function isMatchPoint(
  currentScore: { server: number; receiver: number },
  gamesWon: number,
  gamesLost: number,
  isTiebreak: boolean,
  targetPoints = 7
): boolean {
  if (isTiebreak) {
    const isServerLead = currentScore.server === targetPoints - 1 && currentScore.server > currentScore.receiver;
    const isReceiverLead = currentScore.receiver === targetPoints - 1 && currentScore.receiver > currentScore.server;
    return isServerLead || isReceiverLead;
  }
  // En games: por ejemplo 8 games ganados en sistema a 9
  return gamesWon >= 8 && gamesWon > gamesLost;
}

export function isDeathSudden(
  currentScore: { server: number; receiver: number },
  requiredPoints: number
): boolean {
  // En "muere en 7": si están 6-6, es muerte súbita (quien hace el 7 gana)
  // En "muere en 11": si están 10-10, es muerte súbita (quien hace el 11 gana)
  return currentScore.server === requiredPoints - 1 && currentScore.receiver === requiredPoints - 1;
}

export function getDeathSuddenText(mode: "tb_7" | "stb_11" = "tb_7"): string {
  return mode === "tb_7"
    ? "MUERTE SÚBITA EN 7 (Sin diferencia de 2)"
    : "MUERTE SÚBITA EN 11 (Sin diferencia de 2)";
}
