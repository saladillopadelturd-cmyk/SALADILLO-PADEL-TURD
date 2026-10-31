/**
 * Suite de pruebas y validación exhaustiva de reglas de negocio para Saladillo Padel Tour (SPT).
 * 
 * Cobertura:
 * 1. Reglas de Puntuación (Americano 9 games, Americano 2 sets, Super TB, Punto de Oro)
 * 2. Fase de Zonas y Standings (Zonas de 3 y 4 parejas, H2H, empates triples, regla de eliminación)
 * 3. Cuadro de Playoffs / Eliminación Directa (Separación de zonas, Seeds 1 & 2 en mitades opuestas, BYEs)
 * 4. Sistema de Doble Ranking (Ranking por Pareja vs Ranking Individual)
 * 5. Pruebas de Estrés y Casos Borde (Simulación aleatoria masiva)
 */

import {
  evaluateTieBreak7Points,
  evaluateSuperTieBreak,
  validateAmericano9Games,
  validateAmericano2Sets,
  validateShortSet,
  validateStandardSet,
  evaluateTieBreak7PointsStandard,
  evaluateSuperTieBreak11Points,
  validateTwoSetsSuperTieBreak,
  calculateTwoSetsSuperTieBreakScore,
  isGoldenPoint,
  calculateAmericano9Games,
  calculateTwoSetsScore,
} from "./american-system";

import {
  calculateRoundRobinStandings,
  getQualifiedPairs,
  getEliminatedPair,
} from "./standings";

import {
  generateSeededPlayoffBracket,
  generateRoundRobinMatches,
  getNextPowerOf2,
  findNextPlayoffMatchSlot,
  getNextStage,
  normalizeStage,
  propagatePlayoffWinners,
  getStageName,
  type QualifiedPair,
} from "./elimination";

import {
  SPT_POINTS_SCALE,
  SPT_DISTRIBUTION_PERCENTAGES,
  getCoupleKey,
  calculateTournamentStageStats,
  processDoubleRankingUpdate,
  type CoupleRankingRecord,
  type IndividualRankingRecord,
} from "./rankings";

import {
  formatZoneDisplayName,
  resolveMatchZone,
  getMatchZoneDisplayName,
  generateZoneMatches,
  propagateZoneMatches,
  getZone4MatchInfo,
} from "./zones";

import {
  getAssignedPlayerIdsInTournament,
  getAvailablePlayersForTournament,
  validateCoupleFormation,
  getCoupleNumberMap,
  getCoupleLabelWithNumber,
  getCoupleLastNames,
  formatPlayerShortName,
  formatPlayerFullName,
  generateRandomCouples,
  isPlayerEligibleForTournament,
  parseCategoryLevel,
  isSumaCategory,
  parseSumaTarget,
  getEffectivePlayerLevelForTournament,
  validateCoupleCategorySuma,
} from "./couples";

import { calculateOptimalZones, getZoneSuggestions, buildCustomZonesConfig } from "./zones";

import type { Match, Couple, Player } from "@/types/tournament";

export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  log: string[];
  failures: string[];
}

export function runTournamentBusinessLogicTests(): TestResult {
  const log: string[] = [];
  const failures: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      log.push(`[PASS] ${testName}`);
    } else {
      failed++;
      const msg = detail ? `[FAIL] ${testName} - ${detail}` : `[FAIL] ${testName}`;
      log.push(msg);
      failures.push(msg);
    }
  }

  // ==========================================================================
  // 1. REGLA GLOBAL: PUNTO DE ORO (40-40)
  // ==========================================================================
  assert(isGoldenPoint(40, 40) === true, "Golden Point activo en 40-40 numérico");
  assert(isGoldenPoint("40", "40") === true, "Golden Point activo con strings '40'-'40'");
  assert(isGoldenPoint(40, 30) === false, "Golden Point inactivo en 40-30");
  assert(isGoldenPoint(30, 40) === false, "Golden Point inactivo en 30-40");
  assert(isGoldenPoint(15, 40) === false, "Golden Point inactivo en 15-40");
  assert(isGoldenPoint(0, 0) === false, "Golden Point inactivo en 0-0");

  // ==========================================================================
  // 2. SISTEMA AMERICANO A 9 GAMES (Empate 8-8 -> Tie-break a 7 'Muere en 7')
  // ==========================================================================
  // a) Partidos regulares (9-0 a 9-7)
  for (let g = 0; g <= 7; g++) {
    const res1 = validateAmericano9Games(9, g);
    assert(res1.isValid && res1.winner === "pair1", `Victoria regular 9-${g} es válida para Pareja 1`);

    const res2 = validateAmericano9Games(g, 9);
    assert(res2.isValid && res2.winner === "pair2", `Victoria regular ${g}-9 es válida para Pareja 2`);
  }

  // b) Marcadores inválidos sin llegar a 9
  assert(!validateAmericano9Games(8, 5).isValid, "Marcador 8-5 es inválido (partido no finalizado)");
  assert(!validateAmericano9Games(7, 4).isValid, "Marcador 7-4 es inválido");
  assert(!validateAmericano9Games(10, 4).isValid, "Marcador 10-4 es inválido (máximo 9 games)");
  assert(!validateAmericano9Games(-1, 9).isValid, "Games negativos son inválidos");

  // c) Empate 8-8 exige tie-break
  const match88NoTb = validateAmericano9Games(8, 8);
  assert(!match88NoTb.isValid, "Empate 8-8 sin tie-break cargado es inválido");

  // d) Tie-break a 7 puntos que 'Muere en 7' (7-6, 7-5, 7-0 etc.)
  const tb76 = evaluateTieBreak7Points(7, 6);
  assert(tb76 !== null && tb76.winner === "pair1" && tb76.isSuddenDeath === true, "TB 7-6: Gana Pareja 1 por muerte súbita");

  const tb67 = evaluateTieBreak7Points(6, 7);
  assert(tb67 !== null && tb67.winner === "pair2" && tb67.isSuddenDeath === true, "TB 6-7: Gana Pareja 2 por muerte súbita");

  const tb70 = evaluateTieBreak7Points(7, 0);
  assert(tb70 !== null && tb70.winner === "pair1" && tb70.isSuddenDeath === false, "TB 7-0: Gana Pareja 1");

  const tb75 = evaluateTieBreak7Points(7, 5);
  assert(tb75 !== null && tb75.winner === "pair1" && tb75.isSuddenDeath === false, "TB 7-5: Gana Pareja 1");

  // e) Scores inválidos de Tie-break (muere en 7, no hay 8-6 ni 7-7)
  assert(evaluateTieBreak7Points(8, 6) === null, "TB 8-6 es inválido porque muere en 7");
  assert(evaluateTieBreak7Points(7, 7) === null, "TB 7-7 es inválido");
  assert(evaluateTieBreak7Points(9, 7) === null, "TB 9-7 es inválido");
  assert(evaluateTieBreak7Points(-1, 7) === null, "TB con puntos negativos es inválido");

  // f) Integración de partido completo 8-8 con TB
  const matchWithTb = validateAmericano9Games(8, 8, 7, 6);
  assert(matchWithTb.isValid && matchWithTb.winner === "pair1", "Partido 8-8 con TB 7-6 válido y gana Pareja 1");

  // g) Cálculo estructurado con calculateAmericano9Games
  const calc9 = calculateAmericano9Games(
    { sets: [9], games_won: 9, games_lost: 8, tiebreak: [7] },
    { sets: [8], games_won: 8, games_lost: 9, tiebreak: [6] }
  );
  assert(calc9.winner === "pair1" && calc9.isTiebreak === true, "calculateAmericano9Games detecta victoria con TB");

  // ==========================================================================
  // 3. SISTEMA AMERICANO 2 SETS A 3 GAMES (Tercer set STB a 10 'Muere en 11')
  // ==========================================================================
  // a) Sets cortos a 3 games (3-0, 3-1, 3-2 válidos)
  assert(validateShortSet(3, 0).isValid && validateShortSet(3, 0).winner === "pair1", "Set corto 3-0 válido");
  assert(validateShortSet(1, 3).isValid && validateShortSet(1, 3).winner === "pair2", "Set corto 1-3 válido");
  assert(validateShortSet(3, 2).isValid, "Set corto 3-2 válido");
  assert(!validateShortSet(4, 2).isValid, "Set corto 4-2 es inválido (máximo 3 games)");
  assert(!validateShortSet(3, 3).isValid, "Set corto 3-3 es inválido");
  assert(!validateShortSet(2, 1).isValid, "Set corto 2-1 inconcluso es inválido");

  // b) Victoria directa 2 sets a 0
  const match2SetsDirect = validateAmericano2Sets([3, 1], [3, 0]);
  assert(match2SetsDirect.isValid && match2SetsDirect.winner === "pair1", "Victoria 2-0 directa sin tercer set");

  // c) Empate 1-1 exige Super Tie-Break
  const match11NoStb = validateAmericano2Sets([3, 1], [1, 3]);
  assert(!match11NoStb.isValid, "Empate 1-1 en sets sin Super TB es inválido");

  // d) Super Tie-Break que 'muere en 11'
  // 10-8 es victoria normal
  const stb108 = evaluateSuperTieBreak(10, 8);
  assert(stb108 !== null && stb108.winner === "pair1" && stb108.isSuddenDeath === false, "STB 10-8: Victoria normal Pareja 1");

  const stb105 = evaluateSuperTieBreak(5, 10);
  assert(stb105 !== null && stb105.winner === "pair2" && stb105.isSuddenDeath === false, "STB 5-10: Victoria normal Pareja 2");

  // 10-9 y 10-10 aún en juego
  assert(evaluateSuperTieBreak(10, 9) === null, "STB 10-9: Aún en juego");
  assert(evaluateSuperTieBreak(10, 10) === null, "STB 10-10: Aún en juego");

  // Si empatan 10-10: el primero a 11 gana (11-10 muerte súbita sin diferencia de 2)
  const stb1110 = evaluateSuperTieBreak(11, 10);
  assert(stb1110 !== null && stb1110.winner === "pair1" && stb1110.isSuddenDeath === true, "STB 11-10: Pareja 1 gana por muerte súbita en 11");

  const stb1011 = evaluateSuperTieBreak(10, 11);
  assert(stb1011 !== null && stb1011.winner === "pair2" && stb1011.isSuddenDeath === true, "STB 10-11: Pareja 2 gana por muerte súbita en 11");

  // 11-9 es victoria con diferencia de 2
  const stb119 = evaluateSuperTieBreak(11, 9);
  assert(stb119 !== null && stb119.winner === "pair1", "STB 11-9 es válido");

  // Marcadores inválidos de STB (muere en 11)
  assert(evaluateSuperTieBreak(11, 8) === null, "STB 11-8 es inválido (partido finalizaba en 10-8)");
  assert(evaluateSuperTieBreak(12, 10) === null, "STB 12-10 es inválido (muere en 11)");
  assert(evaluateSuperTieBreak(12, 11) === null, "STB 12-11 es inválido");

  // e) Partido 2 sets con STB integrado
  const matchFullStb = validateAmericano2Sets([3, 1], [1, 3], [11, 10]);
  assert(matchFullStb.isValid && matchFullStb.winner === "pair1", "Partido 1-1 con STB 11-10 es válido");

  // f) Cálculo estructurado calculateTwoSetsScore
  const calc2Sets = calculateTwoSetsScore(
    { sets: [3, 1], games_won: 4, games_lost: 4, tiebreak: [11] },
    { sets: [1, 3], games_won: 4, games_lost: 4, tiebreak: [10] }
  );
  assert(calc2Sets.winner === "pair1" && calc2Sets.superTbWon === true, "calculateTwoSetsScore computa ganador del STB");

  // ==========================================================================
  // 3.B. SISTEMA 2 SETS + SUPER TIE-BREAK (2 sets a 6 games, TB a 7 en 6-6, Super TB a 11)
  // ==========================================================================
  // a) Sets regulares a 6 games (6-0 a 6-4, 7-5 válidos)
  assert(validateStandardSet(6, 4).isValid && validateStandardSet(6, 4).winner === "pair1", "Set a 6 games 6-4 válido para Pareja 1");
  assert(validateStandardSet(2, 6).isValid && validateStandardSet(2, 6).winner === "pair2", "Set a 6 games 2-6 válido para Pareja 2");
  assert(validateStandardSet(6, 0).isValid, "Set a 6 games 6-0 válido");
  assert(validateStandardSet(7, 5).isValid && validateStandardSet(7, 5).winner === "pair1", "Set a 6 games 7-5 válido");
  assert(validateStandardSet(5, 7).isValid && validateStandardSet(5, 7).winner === "pair2", "Set a 6 games 5-7 válido");
  assert(!validateStandardSet(6, 5).isValid, "Set 6-5 es inválido (debe continuar a 7-5 o 6-6)");
  assert(!validateStandardSet(5, 4).isValid, "Set 5-4 inconcluso es inválido");
  assert(!validateStandardSet(8, 6).isValid, "Set 8-6 es inválido (en 6-6 debe jugarse Tie-Break)");

  // b) En 6-6 definen con Tie-Break a 7 puntos
  assert(validateStandardSet(7, 6).isValid && validateStandardSet(7, 6).winner === "pair1", "Set 7-6 válido para Pareja 1");
  assert(validateStandardSet(6, 7).isValid && validateStandardSet(6, 7).winner === "pair2", "Set 6-7 válido para Pareja 2");
  
  // Tie-Break a 7 puntos con evaluación
  const tb7Std = evaluateTieBreak7PointsStandard(7, 5);
  assert(tb7Std !== null && tb7Std.winner === "pair1", "Tie-Break 7-5 válido para Pareja 1");
  const tb7Sudden = evaluateTieBreak7PointsStandard(7, 6);
  assert(tb7Sudden !== null && tb7Sudden.winner === "pair1" && tb7Sudden.isSuddenDeath === true, "Tie-Break 7-6 válido en muerte súbita");
  const tb7Diff2 = evaluateTieBreak7PointsStandard(8, 6);
  assert(tb7Diff2 !== null && tb7Diff2.winner === "pair1", "Tie-Break 8-6 válido por diferencia de 2");

  const matchSetTb = validateStandardSet(7, 6, 7, 5);
  assert(matchSetTb.isValid && matchSetTb.winner === "pair1", "Set 7-6 con TB (7-5) válido");

  // c) Super Tie-Break a 11 puntos
  const stb11_9 = evaluateSuperTieBreak11Points(11, 9);
  assert(stb11_9 !== null && stb11_9.winner === "pair1", "Super TB 11-9 válido para Pareja 1");
  const stb11_8 = evaluateSuperTieBreak11Points(8, 11);
  assert(stb11_8 !== null && stb11_8.winner === "pair2", "Super TB 8-11 válido para Pareja 2");
  const stb11_10 = evaluateSuperTieBreak11Points(11, 10);
  assert(stb11_10 !== null && stb11_10.winner === "pair1" && stb11_10.isSuddenDeath === true, "Super TB 11-10 muerte súbita válido");
  const stb12_10 = evaluateSuperTieBreak11Points(12, 10);
  assert(stb12_10 !== null && stb12_10.winner === "pair1", "Super TB 12-10 con diferencia de 2 válido");

  // d) Partido completo en modalidad "2 set + super tie break"
  // Victoria directa 2-0
  const match2SetsDirect6Games = validateTwoSetsSuperTieBreak([6, 3], [6, 4]);
  assert(match2SetsDirect6Games.isValid && match2SetsDirect6Games.winner === "pair1", "Victoria 2-0 directa (6-3, 6-4) válida");

  // Empate 1-1 en sets exige Super Tie-Break a 11
  const match11NoStb6Games = validateTwoSetsSuperTieBreak([6, 4], [3, 6]);
  assert(!match11NoStb6Games.isValid, "Empate 1-1 en sets sin Super TB a 11 es inválido");

  // Empate 1-1 con Super Tie-Break a 11 puntos
  const matchFull2SetsStb11 = validateTwoSetsSuperTieBreak([6, 4], [4, 6], [11, 9]);
  assert(matchFull2SetsStb11.isValid && matchFull2SetsStb11.winner === "pair1", "Partido 1-1 con Super TB 11-9 válido para Pareja 1");

  // Empate 1-1 con tie-breaks a 7 y super tie-break a 11
  const matchFullTbAndStb = validateTwoSetsSuperTieBreak(
    [7, 6],
    [6, 7],
    [11, 10],
    [7, 5],
    [5, 7]
  );
  assert(matchFullTbAndStb.isValid && matchFullTbAndStb.winner === "pair1", "Partido completo con sets 7-6, 6-7 y Super TB 11-10 válido");

  // e) Cálculo estructurado calculateTwoSetsSuperTieBreakScore
  const calcTwoSetsSuperTb = calculateTwoSetsSuperTieBreakScore(
    { sets: [6, 4], games_won: 10, games_lost: 10, tiebreak: [11] },
    { sets: [4, 6], games_won: 10, games_lost: 10, tiebreak: [8] }
  );
  assert(calcTwoSetsSuperTb.winner === "pair1" && calcTwoSetsSuperTb.superTbWon === true && calcTwoSetsSuperTb.setsWon === 2, "calculateTwoSetsSuperTieBreakScore asigna 2 sets al ganador tras Super TB");

  // ==========================================================================
  // 4. FASE DE ZONAS, REGLA DE ELIMINACIÓN Y CRITERIOS DE DESEMPATE
  // ==========================================================================
  // a) Zona de 3 parejas (A, B, C; 3 partidos)
  // Partidos round robin generados: 3 partidos
  const rr3Matches = generateRoundRobinMatches(["A", "B", "C"]);
  assert(rr3Matches.length === 3, "Zona de 3 parejas genera exactamente 3 partidos");

  const dummyMatchesZone3: Match[] = [
    {
      id: "m1",
      tournament_id: "t1",
      stage: "zone",
      couple1_id: "pairA",
      couple2_id: "pairB",
      winner_couple_id: "pairA",
      score_set1: "9-5",
      status: "completed",
      created_at: "",
    },
    {
      id: "m2",
      tournament_id: "t1",
      stage: "zone",
      couple1_id: "pairB",
      couple2_id: "pairC",
      winner_couple_id: "pairB",
      score_set1: "9-4",
      status: "completed",
      created_at: "",
    },
    {
      id: "m3",
      tournament_id: "t1",
      stage: "zone",
      couple1_id: "pairA",
      couple2_id: "pairC",
      winner_couple_id: "pairA",
      score_set1: "9-2",
      status: "completed",
      created_at: "",
    },
  ];

  const standingsZone3 = calculateRoundRobinStandings(dummyMatchesZone3, ["pairA", "pairB", "pairC"]);
  assert(standingsZone3[0].pair_id === "pairA", "1° Zona 3: pairA (2 victorias, 4 pts)");
  assert(standingsZone3[1].pair_id === "pairB", "2° Zona 3: pairB (1 victoria, 3 pts)");
  assert(standingsZone3[2].pair_id === "pairC", "3° Zona 3: pairC (0 victorias, 2 pts)");

  // Regla SPT Zona de 3: Clasifican 2 parejas, 1 (la peor) queda eliminada
  const qualifiedZone3 = getQualifiedPairs(standingsZone3);
  const eliminatedZone3 = getEliminatedPair(standingsZone3);
  assert(qualifiedZone3.length === 2, "En zona de 3 clasifican exactamente 2 parejas");
  assert(eliminatedZone3?.pair_id === "pairC", "En zona de 3 la 3ra (pairC) queda estrictamente eliminada");

  // b) Zona de 4 parejas (A, B, C, D; 6 partidos)
  const rr4Matches = generateRoundRobinMatches(["A", "B", "C", "D"]);
  assert(rr4Matches.length === 6, "Zona de 4 parejas genera exactamente 6 partidos");

  const dummyMatchesZone4: Match[] = [
    { id: "z1", tournament_id: "t1", stage: "zone", couple1_id: "pA", couple2_id: "pB", winner_couple_id: "pA", score_set1: "9-4", status: "completed", created_at: "" },
    { id: "z2", tournament_id: "t1", stage: "zone", couple1_id: "pC", couple2_id: "pD", winner_couple_id: "pC", score_set1: "9-5", status: "completed", created_at: "" },
    { id: "z3", tournament_id: "t1", stage: "zone", couple1_id: "pA", couple2_id: "pC", winner_couple_id: "pA", score_set1: "9-6", status: "completed", created_at: "" },
    { id: "z4", tournament_id: "t1", stage: "zone", couple1_id: "pB", couple2_id: "pD", winner_couple_id: "pB", score_set1: "9-3", status: "completed", created_at: "" },
    { id: "z5", tournament_id: "t1", stage: "zone", couple1_id: "pA", couple2_id: "pD", winner_couple_id: "pA", score_set1: "9-1", status: "completed", created_at: "" },
    { id: "z6", tournament_id: "t1", stage: "zone", couple1_id: "pB", couple2_id: "pC", winner_couple_id: "pB", score_set1: "9-7", status: "completed", created_at: "" },
  ];

  const standingsZone4 = calculateRoundRobinStandings(dummyMatchesZone4, ["pA", "pB", "pC", "pD"]);
  assert(standingsZone4[0].pair_id === "pA", "1° Zona 4: pA (3 victorias, 6 pts)");
  assert(standingsZone4[1].pair_id === "pB", "2° Zona 4: pB (2 victorias, 5 pts)");
  assert(standingsZone4[2].pair_id === "pC", "3° Zona 4: pC (1 victoria, 4 pts)");
  assert(standingsZone4[3].pair_id === "pD", "4° Zona 4: pD (0 victorias, 3 pts)");

  // Regla SPT Zona de 4: Clasifican 3 parejas, 1 (la peor) queda eliminada
  const qualifiedZone4 = getQualifiedPairs(standingsZone4);
  const eliminatedZone4 = getEliminatedPair(standingsZone4);
  assert(qualifiedZone4.length === 3, "En zona de 4 clasifican exactamente 3 parejas");
  assert(eliminatedZone4?.pair_id === "pD", "En zona de 4 la 4ta (pD) queda estrictamente eliminada");

  // c) Criterio de Desempate Head-to-Head (enfrentamiento directo entre 2 parejas empatadas)
  // Caso de 2 parejas empatadas en puntos por el 2° puesto: pX vence a pY (9-8)
  const twoTiedMatches: Match[] = [
    { id: "tt1", tournament_id: "t1", stage: "zone", couple1_id: "winner", couple2_id: "pX", winner_couple_id: "winner", score_set1: "9-3", status: "completed", created_at: "" },
    { id: "tt2", tournament_id: "t1", stage: "zone", couple1_id: "winner", couple2_id: "pY", winner_couple_id: "winner", score_set1: "9-2", status: "completed", created_at: "" },
    { id: "tt3", tournament_id: "t1", stage: "zone", couple1_id: "pX", couple2_id: "pY", winner_couple_id: "pX", score_set1: "9-8", status: "completed", created_at: "" },
  ];
  const standingsTwoTied = calculateRoundRobinStandings(twoTiedMatches, ["winner", "pX", "pY"]);
  assert(standingsTwoTied[0].pair_id === "winner", "Winner es 1° invicto con 4 pts");
  assert(standingsTwoTied[1].pair_id === "pX", "pX es 2° por Head-to-Head al vencer a pY");
  assert(standingsTwoTied[2].pair_id === "pY", "pY es 3° y queda eliminada en zona de 3");

  // d) Triple empate circular (A le ganó a B, B le ganó a C, C le ganó a A)
  // Resuelto matemáticamente por diferencia de games
  // A le ganó a B (9-2): diff +7
  // B le ganó a C (9-3): diff +6
  // C le ganó a A (9-8): diff +1
  // Balance total: A (+6), B (-1), C (-5)
  const tripleTieMatches: Match[] = [
    { id: "t1", tournament_id: "t1", stage: "zone", couple1_id: "teamA", couple2_id: "teamB", winner_couple_id: "teamA", score_set1: "9-2", status: "completed", created_at: "" },
    { id: "t2", tournament_id: "t1", stage: "zone", couple1_id: "teamB", couple2_id: "teamC", winner_couple_id: "teamB", score_set1: "9-3", status: "completed", created_at: "" },
    { id: "t3", tournament_id: "t1", stage: "zone", couple1_id: "teamC", couple2_id: "teamA", winner_couple_id: "teamC", score_set1: "9-8", status: "completed", created_at: "" },
  ];
  const standingsTriple = calculateRoundRobinStandings(tripleTieMatches, ["teamA", "teamB", "teamC"]);
  assert(standingsTriple[0].pair_id === "teamA", "Triple empate 1° lugar: teamA por mejor dif de games (+6)");
  assert(standingsTriple[1].pair_id === "teamB", "Triple empate 2° lugar: teamB (-1)");
  assert(standingsTriple[2].pair_id === "teamC", "Triple empate 3° lugar: teamC (-5)");

  // ==========================================================================
  // 5. CUADRO DE PLAYOFFS, CABEZAS DE SERIE Y BYES
  // ==========================================================================
  assert(getNextPowerOf2(2) === 4, "Power of 2 para 2 es 4 (mínimo)");
  assert(getNextPowerOf2(4) === 4, "Power of 2 para 4 es 4");
  assert(getNextPowerOf2(6) === 8, "Power of 2 para 6 es 8");
  assert(getNextPowerOf2(8) === 8, "Power of 2 para 8 es 8");
  assert(getNextPowerOf2(10) === 16, "Power of 2 para 10 es 16");
  assert(getNextPowerOf2(16) === 16, "Power of 2 para 16 es 16");

  // Cuadro de 4 (2 zonas de 3 parejas -> 4 clasificados: 1A, 2A, 1B, 2B)
  const fourPairs: QualifiedPair[] = [
    { pairId: "1A", zoneName: "Zona A", zonePosition: 1, points: 4, gameDifference: 8 },
    { pairId: "1B", zoneName: "Zona B", zonePosition: 1, points: 4, gameDifference: 6 },
    { pairId: "2A", zoneName: "Zona A", zonePosition: 2, points: 3, gameDifference: 2 },
    { pairId: "2B", zoneName: "Zona B", zonePosition: 2, points: 3, gameDifference: 1 },
  ];

  const bracket4 = generateSeededPlayoffBracket(fourPairs);
  assert(bracket4.totalSlots === 4, "Cuadro de 4 slots para 4 parejas");
  assert(bracket4.byesCount === 0, "0 BYEs con 4 parejas");
  assert(bracket4.firstRoundMatches.length === 2, "2 semifinales");

  // Regla SPT: 1A no juega contra 2A en primera ronda
  const m1A = bracket4.firstRoundMatches.find((m) => m.couple1Id === "1A" || m.couple2Id === "1A");
  assert(m1A?.couple1Id !== "2A" && m1A?.couple2Id !== "2A", "Separación de zona: 1A no enfrenta a 2A en semifinales");

  // Seeds 1 y 2 en partidos opuestos (mitades superior e inferior)
  const m1 = bracket4.firstRoundMatches[0];
  const m2 = bracket4.firstRoundMatches[1];
  const seed1InM1 = m1.couple1Id === "1A" || m1.couple2Id === "1A";
  const seed2InM2 = m2.couple1Id === "1B" || m2.couple2Id === "1B";
  assert(seed1InM1 && seed2InM2, "Seed 1 (1A) y Seed 2 (1B) en semifinales opuestas para que solo choquen en la final");

  // Regla Oficial FAP (LIBRO.pdf pág. 122):
  // Semis 1 (P61): 1º A vs 2º B
  // Semis 2 (P62): 2º A vs 1º B
  assert(m1.couple1Id === "1A" && m1.couple2Id === "2B", "1A (1º Zona A) enfrenta a 2B (2º Zona B)");
  assert(
    (m2.couple1Id === "2A" && m2.couple2Id === "1B") || (m2.couple1Id === "1B" && m2.couple2Id === "2A"),
    "Semis 2 enfrenta a 2A y 1B según FAP"
  );

  // Cuadro de 8 con 6 clasificados (2 BYEs)
  const sixPairs: QualifiedPair[] = [
    { pairId: "1A", zoneName: "Zona A", zonePosition: 1, points: 6, gameDifference: 12 },
    { pairId: "1B", zoneName: "Zona B", zonePosition: 1, points: 6, gameDifference: 10 },
    { pairId: "1C", zoneName: "Zona C", zonePosition: 1, points: 6, gameDifference: 8 },
    { pairId: "2A", zoneName: "Zona A", zonePosition: 2, points: 5, gameDifference: 4 },
    { pairId: "2B", zoneName: "Zona B", zonePosition: 2, points: 5, gameDifference: 3 },
    { pairId: "2C", zoneName: "Zona C", zonePosition: 2, points: 5, gameDifference: 2 },
  ];

  const bracket8 = generateSeededPlayoffBracket(sixPairs);
  assert(bracket8.totalSlots === 8, "Con 6 clasificados el cuadro es de 8 (Cuartos)");
  assert(bracket8.byesCount === 2, "Exactamente 2 BYEs asignados");
  assert(bracket8.firstRoundMatches.length === 4, "4 partidos de cuartos de final");

  // Los 2 BYEs deben ir a Seed 1 y Seed 2, y deben estar en mitades opuestas del cuadro
  const byeMatches = bracket8.firstRoundMatches.filter((m) => m.isBye);
  assert(byeMatches.length === 2, "2 partidos tienen BYE");

  // Match 0 (Top Half) y Match 3 (Bottom Half) tienen los BYEs
  assert(bracket8.firstRoundMatches[0].isBye, "Match 0 (mitad superior) tiene BYE");
  assert(bracket8.firstRoundMatches[3].isBye, "Match 3 (mitad inferior) tiene BYE");
  assert(bracket8.firstRoundMatches[0].advancingPairId === "1A", "Seed 1 (1A) avanza por BYE en mitad superior");
  // Cuadro de 8 con 8 clasificados (4 zonas de 3: 1A..1D, 2A..2D)
  const eightPairs: QualifiedPair[] = [
    { pairId: "1A", zoneName: "Zona A", zonePosition: 1, points: 4, gameDifference: 8 },
    { pairId: "1B", zoneName: "Zona B", zonePosition: 1, points: 4, gameDifference: 6 },
    { pairId: "1C", zoneName: "Zona C", zonePosition: 1, points: 4, gameDifference: 4 },
    { pairId: "1D", zoneName: "Zona D", zonePosition: 1, points: 4, gameDifference: 2 },
    { pairId: "2A", zoneName: "Zona A", zonePosition: 2, points: 3, gameDifference: 4 },
    { pairId: "2B", zoneName: "Zona B", zonePosition: 2, points: 3, gameDifference: 3 },
    { pairId: "2C", zoneName: "Zona C", zonePosition: 2, points: 3, gameDifference: 2 },
    { pairId: "2D", zoneName: "Zona D", zonePosition: 2, points: 3, gameDifference: 1 },
  ];
  const bracket8_4zones = generateSeededPlayoffBracket(eightPairs);
  assert(bracket8_4zones.firstRoundMatches.length === 4, "4 partidos de cuartos");
  // Regla Oficial FAP (LIBRO.pdf pág. 128 - 12 Parejas):
  // P57: 1º A vs 2º B
  // P58: 2º C vs 1º D
  // P59: 1º C vs 2º D
  // P60: 2º A vs 1º B
  assert(bracket8_4zones.firstRoundMatches[0].couple1Id === "1A" && bracket8_4zones.firstRoundMatches[0].couple2Id === "2B", "P57: 1A vs 2B (FAP oficial)");
  assert(bracket8_4zones.firstRoundMatches[1].couple1Id === "2C" && bracket8_4zones.firstRoundMatches[1].couple2Id === "1D", "P58: 2C vs 1D (FAP oficial)");
  assert(bracket8_4zones.firstRoundMatches[2].couple1Id === "1C" && bracket8_4zones.firstRoundMatches[2].couple2Id === "2D", "P59: 1C vs 2D (FAP oficial)");
  assert(bracket8_4zones.firstRoundMatches[3].couple1Id === "2A" && bracket8_4zones.firstRoundMatches[3].couple2Id === "1B", "P60: 2A vs 1B (FAP oficial)");

  // Cuadro de 16 con 10 clasificados (6 BYEs)
  const tenPairs: QualifiedPair[] = Array.from({ length: 10 }, (_, i) => ({
    pairId: `pair_${i + 1}`,
    zoneName: `Zona ${String.fromCharCode(65 + (i % 4))}`,
    zonePosition: i < 4 ? 1 : i < 8 ? 2 : 3,
    points: 10 - i,
    gameDifference: 20 - i * 2,
  }));

  const bracket16 = generateSeededPlayoffBracket(tenPairs);
  assert(bracket16.totalSlots === 16, "10 clasificados genera cuadro de 16 (Octavos)");
  assert(bracket16.byesCount === 6, "10 clasificados tiene 6 BYEs");
  assert(bracket16.firstRoundMatches.length === 8, "8 partidos de octavos");

  // Ningún partido de primera ronda debe enfrentar parejas de la misma zona
  let sameZoneConflictFound = false;
  bracket16.firstRoundMatches.forEach((m) => {
    if (!m.isBye && m.couple1Id !== "BYE" && m.couple2Id !== "BYE") {
      const p1 = tenPairs.find((p) => p.pairId === m.couple1Id);
      const p2 = tenPairs.find((p) => p.pairId === m.couple2Id);
      if (p1 && p2 && p1.zoneName === p2.zoneName) {
        sameZoneConflictFound = true;
      }
    }
  });
  assert(!sameZoneConflictFound, "Playoffs: Ningún partido de 1ra ronda enfrenta parejas de la misma zona");

  // ==========================================================================
  // 6. SISTEMA DE DOBLE RANKING (PAREJA vs INDIVIDUAL)
  // ==========================================================================
  // 6. SISTEMA OFICIAL DE PUNTOS Y DOBLE RANKING SPT
  // ==========================================================================
  // A) Verificación de la Estructura de Distribución Porcentual Oficial
  assert(SPT_DISTRIBUTION_PERCENTAGES.champion === 1.0, "Campeón = 100% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.runner_up === 0.6, "Subcampeón = 60% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.semifinalist === 0.35, "Semifinalistas = 35% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.quarterfinalist === 0.2, "Cuartos de final = 20% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.round_of_16 === 0.12, "Octavos de final = 12% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.round_of_32 === 0.07, "16avos de final = 7% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.base_participation === 0.03, "Base de Participación = 3% de P");
  assert(SPT_DISTRIBUTION_PERCENTAGES.zone_win_bonus === 0.02, "Bonus victoria zona eliminadas = 2% de P");

  // B) Validación con Ejemplo Oficial: Torneo 1000 (P = 1000)
  const t1000Couples = [
    { id: "c_champ", player1_id: "p1", player2_id: "p2" },
    { id: "c_runner", player1_id: "p3", player2_id: "p4" },
    { id: "c_semi1", player1_id: "p5", player2_id: "p6" },
    { id: "c_semi2", player1_id: "p7", player2_id: "p8" },
    { id: "c_qf", player1_id: "p9", player2_id: "p10" },
    { id: "c_r16", player1_id: "p11", player2_id: "p12" },
    { id: "c_r32", player1_id: "p13", player2_id: "p14" },
  ];
  const t1000Matches: Match[] = [
    // 16avos: c_r32 vs c_r16 (gana c_r16)
    { id: "m_r32", tournament_id: "t1000", stage: "round_of_32", couple1_id: "c_r32", couple2_id: "c_r16", winner_couple_id: "c_r16", status: "completed", created_at: "" },
    // Octavos: c_r16 vs c_qf (gana c_qf)
    { id: "m_r16", tournament_id: "t1000", stage: "round_of_16", couple1_id: "c_r16", couple2_id: "c_qf", winner_couple_id: "c_qf", status: "completed", created_at: "" },
    // Cuartos: c_qf vs c_semi1 (gana c_semi1)
    { id: "m_qf", tournament_id: "t1000", stage: "quarter", couple1_id: "c_qf", couple2_id: "c_semi1", winner_couple_id: "c_semi1", status: "completed", created_at: "" },
    // Semifinales
    { id: "m_s1", tournament_id: "t1000", stage: "semi", couple1_id: "c_semi1", couple2_id: "c_champ", winner_couple_id: "c_champ", status: "completed", created_at: "" },
    { id: "m_s2", tournament_id: "t1000", stage: "semi", couple1_id: "c_semi2", couple2_id: "c_runner", winner_couple_id: "c_runner", status: "completed", created_at: "" },
    // Final
    { id: "m_f", tournament_id: "t1000", stage: "final", couple1_id: "c_champ", couple2_id: "c_runner", winner_couple_id: "c_champ", status: "completed", created_at: "" },
  ];

  const stats1000 = calculateTournamentStageStats(t1000Matches, t1000Couples, 1000);
  assert(stats1000["c_champ"].pointsEarned === 1000, "Torneo 1000: Campeones = 1.000 pts (100%)");
  assert(stats1000["c_runner"].pointsEarned === 600, "Torneo 1000: Subcampeones = 600 pts (60%)");
  assert(stats1000["c_semi1"].pointsEarned === 350, "Torneo 1000: Semifinalista 1 = 350 pts (35%)");
  assert(stats1000["c_semi2"].pointsEarned === 350, "Torneo 1000: Semifinalista 2 = 350 pts (35%)");
  assert(stats1000["c_qf"].pointsEarned === 200, "Torneo 1000: Cuartos de final = 200 pts (20%)");
  assert(stats1000["c_r16"].pointsEarned === 120, "Torneo 1000: Octavos de final = 120 pts (12%)");
  assert(stats1000["c_r32"].pointsEarned === 70, "Torneo 1000: 16avos de final = 70 pts (7%)");

  // C) Validación con Ejemplo Oficial: Torneo 500 (P = 500)
  const stats500 = calculateTournamentStageStats(t1000Matches, t1000Couples, 500);
  assert(stats500["c_champ"].pointsEarned === 500, "Torneo 500: Campeones = 500 pts (100%)");
  assert(stats500["c_runner"].pointsEarned === 300, "Torneo 500: Subcampeones = 300 pts (60%)");
  assert(stats500["c_semi1"].pointsEarned === 175, "Torneo 500: Semifinalistas = 175 pts (35%)");
  assert(stats500["c_qf"].pointsEarned === 100, "Torneo 500: Cuartos de final = 100 pts (20%)");
  assert(stats500["c_r16"].pointsEarned === 60, "Torneo 500: Octavos de final = 60 pts (12%)");
  assert(stats500["c_r32"].pointsEarned === 35, "Torneo 500: 16avos de final = 35 pts (7%)");

  // D) Tratamiento de Fase de Grupos (Zonas) y Parejas Eliminadas
  const zoneTournamentCouples = [
    { id: "c_elim0", player1_id: "e1", player2_id: "e2" }, // 0 partidos ganados en zona
    { id: "c_elim1", player1_id: "e3", player2_id: "e4" }, // 1 partido ganado en zona
    { id: "c_elim2", player1_id: "e5", player2_id: "e6" }, // 2 partidos ganados en zona
    { id: "c_clas1", player1_id: "k1", player2_id: "k2" }, // Clasificada 1°
    { id: "c_clas2", player1_id: "k3", player2_id: "k4" }, // Clasificada 2°
  ];

  const zoneMatches: Match[] = [
    // Partidos en fase de grupos
    { id: "zm1", tournament_id: "tz", stage: "zone", couple1_id: "c_elim1", couple2_id: "c_elim0", winner_couple_id: "c_elim1", status: "completed", created_at: "" },
    { id: "zm2", tournament_id: "tz", stage: "zone", couple1_id: "c_elim2", couple2_id: "c_elim0", winner_couple_id: "c_elim2", status: "completed", created_at: "" },
    { id: "zm3", tournament_id: "tz", stage: "zone", couple1_id: "c_elim2", couple2_id: "c_elim1", winner_couple_id: "c_elim2", status: "completed", created_at: "" },
    // Cuadro eliminatorio (solo ingresan clas1 y clas2)
    { id: "pm1", tournament_id: "tz", stage: "quarter", couple1_id: "c_clas1", couple2_id: "c_clas2", winner_couple_id: "c_clas1", status: "completed", created_at: "" },
  ];

  // En Torneo 1000:
  const zoneStats1000 = calculateTournamentStageStats(zoneMatches, zoneTournamentCouples, 1000);
  assert(zoneStats1000["c_elim0"].pointsEarned === 30, "Zona Torneo 1000: Eliminada con 0 PG = 30 pts (3% base)");
  assert(zoneStats1000["c_elim1"].pointsEarned === 50, "Zona Torneo 1000: Eliminada con 1 PG = 50 pts (3% base + 2% bonus)");
  assert(zoneStats1000["c_elim2"].pointsEarned === 70, "Zona Torneo 1000: Eliminada con 2 PG = 70 pts (3% base + 4% bonus)");
  assert(zoneStats1000["c_clas2"].pointsEarned === 200, "Zona Torneo 1000: Clasificada adopta Cuartos (20% = 200 pts)");
  assert(zoneStats1000["c_clas1"].pointsEarned === 350, "Zona Torneo 1000: Ganadora de Cuartos avanza a Semis (35% = 350 pts)");

  // En Torneo 500:
  const zoneStats500 = calculateTournamentStageStats(zoneMatches, zoneTournamentCouples, 500);
  assert(zoneStats500["c_elim0"].pointsEarned === 15, "Zona Torneo 500: Eliminada con 0 PG = 15 pts (3% base)");
  assert(zoneStats500["c_elim1"].pointsEarned === 25, "Zona Torneo 500: Eliminada con 1 PG = 25 pts (3% base + 2% bonus)");
  assert(zoneStats500["c_elim2"].pointsEarned === 35, "Zona Torneo 500: Eliminada con 2 PG = 35 pts (3% base + 4% bonus)");
  assert(zoneStats500["c_clas2"].pointsEarned === 100, "Zona Torneo 500: Clasificada adopta Cuartos (20% = 100 pts)");
  assert(zoneStats500["c_clas1"].pointsEarned === 175, "Zona Torneo 500: Ganadora de Cuartos avanza a Semis (35% = 175 pts)");

  // Clave canónica de parejas
  assert(getCoupleKey("p1", "p2") === "p1_p2", "getCoupleKey('p1', 'p2') es 'p1_p2'");
  assert(getCoupleKey("p2", "p1") === "p1_p2", "getCoupleKey('p2', 'p1') es simétrico e invariante al orden");

  // E) Simulación de Doble Ranking acumulado (100% individual a cada jugador)
  // Torneo 1 (1000 pts):
  // C1: jA + jB -> CAMPEONES (1000 pts)
  // C2: jC + jD -> SUBCAMPEONES (600 pts)
  // C3: jE + jF -> SEMIS (350 pts)
  const tournament1Couples = [
    { id: "c1", player1_id: "jA", player2_id: "jB" },
    { id: "c2", player1_id: "jC", player2_id: "jD" },
    { id: "c3", player1_id: "jE", player2_id: "jF" },
  ];
  const tournament1Matches: Match[] = [
    { id: "m_semi", tournament_id: "t1", stage: "semi", couple1_id: "c1", couple2_id: "c3", winner_couple_id: "c1", score_set1: "9-4", status: "completed", created_at: "" },
    { id: "m_final", tournament_id: "t1", stage: "final", couple1_id: "c1", couple2_id: "c2", winner_couple_id: "c1", score_set1: "9-5", status: "completed", created_at: "" },
  ];

  const t1Stats = calculateTournamentStageStats(tournament1Matches, tournament1Couples, 1000);
  assert(t1Stats["c1"].pointsEarned === 1000, "C1 campeón obtiene 1.000 pts");
  assert(t1Stats["c2"].pointsEarned === 600, "C2 subcampeón obtiene 600 pts");
  assert(t1Stats["c3"].pointsEarned === 350, "C3 semifinalista obtiene 350 pts");

  let coupleRankings = new Map<string, CoupleRankingRecord>();
  let indivRankings = new Map<string, IndividualRankingRecord>();

  const update1 = processDoubleRankingUpdate({
    existingCoupleRankings: coupleRankings,
    existingIndividualRankings: indivRankings,
    tournamentStats: t1Stats,
    category: "5ta",
  });
  coupleRankings = update1.updatedCoupleRankings;
  indivRankings = update1.updatedIndividualRankings;

  // Cada jugador suma el 100% individualmente
  const c1Key = getCoupleKey("jA", "jB");
  assert(coupleRankings.get(c1Key)?.points === 1000, "Ranking Pareja [jA-jB] = 1.000 pts");
  assert(indivRankings.get("jA")?.points === 1000, "Ranking Individual jA = 1.000 pts (100%)");
  assert(indivRankings.get("jB")?.points === 1000, "Ranking Individual jB = 1.000 pts (100%)");

  // Torneo 2 (1000 pts):
  // jA juega ahora con jC -> SUBCAMPEONES (600 pts).
  // jB juega con jE -> SEMIS (350 pts).
  // jD juega con jF -> CAMPEONES (1000 pts).
  const tournament2Couples = [
    { id: "c_AC", player1_id: "jA", player2_id: "jC" },
    { id: "c_BE", player1_id: "jB", player2_id: "jE" },
    { id: "c_DF", player1_id: "jD", player2_id: "jF" },
  ];
  const tournament2Matches: Match[] = [
    { id: "m2_semi", tournament_id: "t2", stage: "semi", couple1_id: "c_AC", couple2_id: "c_BE", winner_couple_id: "c_AC", score_set1: "9-6", status: "completed", created_at: "" },
    { id: "m2_final", tournament_id: "t2", stage: "final", couple1_id: "c_DF", couple2_id: "c_AC", winner_couple_id: "c_DF", score_set1: "9-7", status: "completed", created_at: "" },
  ];

  const t2Stats = calculateTournamentStageStats(tournament2Matches, tournament2Couples, 1000);
  const update2 = processDoubleRankingUpdate({
    existingCoupleRankings: coupleRankings,
    existingIndividualRankings: indivRankings,
    tournamentStats: t2Stats,
    category: "5ta",
  });
  coupleRankings = update2.updatedCoupleRankings;
  indivRankings = update2.updatedIndividualRankings;

  // Verificaciones del Sistema de Doble Ranking:
  assert(coupleRankings.get(c1Key)?.points === 1000, "Ranking Pareja [jA-jB] intacto en 1.000 pts al no competir junta");
  const keyAC = getCoupleKey("jA", "jC");
  assert(coupleRankings.get(keyAC)?.points === 600, "Ranking nueva Pareja [jA-jC] = 600 pts");

  // Ranking Individual:
  // jA = 1000 + 600 = 1600 pts
  assert(indivRankings.get("jA")?.points === 1600, "Ranking Individual jA acumuló 1.600 pts (1000 + 600)");
  // jB = 1000 + 350 = 1350 pts
  assert(indivRankings.get("jB")?.points === 1350, "Ranking Individual jB acumuló 1.350 pts (1000 + 350)");
  // jC = 600 (T1) + 600 (T2) = 1200 pts
  assert(indivRankings.get("jC")?.points === 1200, "Ranking Individual jC acumuló 1.200 pts (600 + 600)");

  // 6. Torneo 3: La pareja original [jA-jB] vuelve a jugar junta y ganan (1000 pts)
  const tournament3Couples = [
    { id: "c_AB_3", player1_id: "jA", player2_id: "jB" },
    { id: "c_XY_3", player1_id: "jX", player2_id: "jY" },
  ];
  const tournament3Matches: Match[] = [
    { id: "m3_final", tournament_id: "t3", stage: "final", couple1_id: "c_AB_3", couple2_id: "c_XY_3", winner_couple_id: "c_AB_3", score_set1: "9-5", status: "completed", created_at: "" },
  ];
  const t3Stats = calculateTournamentStageStats(tournament3Matches, tournament3Couples, 1000);
  const update3 = processDoubleRankingUpdate({
    existingCoupleRankings: coupleRankings,
    existingIndividualRankings: indivRankings,
    tournamentStats: t3Stats,
    category: "5ta",
  });
  coupleRankings = update3.updatedCoupleRankings;
  indivRankings = update3.updatedIndividualRankings;

  assert(coupleRankings.get(c1Key)?.points === 2000, "Ranking Pareja [jA-jB] acumuló 2.000 pts en 2 torneos jugados juntos (1000 + 1000)");
  assert(coupleRankings.get(c1Key)?.tournamentsPlayed === 2, "Ranking Pareja [jA-jB] registra 2 torneos jugados");
  assert(indivRankings.get("jA")?.points === 2600, "Ranking Individual jA acumuló 2.600 pts sumando todos sus torneos (1000 + 600 + 1000)");
  assert(indivRankings.get("jA")?.tournamentsPlayed === 3, "Ranking Individual jA registra 3 torneos disputados");
  assert(indivRankings.get("jB")?.points === 2350, "Ranking Individual jB acumuló 2.350 pts sumando todos sus torneos (1000 + 350 + 1000)");
  assert(indivRankings.get("jB")?.tournamentsPlayed === 3, "Ranking Individual jB registra 3 torneos disputados");

  // 7. Verificación de cálculo de puntos acumulados en curso (hasta el momento de la consulta)
  const inProgressCouples = [
    { id: "pair1", player1_id: "p1", player2_id: "p2" },
    { id: "pair2", player1_id: "p3", player2_id: "p4" },
  ];
  const inProgressMatches: Match[] = [
    {
      id: "m_r16",
      tournament_id: "t_prog",
      stage: "round_of_16",
      couple1_id: "pair1",
      couple2_id: "pair2",
      winner_couple_id: "pair1",
      score_set1: "9-4",
      status: "completed",
      created_at: "",
    },
  ];
  const inProgStats = calculateTournamentStageStats(inProgressMatches, inProgressCouples, 1000);
  assert(inProgStats["pair1"].pointsEarned === 200, "El ganador de octavos ya tiene garantizados al menos 200 pts (cuartofinalista = 20%)");
  assert(inProgStats["pair2"].pointsEarned === 120, "El perdedor de octavos recibe 120 pts (octavofinalista = 12%)");
  assert(inProgStats["pair1"].highestStage === "quarterfinalist", "pair1 avanzó a quarterfinalist");
  assert(inProgStats["pair2"].highestStage === "round_of_16", "pair2 finalizó en round_of_16");

  // ==========================================================================
  // 7. PRUEBAS DE ESTRÉS Y SIMULACIÓN MASIVA (100 Torneos Aleatorios)
  // ==========================================================================
  let stressPassed = true;
  for (let sim = 0; sim < 100; sim++) {
    // Número aleatorio de parejas en la zona (3 o 4)
    const size = sim % 2 === 0 ? 3 : 4;
    const pairIds = Array.from({ length: size }, (_, i) => `sim_${sim}_p${i}`);

    const simMatches: Match[] = [];
    let matchIdx = 0;
    for (let i = 0; i < pairIds.length; i++) {
      for (let j = i + 1; j < pairIds.length; j++) {
        // Marcador aleatorio válido de 9 games
        const isTb = Math.random() > 0.7;
        let g1 = 9;
        let g2 = Math.floor(Math.random() * 8);
        let tb1: number | undefined;
        let tb2: number | undefined;

        if (isTb) {
          g1 = 9;
          g2 = 8;
          tb1 = 7;
          tb2 = Math.floor(Math.random() * 7);
        }

        const p1Wins = Math.random() > 0.5;
        const winner = p1Wins ? pairIds[i] : pairIds[j];

        simMatches.push({
          id: `sim_m_${sim}_${matchIdx++}`,
          tournament_id: `sim_tour_${sim}`,
          stage: "zone",
          couple1_id: pairIds[i],
          couple2_id: pairIds[j],
          winner_couple_id: winner,
          score_set1: isTb ? `9-8 (${p1Wins ? `${tb1}-${tb2}` : `${tb2}-${tb1}`})` : `${p1Wins ? `${g1}-${g2}` : `${g2}-${g1}`}`,
          status: "completed",
          created_at: "",
        });
      }
    }

    const simStandings = calculateRoundRobinStandings(simMatches, pairIds);
    if (simStandings.length !== size) stressPassed = false;

    const qualified = getQualifiedPairs(simStandings);
    const eliminated = getEliminatedPair(simStandings);

    // En zona de 3 clasifican 2; en zona de 4 clasifican 3
    if (size === 3 && qualified.length !== 2) stressPassed = false;
    if (size === 4 && qualified.length !== 3) stressPassed = false;
    if (!eliminated || eliminated.pair_id !== simStandings[simStandings.length - 1].pair_id) {
      stressPassed = false;
    }
  }

  assert(stressPassed, "Prueba de Estrés: 100 zonas aleatorias resueltas sin errores ni fallos de ordenamiento");

  // ==========================================================================
  // 6. REGLAS DE FORMACIÓN DE PAREJAS (Unicidad y Jugadores Disponibles)
  // ==========================================================================
  const samplePlayers: Player[] = [
    { id: "p1", first_name: "Matías", last_name: "Vidal", created_at: "" },
    { id: "p2", first_name: "Juan", last_name: "Pérez", created_at: "" },
    { id: "p3", first_name: "Lucas", last_name: "González", created_at: "" },
    { id: "p4", first_name: "Carlos", last_name: "López", created_at: "" },
    { id: "p5", first_name: "Federico", last_name: "Gómez", created_at: "" },
  ];

  const sampleCouples: Couple[] = [
    {
      id: "c1",
      tournament_id: "tour_1",
      player1_id: "p1",
      player2_id: "p2",
      created_at: "",
    },
    {
      id: "c2",
      tournament_id: "tour_2", // Distinto torneo
      player1_id: "p1",
      player2_id: "p3",
      created_at: "",
    },
  ];

  // a) getAssignedPlayerIdsInTournament
  const assignedTour1 = getAssignedPlayerIdsInTournament(sampleCouples, "tour_1");
  assert(assignedTour1.has("p1") && assignedTour1.has("p2"), "Jugadores p1 y p2 están asignados en tour_1");
  assert(!assignedTour1.has("p3") && !assignedTour1.has("p4"), "Jugadores p3 y p4 NO están asignados en tour_1");

  const assignedTour1ExcludingC1 = getAssignedPlayerIdsInTournament(sampleCouples, "tour_1", "c1");
  assert(assignedTour1ExcludingC1.size === 0, "Al excluir c1, ningún jugador está asignado en tour_1");

  // b) getAvailablePlayersForTournament: Jugador que ya integra pareja NO aparece en la lista
  const availableTour1 = getAvailablePlayersForTournament(samplePlayers, sampleCouples, "tour_1");
  assert(availableTour1.length === 3, "Hay exactamente 3 jugadores disponibles en tour_1");
  assert(availableTour1.some((p) => p.id === "p3"), "Jugador libre p3 está disponible en tour_1");
  assert(availableTour1.some((p) => p.id === "p4"), "Jugador libre p4 está disponible en tour_1");
  assert(availableTour1.some((p) => p.id === "p5"), "Jugador libre p5 está disponible en tour_1");
  assert(!availableTour1.some((p) => p.id === "p1"), "Jugador asignado p1 NO aparece en la lista de disponibles");
  assert(!availableTour1.some((p) => p.id === "p2"), "Jugador asignado p2 NO aparece en la lista de disponibles");

  // Jugador ya elegido como Jugador 1 se excluye de las opciones para Jugador 2 (evita auto-pareja)
  const availableForPartner = getAvailablePlayersForTournament(samplePlayers, sampleCouples, "tour_1", null, "p3");
  assert(!availableForPartner.some((p) => p.id === "p3"), "Jugador p3 ya seleccionado se excluye para Jugador 2");
  assert(availableForPartner.length === 2, "Quedan 2 jugadores disponibles para ser compañero de p3");

  // Orden alfabético por APELLIDO, nombre en jugadores disponibles
  const unsortedPlayers: Player[] = [
    { id: "u3", first_name: "Carlos", last_name: "Zapata", created_at: "" },
    { id: "u1", first_name: "Juan", last_name: "Álvarez", created_at: "" },
    { id: "u2", first_name: "Andrés", last_name: "Benítez", created_at: "" },
    { id: "u4", first_name: "Bernardo", last_name: "Álvarez", created_at: "" },
  ];
  const sortedAvail = getAvailablePlayersForTournament(unsortedPlayers, [], "tour_any");
  assert(sortedAvail[0].id === "u4", "Álvarez Bernardo primero");
  assert(sortedAvail[1].id === "u1", "Álvarez Juan segundo");
  assert(sortedAvail[2].id === "u2", "Benítez Andrés tercero");
  assert(sortedAvail[3].id === "u3", "Zapata Carlos cuarto");

  // c) validateCoupleFormation
  // Caso válido: dos jugadores libres
  const validFormation = validateCoupleFormation("tour_1", "p3", "p4", sampleCouples);
  assert(validFormation.isValid === true, "Formación válida con jugadores libres p3 y p4");

  // Caso inválido: mismo jugador en ambas posiciones
  const selfPairing = validateCoupleFormation("tour_1", "p3", "p3", sampleCouples);
  assert(!selfPairing.isValid && selfPairing.error?.includes("distintas") === true, "Rechaza formar pareja consigo mismo (p3-p3)");

  // Caso inválido: Jugador 1 ya integra una pareja en este torneo
  const p1AlreadyInCouple = validateCoupleFormation("tour_1", "p1", "p3", sampleCouples);
  assert(!p1AlreadyInCouple.isValid && p1AlreadyInCouple.error?.includes("Jugador 1 ya integra") === true, "Rechaza si Jugador 1 ya está en una pareja en el torneo");

  // Caso inválido: Jugador 2 ya integra una pareja en este torneo
  const p2AlreadyInCouple = validateCoupleFormation("tour_1", "p4", "p2", sampleCouples);
  assert(!p2AlreadyInCouple.isValid && p2AlreadyInCouple.error?.includes("Jugador 2 ya integra") === true, "Rechaza si Jugador 2 ya está en una pareja en el torneo");

  // Caso válido en edición: los miembros de la pareja editada pueden mantenerse
  const editSamePlayers = validateCoupleFormation("tour_1", "p1", "p2", sampleCouples, "c1");
  assert(editSamePlayers.isValid === true, "Permite editar y conservar los mismos jugadores excluyendo la pareja actual");

  // Caso válido en edición: cambiar uno de los jugadores por uno libre
  const editWithFreePlayer = validateCoupleFormation("tour_1", "p1", "p5", sampleCouples, "c1");
  assert(editWithFreePlayer.isValid === true, "Permite editar y cambiar jugador por uno libre");

  // d) Numeración correlativa de parejas (Pareja 1, Pareja 2, Pareja 3...)
  const numberingCouples: Couple[] = [
    {
      id: "coup_a",
      tournament_id: "tour_x",
      player1_id: "p1",
      player2_id: "p2",
      created_at: "2026-09-10T10:00:00Z",
      player1: { id: "p1", first_name: "Juan", last_name: "Pérez", created_at: "" },
      player2: { id: "p2", first_name: "Carlos", last_name: "Gómez", created_at: "" },
    },
    {
      id: "coup_b",
      tournament_id: "tour_x",
      player1_id: "p3",
      player2_id: "p4",
      created_at: "2026-09-10T10:05:00Z",
      player1: { id: "p3", first_name: "Marcos", last_name: "Díaz", created_at: "" },
      player2: { id: "p4", first_name: "Lucas", last_name: "Soto", created_at: "" },
    },
    {
      id: "coup_c",
      tournament_id: "tour_x",
      player1_id: "p5",
      player2_id: "p6",
      created_at: "2026-09-10T10:10:00Z",
      player1: { id: "p5", first_name: "Matías", last_name: "Vidal", created_at: "" },
      player2: { id: "p6", first_name: "Agustín", last_name: "Ruiz", created_at: "" },
    },
  ];

  const numberMap = getCoupleNumberMap(numberingCouples);
  assert(numberMap.get("coup_a") === 1, "coup_a es Pareja 1");
  assert(numberMap.get("coup_b") === 2, "coup_b es Pareja 2");
  assert(numberMap.get("coup_c") === 3, "coup_c es Pareja 3");

  // Formateo de nombres con inicial y apellido ("I. Apellido")
  assert(formatPlayerShortName({ first_name: "Matias", last_name: "Vidal" }) === "M. Vidal", "Matias Vidal abrevia a M. Vidal");
  assert(formatPlayerShortName({ first_name: "Carlos", last_name: "Gómez" }) === "C. Gómez", "Carlos Gómez abrevia a C. Gómez");
  assert(formatPlayerShortName({ first_name: "Agustín", last_name: "Ruiz" }) === "A. Ruiz", "Agustín Ruiz abrevia a A. Ruiz");
  assert(formatPlayerShortName({ first_name: "Lucas", last_name: "" }) === "Lucas", "Jugador sin apellido conserva su nombre");

  // Formateo de nombres completos para rankings ("Nombre Apellido")
  assert(formatPlayerFullName({ first_name: "Matias", last_name: "Ferrin" }) === "Matias Ferrin", "Matias Ferrin sin abreviar");
  assert(formatPlayerFullName({ first_name: "Carlos", last_name: "Modica" }) === "Carlos Modica", "Carlos Modica sin abreviar");
  assert(formatPlayerFullName({ first_name: "Lucas", last_name: "" }) === "Lucas", "Jugador sin apellido conserva su nombre completo");

  const label1 = getCoupleLabelWithNumber(numberingCouples[0], 1);
  assert(label1 === "Pareja 1: J. Pérez / C. Gómez", "Formato Pareja 1 abreviado correcto");

  const label2 = getCoupleLabelWithNumber(numberingCouples[1], 2);
  assert(label2 === "Pareja 2: M. Díaz / L. Soto", "Formato Pareja 2 abreviado correcto");

  const label3 = getCoupleLabelWithNumber(numberingCouples[2], 3);
  assert(label3 === "Pareja 3: M. Vidal / A. Ruiz", "Formato Pareja 3 abreviado correcto");

  // Formato completo sin abreviar opcional
  const labelFull = getCoupleLabelWithNumber(numberingCouples[2], 3, false);
  assert(labelFull === "Pareja 3: Matías Vidal / Agustín Ruiz", "Formato completo sin abreviar accesible con flag");

  // Formato oficial de llaves/cuadro: únicamente apellidos de los jugadores
  const labelLastNames = getCoupleLastNames(numberingCouples[2]);
  assert(labelLastNames === "Vidal / Ruiz", "getCoupleLastNames devuelve únicamente los apellidos de los jugadores");

  // e) Generación automática de parejas con numeración consecutiva
  const playersForAuto: Player[] = [
    { id: "ap1", first_name: "A1", last_name: "L1", created_at: "" },
    { id: "ap2", first_name: "A2", last_name: "L2", created_at: "" },
    { id: "ap3", first_name: "A3", last_name: "L3", created_at: "" },
    { id: "ap4", first_name: "A4", last_name: "L4", created_at: "" },
  ];

  const autoGenerated = generateRandomCouples(playersForAuto, "tour_x", 4);
  assert(autoGenerated.length === 2, "Se generaron exactamente 2 parejas a partir de 4 jugadores");
  assert(autoGenerated[0].couple_number === 4, "La primera pareja generada es Pareja 4");
  assert(autoGenerated[1].couple_number === 5, "La segunda pareja generada es Pareja 5");
  assert(autoGenerated[0].label.startsWith("Pareja 4:"), "Etiqueta comienza con 'Pareja 4:'");
  assert(autoGenerated[1].label.startsWith("Pareja 5:"), "Etiqueta comienza con 'Pareja 5:'");


  // ==========================================================================
  // 7. DISTRIBUCIÓN Y CONFECCIÓN DE ZONAS (Zonas de 3 o 4 parejas)
  // ==========================================================================
  // Caso solicitado por el usuario: 20 parejas con zonas de 4 -> 5 zonas de 4 parejas
  const zones20 = calculateOptimalZones(20, 4);
  assert(zones20.numZones === 5, "20 parejas con objetivo de 4 genera exactamente 5 zonas");
  assert(zones20.distribution.length === 5, "Se crearon 5 zonas (Zonas A, B, C, D, E)");
  assert(zones20.distribution.every((z) => z.targetCount === 4), "Cada una de las 5 zonas tiene exactamente 4 parejas");
  assert(zones20.summary === "5 zonas de 4 parejas", "Resumen correcto: 5 zonas de 4 parejas");
  assert(zones20.isEqual === true, "20 parejas genera zonas perfectamente iguales");
  assert(zones20.missingCouples === 0 && zones20.missingPlayers === 0, "No faltan jugadores para 20 parejas");

  // 16 parejas -> 4 zonas de 4
  const zones16 = calculateOptimalZones(16, 4);
  assert(zones16.numZones === 4 && zones16.distribution.every((z) => z.targetCount === 4), "16 parejas genera 4 zonas de 4");
  assert(zones16.isEqual === true && zones16.missingPlayers === 0, "16 parejas es perfectamente igual");

  // 12 parejas con objetivo de 4 -> 3 zonas de 4
  const zones12_4 = calculateOptimalZones(12, 4);
  assert(zones12_4.numZones === 3 && zones12_4.distribution.every((z) => z.targetCount === 4), "12 parejas con objetivo 4 genera 3 zonas de 4");
  assert(zones12_4.isEqual === true && zones12_4.missingPlayers === 0, "12 parejas con objetivo 4 es igual");

  // 12 parejas con objetivo de 3 -> 4 zonas de 3
  const zones12_3 = calculateOptimalZones(12, 3);
  assert(zones12_3.numZones === 4 && zones12_3.distribution.every((z) => z.targetCount === 3), "12 parejas con objetivo 3 genera 4 zonas de 3");
  assert(zones12_3.isEqual === true && zones12_3.missingPlayers === 0, "12 parejas con objetivo 3 es igual");

  // 18 parejas con objetivo de 4 -> 18 % 4 = 2 -> faltan 2 parejas (4 jugadores) para completar 5 zonas de 4
  const zones18 = calculateOptimalZones(18, 4);
  assert(zones18.isEqual === false, "18 parejas no genera zonas estrictamente iguales de 4");
  assert(zones18.missingCouples === 2, "18 parejas le faltan 2 parejas para completar zonas de 4");
  assert(zones18.missingPlayers === 4, "18 parejas le faltan 4 jugadores (2 parejas * 2)");
  assert(zones18.warningMessage !== null && zones18.warningMessage.includes("4 jugadores"), "El mensaje de advertencia menciona 4 jugadores");

  // 14 parejas con objetivo de 4 -> 14 % 4 = 2 -> faltan 2 parejas (4 jugadores)
  const zones14 = calculateOptimalZones(14, 4);
  assert(zones14.isEqual === false, "14 parejas no es igual para zonas de 4");
  assert(zones14.missingCouples === 2 && zones14.missingPlayers === 4, "14 parejas le faltan 4 jugadores");

  // 11 parejas con objetivo de 4 -> 11 % 4 = 3 -> falta 1 pareja (2 jugadores) para 3 zonas de 4
  const zones11 = calculateOptimalZones(11, 4);
  assert(zones11.numZones === 3, "11 parejas genera 3 zonas");
  assert(zones11.isEqual === false, "11 parejas no es igual");
  assert(zones11.missingCouples === 1, "11 parejas le falta 1 pareja");
  assert(zones11.missingPlayers === 2, "11 parejas le faltan 2 jugadores (1 pareja * 2)");

  // 10 parejas con objetivo de 3 -> 10 % 3 = 1 -> faltan 2 parejas (4 jugadores) para 4 zonas de 3
  const zones10_3 = calculateOptimalZones(10, 3);
  assert(zones10_3.isEqual === false, "10 parejas no es igual para zonas de 3");
  assert(zones10_3.missingCouples === 2 && zones10_3.missingPlayers === 4, "10 parejas le faltan 4 jugadores para zonas de 3");

  // 0 parejas registradas
  const zones0 = calculateOptimalZones(0, 4);
  assert(zones0.isEqual === false, "0 parejas no es igual");
  assert(zones0.missingCouples === 4 && zones0.missingPlayers === 8, "0 parejas le faltan 8 jugadores (4 parejas)");

  // Forzar número de zonas personalizado (ej: 20 parejas forzado a 5 zonas -> 20 % 5 = 0 -> igual)
  const customZones = calculateOptimalZones(20, 4, 5);
  assert(customZones.numZones === 5, "Respeta número de zonas personalizado (5 zonas)");
  assert(customZones.isEqual === true && customZones.missingPlayers === 0, "20 parejas en 5 zonas es igual");

  // Forzar 19 parejas en 5 zonas -> 19 % 5 = 4 -> falta 1 pareja (2 jugadores)
  const customZones19 = calculateOptimalZones(19, 4, 5);
  assert(customZones19.isEqual === false, "19 parejas en 5 zonas no es igual");
  assert(customZones19.missingCouples === 1 && customZones19.missingPlayers === 2, "19 parejas en 5 zonas le faltan 2 jugadores");

  // Tests para getZoneSuggestions (Sugerencias de Zonas de 4 y Zonas de 3 con parejas sobrantes)
  const sugs14 = getZoneSuggestions(14);
  assert(sugs14.suggestion4.numZones === 4, "14 parejas con zonas de 4 genera 4 zonas (3 de 4 + 1 de 2)");
  assert(sugs14.suggestion4.fullZonesCount === 3, "14 parejas tiene 3 zonas completas de 4");
  assert(sugs14.suggestion4.remainderSize === 2, "14 parejas tiene 1 zona sobrante de 2");
  assert(sugs14.suggestion4.hasRemainder === true, "14 parejas con zonas de 4 tiene sobrantes");

  assert(sugs14.suggestion3.numZones === 5, "14 parejas con zonas de 3 genera 5 zonas (4 de 3 + 1 de 2)");
  assert(sugs14.suggestion3.fullZonesCount === 4, "14 parejas tiene 4 zonas completas de 3");
  assert(sugs14.suggestion3.remainderSize === 2, "14 parejas tiene 1 zona sobrante de 2 para zonas de 3");

  const sugs12 = getZoneSuggestions(12);
  assert(sugs12.suggestion4.numZones === 3 && sugs12.suggestion4.hasRemainder === false, "12 parejas da 3 zonas exactas de 4");
  assert(sugs12.suggestion3.numZones === 4 && sugs12.suggestion3.hasRemainder === false, "12 parejas da 4 zonas exactas de 3");

  // Regla SPT: NUNCA zonas vacías ni con una sola pareja (mínimo 2 parejas por zona)
  // Caso 5 parejas: zonas de 4 no pueden dar (4, 1), deben dar 1 zona de 3 y 1 zona de 2
  const sugs5 = getZoneSuggestions(5);
  assert(sugs5.suggestion4.numZones === 2, "5 parejas genera 2 zonas");
  assert(sugs5.suggestion4.distribution.every((z) => z.count >= 2), "5 parejas: ninguna zona tiene menos de 2 parejas");
  assert(sugs5.suggestion4.distribution.length === 2, "5 parejas: 2 zonas en distribución");
  assert(sugs5.suggestion4.distribution[0].count === 3 && sugs5.suggestion4.distribution[1].count === 2, "5 parejas se reparten en 3 y 2");

  // Caso 9 parejas con zonas de 4: 9 = 4 + 3 + 2 (nunca 4 + 4 + 1)
  const sugs9 = getZoneSuggestions(9);
  assert(sugs9.suggestion4.numZones === 3, "9 parejas genera 3 zonas");
  assert(sugs9.suggestion4.distribution.every((z) => z.count >= 2), "9 parejas con zonas de 4: todas las zonas tienen >= 2 parejas");
  assert(!sugs9.suggestion4.distribution.some((z) => z.count === 1 || z.count === 0), "9 parejas: nunca zonas de 1 ni de 0 parejas");

  // Caso 7 parejas con zonas de 3: 7 = 3 + 2 + 2 (nunca 3 + 3 + 1)
  const sugs7 = getZoneSuggestions(7);
  assert(sugs7.suggestion3.numZones === 3, "7 parejas genera 3 zonas");
  assert(sugs7.suggestion3.distribution.every((z) => z.count >= 2), "7 parejas con zonas de 3: todas las zonas tienen >= 2 parejas");
  assert(!sugs7.suggestion3.distribution.some((z) => z.count === 1 || z.count === 0), "7 parejas: nunca zonas de 1 ni de 0 parejas");

  // Test de invariante exhaustivo: Para 2 a 32 parejas, NUNCA debe haber zonas de 0 ni 1 parejas
  for (let c = 2; c <= 32; c++) {
    const opt4 = calculateOptimalZones(c, 4);
    assert(opt4.distribution.every((z) => z.targetCount >= 2), `calculateOptimalZones(${c}, 4): todas las zonas tienen >= 2 parejas`);
    assert(!opt4.distribution.some((z) => z.targetCount === 0), `calculateOptimalZones(${c}, 4): ninguna zona vacía`);
    assert(!opt4.distribution.some((z) => z.targetCount === 1), `calculateOptimalZones(${c}, 4): ninguna zona con 1 pareja`);

    const opt3 = calculateOptimalZones(c, 3);
    assert(opt3.distribution.every((z) => z.targetCount >= 2), `calculateOptimalZones(${c}, 3): todas las zonas tienen >= 2 parejas`);
    assert(!opt3.distribution.some((z) => z.targetCount === 0), `calculateOptimalZones(${c}, 3): ninguna zona vacía`);
    assert(!opt3.distribution.some((z) => z.targetCount === 1), `calculateOptimalZones(${c}, 3): ninguna zona con 1 pareja`);

    const sugs = getZoneSuggestions(c);
    assert(sugs.suggestion4.distribution.every((z) => z.count >= 2), `getZoneSuggestions(${c}).sug4: todas las zonas tienen >= 2 parejas`);
    assert(!sugs.suggestion4.distribution.some((z) => z.count === 0), `getZoneSuggestions(${c}).sug4: ninguna zona vacía`);
    assert(!sugs.suggestion4.distribution.some((z) => z.count === 1), `getZoneSuggestions(${c}).sug4: ninguna zona con 1 pareja`);

    assert(sugs.suggestion3.distribution.every((z) => z.count >= 2), `getZoneSuggestions(${c}).sug3: todas las zonas tienen >= 2 parejas`);
    assert(!sugs.suggestion3.distribution.some((z) => z.count === 0), `getZoneSuggestions(${c}).sug3: ninguna zona vacía`);
    assert(!sugs.suggestion3.distribution.some((z) => z.count === 1), `getZoneSuggestions(${c}).sug3: ninguna zona con 1 pareja`);
  }

  // ==========================================================================
  // 8. AVANCE AUTOMÁTICO DE GANADORES EN CUADRO DE PLAYOFFS
  // ==========================================================================
  // Test de normalización y secuencia de etapas
  assert(normalizeStage("round_of_16") === "round_of_16", "Normaliza round_of_16");
  assert(normalizeStage("octavos") === "round_of_16", "Normaliza octavos");
  assert(normalizeStage("cuartos") === "quarter", "Normaliza cuartos");
  assert(normalizeStage("semifinal") === "semi", "Normaliza semifinal");
  assert(getNextStage("round_of_16") === "quarter", "Siguiente etapa a round_of_16 es quarter");
  assert(getNextStage("octavos") === "quarter", "Siguiente etapa a octavos es quarter");
  assert(getNextStage("quarter") === "semi", "Siguiente etapa a quarter es semi");
  assert(getNextStage("cuartos") === "semi", "Siguiente etapa a cuartos es semi");
  assert(getNextStage("semi") === "final", "Siguiente etapa a semi es final");
  assert(getNextStage("semifinal") === "final", "Siguiente etapa a semifinal es final");
  assert(getNextStage("final") === null, "Siguiente etapa a final es null");
  assert(getNextStage("zone") === null, "Siguiente etapa a zone es null");

  // Simulación de cuadro de 16 parejas (Octavos -> Cuartos -> Semis -> Final)
  const r16Matches: Match[] = Array.from({ length: 8 }, (_, i) => ({
    id: `m_oct_${i}`,
    tournament_id: "t_playoff",
    stage: "round_of_16",
    match_number: 100 + i,
    status: "pending" as const,
    created_at: `2026-09-14T10:0${i}:00Z`,
  }));

  const qfMatches: Match[] = Array.from({ length: 4 }, (_, i) => ({
    id: `m_qf_${i}`,
    tournament_id: "t_playoff",
    stage: "quarter",
    match_number: 108 + i,
    status: "pending" as const,
    created_at: `2026-09-14T11:0${i}:00Z`,
  }));

  const sfMatches: Match[] = Array.from({ length: 2 }, (_, i) => ({
    id: `m_sf_${i}`,
    tournament_id: "t_playoff",
    stage: "semi",
    match_number: 112 + i,
    status: "pending" as const,
    created_at: `2026-09-14T12:0${i}:00Z`,
  }));

  const fMatch: Match = {
    id: "m_final_0",
    tournament_id: "t_playoff",
    stage: "final",
    match_number: 114,
    status: "pending" as const,
    created_at: "2026-09-14T13:00:00Z",
  };

  const allSimMatches = [...r16Matches, ...qfMatches, ...sfMatches, fMatch];

  // 1. De Octavos a Cuartos
  // Partido 0 de Octavos -> Cuartos 0 (couple1_id)
  const slotOct0 = findNextPlayoffMatchSlot(allSimMatches, r16Matches[0]);
  assert(slotOct0 !== null, "Octavos 0 encuentra slot en Cuartos");
  assert(slotOct0?.targetMatchId === "m_qf_0", "Octavos 0 avanza a Cuartos 0");
  assert(slotOct0?.slotField === "couple1_id", "Octavos 0 avanza a couple1_id (slot par)");

  // Partido 1 de Octavos -> Cuartos 0 (couple2_id)
  const slotOct1 = findNextPlayoffMatchSlot(allSimMatches, r16Matches[1]);
  assert(slotOct1?.targetMatchId === "m_qf_0", "Octavos 1 avanza a Cuartos 0");
  assert(slotOct1?.slotField === "couple2_id", "Octavos 1 avanza a couple2_id (slot impar)");

  // Partido 2 de Octavos -> Cuartos 1 (couple1_id)
  const slotOct2 = findNextPlayoffMatchSlot(allSimMatches, r16Matches[2]);
  assert(slotOct2?.targetMatchId === "m_qf_1", "Octavos 2 avanza a Cuartos 1");
  assert(slotOct2?.slotField === "couple1_id", "Octavos 2 avanza a couple1_id");

  // Partido 3 de Octavos -> Cuartos 1 (couple2_id)
  const slotOct3 = findNextPlayoffMatchSlot(allSimMatches, r16Matches[3]);
  assert(slotOct3?.targetMatchId === "m_qf_1", "Octavos 3 avanza a Cuartos 1");
  assert(slotOct3?.slotField === "couple2_id", "Octavos 3 avanza a couple2_id");

  // Partido 6 de Octavos -> Cuartos 3 (couple1_id)
  const slotOct6 = findNextPlayoffMatchSlot(allSimMatches, r16Matches[6]);
  assert(slotOct6?.targetMatchId === "m_qf_3", "Octavos 6 avanza a Cuartos 3");
  assert(slotOct6?.slotField === "couple1_id", "Octavos 6 avanza a couple1_id");

  // Partido 7 de Octavos -> Cuartos 3 (couple2_id)
  const slotOct7 = findNextPlayoffMatchSlot(allSimMatches, r16Matches[7]);
  assert(slotOct7?.targetMatchId === "m_qf_3", "Octavos 7 avanza a Cuartos 3");
  assert(slotOct7?.slotField === "couple2_id", "Octavos 7 avanza a couple2_id");

  // 2. De Cuartos a Semifinales
  const slotQf0 = findNextPlayoffMatchSlot(allSimMatches, qfMatches[0]);
  assert(slotQf0?.targetMatchId === "m_sf_0", "Cuartos 0 avanza a Semifinal 0");
  assert(slotQf0?.slotField === "couple1_id", "Cuartos 0 avanza a couple1_id");

  const slotQf1 = findNextPlayoffMatchSlot(allSimMatches, qfMatches[1]);
  assert(slotQf1?.targetMatchId === "m_sf_0", "Cuartos 1 avanza a Semifinal 0");
  assert(slotQf1?.slotField === "couple2_id", "Cuartos 1 avanza a couple2_id");

  const slotQf2 = findNextPlayoffMatchSlot(allSimMatches, qfMatches[2]);
  assert(slotQf2?.targetMatchId === "m_sf_1", "Cuartos 2 avanza a Semifinal 1");
  assert(slotQf2?.slotField === "couple1_id", "Cuartos 2 avanza a couple1_id");

  const slotQf3 = findNextPlayoffMatchSlot(allSimMatches, qfMatches[3]);
  assert(slotQf3?.targetMatchId === "m_sf_1", "Cuartos 3 avanza a Semifinal 1");
  assert(slotQf3?.slotField === "couple2_id", "Cuartos 3 avanza a couple2_id");

  // 3. De Semifinales a Gran Final
  const slotSf0 = findNextPlayoffMatchSlot(allSimMatches, sfMatches[0]);
  assert(slotSf0?.targetMatchId === "m_final_0", "Semifinal 0 avanza a la Gran Final");
  assert(slotSf0?.slotField === "couple1_id", "Semifinal 0 avanza a couple1_id");

  const slotSf1 = findNextPlayoffMatchSlot(allSimMatches, sfMatches[1]);
  assert(slotSf1?.targetMatchId === "m_final_0", "Semifinal 1 avanza a la Gran Final");
  assert(slotSf1?.slotField === "couple2_id", "Semifinal 1 avanza a couple2_id");

  // 4. Gran Final no tiene etapa siguiente
  const slotFinal = findNextPlayoffMatchSlot(allSimMatches, fMatch);
  assert(slotFinal === null, "La Gran Final no tiene partido siguiente (termina el torneo)");

  // 5. Partido de Zona no tiene avance directo mediante este helper
  const zoneMatch: Match = {
    id: "z_match",
    tournament_id: "t_playoff",
    stage: "zone",
    status: "completed",
    created_at: "",
  };
  const slotZone = findNextPlayoffMatchSlot(allSimMatches, zoneMatch);
  assert(slotZone === null, "Partidos de zona no usan avance de playoff directo");

  // 6. Simulación dinámica de avance paso a paso:
  // Crear un estado mutable de partidos de playoffs y simular las victorias
  const livePlayoffs: Record<string, { couple1_id?: string | null; couple2_id?: string | null; winner_couple_id?: string | null; status: string }> = {};
  allSimMatches.forEach((m) => {
    livePlayoffs[m.id] = { couple1_id: null, couple2_id: null, winner_couple_id: null, status: "pending" };
  });

  // Parejas en Cuartos (4 cruces):
  // Q0: Pareja_A vs Pareja_B -> Gana Pareja_A
  // Q1: Pareja_C vs Pareja_D -> Gana Pareja_C
  // Q2: Pareja_E vs Pareja_F -> Gana Pareja_F
  // Q3: Pareja_G vs Pareja_H -> Gana Pareja_G

  const playMatch = (match: Match, winnerId: string) => {
    const slot = findNextPlayoffMatchSlot(allSimMatches, match);
    if (slot) {
      if (slot.slotField === "couple1_id") {
        livePlayoffs[slot.targetMatchId].couple1_id = winnerId;
      } else {
        livePlayoffs[slot.targetMatchId].couple2_id = winnerId;
      }
    }
  };

  playMatch(qfMatches[0], "Pareja_A");
  playMatch(qfMatches[1], "Pareja_C");
  playMatch(qfMatches[2], "Pareja_F");
  playMatch(qfMatches[3], "Pareja_G");

  // Verificar que la Semifinal 0 tiene a Pareja_A vs Pareja_C
  assert(livePlayoffs["m_sf_0"].couple1_id === "Pareja_A", "Semis 0 tiene como couple1 a Pareja_A");
  assert(livePlayoffs["m_sf_0"].couple2_id === "Pareja_C", "Semis 0 tiene como couple2 a Pareja_C");

  // Verificar que la Semifinal 1 tiene a Pareja_F vs Pareja_G
  assert(livePlayoffs["m_sf_1"].couple1_id === "Pareja_F", "Semis 1 tiene como couple1 a Pareja_F");
  assert(livePlayoffs["m_sf_1"].couple2_id === "Pareja_G", "Semis 1 tiene como couple2 a Pareja_G");

  // Jugar Semifinales:
  // Semis 0: Pareja_A vs Pareja_C -> Gana Pareja_A
  // Semis 1: Pareja_F vs Pareja_G -> Gana Pareja_G
  playMatch(sfMatches[0], "Pareja_A");
  playMatch(sfMatches[1], "Pareja_G");

  // Verificar que la Gran Final tiene a Pareja_A vs Pareja_G
  assert(livePlayoffs["m_final_0"].couple1_id === "Pareja_A", "Gran Final tiene a Pareja_A como couple1");
  assert(livePlayoffs["m_final_0"].couple2_id === "Pareja_G", "Gran Final tiene a Pareja_G como couple2");

  // 7. Pruebas de propagatePlayoffWinners (Propagación automática y auto-sanación en memoria):
  // Simular un cuadro donde octavos fueron completados pero cuartos y semis tenían couple1_id/couple2_id null
  const unpropagatedMatches: Match[] = [
    // Octavos (8 partidos)
    { id: "oct_0", stage: "round_of_16", match_number: 100, winner_couple_id: "c_winner_0", status: "completed" } as Match,
    { id: "oct_1", stage: "round_of_16", match_number: 101, winner_couple_id: "c_winner_1", status: "completed" } as Match,
    { id: "oct_2", stage: "round_of_16", match_number: 102, winner_couple_id: "c_winner_2", status: "completed" } as Match,
    { id: "oct_3", stage: "round_of_16", match_number: 103, winner_couple_id: "c_winner_3", status: "completed" } as Match,
    { id: "oct_4", stage: "round_of_16", match_number: 104, winner_couple_id: "c_winner_4", status: "completed" } as Match,
    { id: "oct_5", stage: "round_of_16", match_number: 105, winner_couple_id: "c_winner_5", status: "completed" } as Match,
    { id: "oct_6", stage: "round_of_16", match_number: 106, winner_couple_id: "c_winner_6", status: "completed" } as Match,
    { id: "oct_7", stage: "round_of_16", match_number: 107, winner_couple_id: "c_winner_7", status: "completed" } as Match,
    // Cuartos (4 partidos, con slots vacíos inicialmente)
    { id: "qf_0", stage: "quarter", match_number: 108, couple1_id: null, couple2_id: null, winner_couple_id: "c_winner_0", status: "completed" } as Match,
    { id: "qf_1", stage: "quarter", match_number: 109, couple1_id: null, couple2_id: null, winner_couple_id: "c_winner_3", status: "completed" } as Match,
    { id: "qf_2", stage: "quarter", match_number: 110, couple1_id: null, couple2_id: null, winner_couple_id: null, status: "pending" } as Match,
    { id: "qf_3", stage: "quarter", match_number: 111, couple1_id: null, couple2_id: null, winner_couple_id: null, status: "pending" } as Match,
    // Semifinales (2 partidos, slots vacíos)
    { id: "sf_0", stage: "semi", match_number: 112, couple1_id: null, couple2_id: null, winner_couple_id: null, status: "pending" } as Match,
    { id: "sf_1", stage: "semi", match_number: 113, couple1_id: null, couple2_id: null, winner_couple_id: null, status: "pending" } as Match,
    // Final (1 partido)
    { id: "f_0", stage: "final", match_number: 114, couple1_id: null, couple2_id: null, winner_couple_id: null, status: "pending" } as Match,
  ];

  const { updatedMatches, updatesToPersist } = propagatePlayoffWinners(unpropagatedMatches);

  // Validar Cuartos: los ganadores de Octavos deben haber llenado todos los slots de Cuartos
  const updatedQ0 = updatedMatches.find((m) => m.id === "qf_0");
  const updatedQ1 = updatedMatches.find((m) => m.id === "qf_1");
  const updatedQ2 = updatedMatches.find((m) => m.id === "qf_2");
  const updatedQ3 = updatedMatches.find((m) => m.id === "qf_3");

  assert(updatedQ0?.couple1_id === "c_winner_0", "Cuartos 0 slot 1 recibe c_winner_0");
  assert(updatedQ0?.couple2_id === "c_winner_1", "Cuartos 0 slot 2 recibe c_winner_1");
  assert(updatedQ1?.couple1_id === "c_winner_2", "Cuartos 1 slot 1 recibe c_winner_2");
  assert(updatedQ1?.couple2_id === "c_winner_3", "Cuartos 1 slot 2 recibe c_winner_3");
  assert(updatedQ2?.couple1_id === "c_winner_4", "Cuartos 2 slot 1 recibe c_winner_4");
  assert(updatedQ2?.couple2_id === "c_winner_5", "Cuartos 2 slot 2 recibe c_winner_5");
  assert(updatedQ3?.couple1_id === "c_winner_6", "Cuartos 3 slot 1 recibe c_winner_6");
  assert(updatedQ3?.couple2_id === "c_winner_7", "Cuartos 3 slot 2 recibe c_winner_7");

  // Validar Semifinales: los ganadores de Cuartos (qf_0: c_winner_0 y qf_1: c_winner_3) deben haber llenado Semis 0
  const updatedSf0 = updatedMatches.find((m) => m.id === "sf_0");
  const updatedSf1 = updatedMatches.find((m) => m.id === "sf_1");

  assert(updatedSf0?.couple1_id === "c_winner_0", "Semis 0 slot 1 recibe ganador de qf_0 (c_winner_0)");
  assert(updatedSf0?.couple2_id === "c_winner_3", "Semis 0 slot 2 recibe ganador de qf_1 (c_winner_3)");
  assert(updatedSf1?.couple1_id === null, "Semis 1 slot 1 permanece null porque qf_2 está pendiente");
  assert(updatedSf1?.couple2_id === null, "Semis 1 slot 2 permanece null porque qf_3 está pendiente");

  // Validar updatesToPersist: contiene exactamente las actualizaciones necesarias
  assert(updatesToPersist.length > 0, "updatesToPersist reporta partidos para persistir en BD");
  assert(updatesToPersist.some((u) => u.id === "qf_0" && u.couple1_id === "c_winner_0" && u.couple2_id === "c_winner_1"), "updatesToPersist incluye qf_0");
  assert(updatesToPersist.some((u) => u.id === "sf_0" && u.couple1_id === "c_winner_0" && u.couple2_id === "c_winner_3"), "updatesToPersist incluye sf_0");

  // 8. Pruebas de getStageName y nombres amigables de fases del fixture
  assert(getStageName("zone") === "Fase de Zonas", "getStageName zone retorna Fase de Zonas");
  assert(getStageName("round_of_16") === "Octavos de Final", "getStageName round_of_16 retorna Octavos de Final");
  assert(getStageName("octavos") === "Octavos de Final", "getStageName octavos retorna Octavos de Final");
  assert(getStageName("quarter") === "Cuartos de Final", "getStageName quarter retorna Cuartos de Final");
  assert(getStageName("cuartos") === "Cuartos de Final", "getStageName cuartos retorna Cuartos de Final");
  assert(getStageName("semi") === "Semifinales", "getStageName semi retorna Semifinales");
  assert(getStageName("semifinal") === "Semifinales", "getStageName semifinal retorna Semifinales");
  assert(getStageName("final") === "Gran Final", "getStageName final retorna Gran Final");

  // 9. Hidratación de objetos couple1/couple2 en fixture al avanzar
  const matchesWithCouples: Match[] = [
    {
      id: "oct_a",
      stage: "round_of_16",
      match_number: 100,
      couple1_id: "c1",
      couple2_id: "c2",
      winner_couple_id: "c1",
      status: "completed",
      couple1: { id: "c1", tournament_id: "t1" } as Couple,
    } as Match,
    {
      id: "oct_b",
      stage: "round_of_16",
      match_number: 101,
      couple1_id: "c3",
      couple2_id: "c4",
      winner_couple_id: "c4",
      status: "completed",
      couple2: { id: "c4", tournament_id: "t1" } as Couple,
    } as Match,
    {
      id: "qf_a",
      stage: "quarter",
      match_number: 108,
      couple1_id: null,
      couple2_id: null,
      status: "pending",
    } as Match,
  ];

  const { updatedMatches: fixtureConformed } = propagatePlayoffWinners(matchesWithCouples);
  const qfMatch = fixtureConformed.find((m) => m.id === "qf_a");
  assert(qfMatch?.couple1_id === "c1", "Cuartos fixture conforma couple1_id automáticamente con ganador de oct_a");
  assert(qfMatch?.couple2_id === "c4", "Cuartos fixture conforma couple2_id automáticamente con ganador de oct_b");
  assert((qfMatch as any)?.couple1?.id === "c1", "Cuartos fixture hidrata objeto couple1");
  assert((qfMatch as any)?.couple2?.id === "c4", "Cuartos fixture hidrata objeto couple2");

  // =========================================================================
  // 14. REGLAS DE ELEGIBILIDAD POR GÉNERO Y CATEGORÍA
  // =========================================================================
  const tourMasc6ta = {
    id: "tour_masc_6ta",
    name: "Torneo Masculino 6ta",
    category: "6ta",
    gender: "Masculino",
    date: "2026-10-01",
    status: "active",
  } as any;

  const tourFem6ta = {
    id: "tour_fem_6ta",
    name: "Torneo Femenino 6ta",
    category: "6ta",
    gender: "Femenino",
    date: "2026-10-01",
    status: "active",
  } as any;

  const playerH5ta: Player = { id: "ph5", first_name: "Hombre", last_name: "5ta", gender: "Masculino", category: "5ta", created_at: "" };
  const playerH6ta: Player = { id: "ph6", first_name: "Hombre", last_name: "6ta", gender: "Masculino", category: "6ta", created_at: "" };
  const playerH7ma: Player = { id: "ph7", first_name: "Hombre", last_name: "7ma", gender: "Masculino", category: "7ma", created_at: "" };
  const playerM4ta: Player = { id: "pm4", first_name: "Mujer", last_name: "4ta", gender: "Femenino", category: "4ta", created_at: "" };
  const playerM5ta: Player = { id: "pm5", first_name: "Mujer", last_name: "5ta", gender: "Femenino", category: "5ta", created_at: "" };
  const playerM6ta: Player = { id: "pm6", first_name: "Mujer", last_name: "6ta", gender: "Femenino", category: "6ta", created_at: "" };

  // a) Torneo Masculino 6ta:
  // - Hombre 5ta NO puede jugar en torneo de categoría inferior (6ta)
  const elH5 = isPlayerEligibleForTournament(playerH5ta, tourMasc6ta);
  assert(elH5.eligible === false, "Hombre 5ta NO es elegible para Torneo Masculino 6ta (no jugar en categoría inferior)");

  // - Hombre 6ta y 7ma SÍ pueden jugar
  const elH6 = isPlayerEligibleForTournament(playerH6ta, tourMasc6ta);
  assert(elH6.eligible === true, "Hombre 6ta SÍ es elegible para Torneo Masculino 6ta");
  const elH7 = isPlayerEligibleForTournament(playerH7ma, tourMasc6ta);
  assert(elH7.eligible === true, "Hombre 7ma SÍ es elegible para Torneo Masculino 6ta");

  // - Mujer 5ta SÍ puede jugar en Torneo Masculino 6ta (regla especial de hasta una categoría superior)
  const elM5 = isPlayerEligibleForTournament(playerM5ta, tourMasc6ta);
  assert(elM5.eligible === true, "Mujer 5ta SÍ es elegible para Torneo Masculino 6ta (permite hasta 1 cat superior)");

  // - Mujer 4ta NO puede jugar en Torneo Masculino 6ta (2 categorías superiores)
  const elM4 = isPlayerEligibleForTournament(playerM4ta, tourMasc6ta);
  assert(elM4.eligible === false, "Mujer 4ta NO es elegible para Torneo Masculino 6ta (supera el límite de 1 cat)");

  // - Mujer 6ta SÍ puede jugar en Torneo Masculino 6ta
  const elM6 = isPlayerEligibleForTournament(playerM6ta, tourMasc6ta);
  assert(elM6.eligible === true, "Mujer 6ta SÍ es elegible para Torneo Masculino 6ta");

  // b) Torneo Femenino 6ta:
  // - Hombre NO puede inscribirse en Torneo Femenino
  const elHEnFem = isPlayerEligibleForTournament(playerH6ta, tourFem6ta);
  assert(elHEnFem.eligible === false, "Hombre NO es elegible para Torneo Femenino");

  // - Mujer 5ta NO puede jugar en Torneo Femenino de categoría inferior (6ta)
  const elM5EnFem = isPlayerEligibleForTournament(playerM5ta, tourFem6ta);
  assert(elM5EnFem.eligible === false, "Mujer 5ta NO es elegible para Torneo Femenino 6ta (no jugar en categoría inferior)");

  // - Mujer 6ta SÍ puede jugar en Torneo Femenino 6ta
  const elM6EnFem = isPlayerEligibleForTournament(playerM6ta, tourFem6ta);
  assert(elM6EnFem.eligible === true, "Mujer 6ta SÍ es elegible para Torneo Femenino 6ta");

  // c) validateCoupleFormation con validación de torneo
  const allTestPlayers = [playerH5ta, playerH6ta, playerH7ma, playerM4ta, playerM5ta, playerM6ta];

  // Pareja válida: Hombre 6ta + Mujer 5ta en Torneo Masculino 6ta
  const validMix = validateCoupleFormation("tour_masc_6ta", "ph6", "pm5", [], null, tourMasc6ta, allTestPlayers);
  assert(validMix.isValid === true, "Pareja Hombre 6ta + Mujer 5ta es válida en Torneo Masculino 6ta");

  // Pareja inválida: Hombre 5ta + Hombre 6ta en Torneo Masculino 6ta (H5 no puede)
  const invalidH5 = validateCoupleFormation("tour_masc_6ta", "ph5", "ph6", [], null, tourMasc6ta, allTestPlayers);
  assert(invalidH5.isValid === false && invalidH5.error?.includes("categoría inferior") === true, "Rechaza pareja con Hombre 5ta en Torneo 6ta");

  // Pareja inválida: Hombre 6ta en Torneo Femenino 6ta
  const invalidManInFem = validateCoupleFormation("tour_fem_6ta", "pm6", "ph6", [], null, tourFem6ta, allTestPlayers);
  assert(invalidManInFem.isValid === false && invalidManInFem.error?.includes("Femenino") === true, "Rechaza hombre en Torneo Femenino");

  // =========================================================================
  // 15. REGLAS DE TORNEOS FORMATO "SUMA" (Suma de Categorías de Parejas)
  // =========================================================================
  // a) Helpers de detección y extracción
  assert(isSumaCategory("Suma 10") === true, "Detecta 'Suma 10'");
  assert(isSumaCategory("SUMA 8") === true, "Detecta 'SUMA 8' en mayúsculas");
  assert(isSumaCategory("Suma 14") === true, "Detecta 'Suma 14'");
  assert(isSumaCategory("6ta") === false, "6ta no es formato SUMA");
  assert(isSumaCategory("5ta Categoría") === false, "5ta Categoría no es formato SUMA");

  assert(parseSumaTarget("Suma 10") === 10, "parseSumaTarget('Suma 10') = 10");
  assert(parseSumaTarget("SUMA 8") === 8, "parseSumaTarget('SUMA 8') = 8");
  assert(parseSumaTarget("Suma 12") === 12, "parseSumaTarget('Suma 12') = 12");
  assert(parseSumaTarget("6ta") === null, "parseSumaTarget('6ta') = null");

  // b) Torneos SUMA de prueba
  const tourSuma10Masc = {
    id: "tour_suma_10_masc",
    name: "Torneo Masculino Suma 10",
    category: "Suma 10",
    gender: "Masculino",
    date: "2026-10-15",
    status: "active",
  } as any;

  const tourSuma10Fem = {
    id: "tour_suma_10_fem",
    name: "Torneo Femenino Suma 10",
    category: "Suma 10",
    gender: "Femenino",
    date: "2026-10-15",
    status: "active",
  } as any;

  const pMasc3ra: Player = { id: "p_m3", first_name: "Hombre", last_name: "3ra", gender: "Masculino", category: "3ra", created_at: "" };
  const pMasc4ta: Player = { id: "p_m4", first_name: "Hombre", last_name: "4ta", gender: "Masculino", category: "4ta", created_at: "" };
  const pMasc5ta: Player = { id: "p_m5", first_name: "Hombre", last_name: "5ta", gender: "Masculino", category: "5ta", created_at: "" };
  const pMasc6ta: Player = { id: "p_m6", first_name: "Hombre", last_name: "6ta", gender: "Masculino", category: "6ta", created_at: "" };
  const pMasc7ma: Player = { id: "p_m7", first_name: "Hombre", last_name: "7ma", gender: "Masculino", category: "7ma", created_at: "" };
  const pFem4ta: Player = { id: "p_f4", first_name: "Mujer", last_name: "4ta", gender: "Femenino", category: "4ta", created_at: "" };
  const pFem5ta: Player = { id: "p_f5", first_name: "Mujer", last_name: "5ta", gender: "Femenino", category: "5ta", created_at: "" };
  const pFem6ta: Player = { id: "p_f6", first_name: "Mujer", last_name: "6ta", gender: "Femenino", category: "6ta", created_at: "" };

  // c) Cómputo de nivel efectivo
  // Hombre en torneo Masculino -> nivel directo
  assert(getEffectivePlayerLevelForTournament(pMasc4ta, tourSuma10Masc) === 4, "Hombre 4ta en Masc computa 4");
  assert(getEffectivePlayerLevelForTournament(pMasc5ta, tourSuma10Masc) === 5, "Hombre 5ta en Masc computa 5");
  // Mujer en torneo Masculino -> bonificación de +1 en su categoría (5ta computa 6)
  assert(getEffectivePlayerLevelForTournament(pFem5ta, tourSuma10Masc) === 6, "Mujer 5ta en Masc computa 6 (bonificación reglamentaria)");
  assert(getEffectivePlayerLevelForTournament(pFem4ta, tourSuma10Masc) === 5, "Mujer 4ta en Masc computa 5 (bonificación reglamentaria)");
  // Mujer en torneo Femenino -> nivel directo
  assert(getEffectivePlayerLevelForTournament(pFem5ta, tourSuma10Fem) === 5, "Mujer 5ta en Fem computa 5");

  // d) Validación de Suma en Torneo Masculino Suma 10
  // 1. Caso 5ta + 5ta = 10 (Válido)
  const suma5y5 = validateCoupleCategorySuma(pMasc5ta, pMasc5ta, tourSuma10Masc);
  assert(suma5y5.isValid === true && suma5y5.sum === 10, "Suma 10: 5ta + 5ta = 10 es Válido");

  // 2. Caso 4ta + 6ta = 10 (Válido)
  const suma4y6 = validateCoupleCategorySuma(pMasc4ta, pMasc6ta, tourSuma10Masc);
  assert(suma4y6.isValid === true && suma4y6.sum === 10, "Suma 10: 4ta + 6ta = 10 es Válido");

  // 3. Caso 3ra + 7ma = 10 (Válido)
  const suma3y7 = validateCoupleCategorySuma(pMasc3ra, pMasc7ma, tourSuma10Masc);
  assert(suma3y7.isValid === true && suma3y7.sum === 10, "Suma 10: 3ra + 7ma = 10 es Válido");

  // 4. Caso 5ta + 6ta = 11 (Válido: sum >= 10, menor nivel deportivo)
  const suma5y6 = validateCoupleCategorySuma(pMasc5ta, pMasc6ta, tourSuma10Masc);
  assert(suma5y6.isValid === true && suma5y6.sum === 11, "Suma 10: 5ta + 6ta = 11 es Válido (sum >= 10)");

  // 5. Caso 4ta + 5ta = 9 (Rechazado: suma menor al límite de nivel)
  const suma4y5 = validateCoupleCategorySuma(pMasc4ta, pMasc5ta, tourSuma10Masc);
  assert(suma4y5.isValid === false && suma4y5.sum === 9, "Suma 10: 4ta + 5ta = 9 es Rechazado (supera nivel permitido)");

  // 6. Caso mixto: Hombre 4ta + Mujer 5ta en Torneo Masculino Suma 10
  // 4 + (5 + 1) = 4 + 6 = 10 (Válido)
  const sumaMixtoValido = validateCoupleCategorySuma(pMasc4ta, pFem5ta, tourSuma10Masc);
  assert(sumaMixtoValido.isValid === true && sumaMixtoValido.sum === 10, "Suma 10: Hombre 4ta (4) + Mujer 5ta (computa 6) = 10 es Válido");

  // 7. Caso mixto: Hombre 4ta + Mujer 4ta en Torneo Masculino Suma 10
  // 4 + (4 + 1) = 4 + 5 = 9 (Rechazado)
  const sumaMixtoInvalido = validateCoupleCategorySuma(pMasc4ta, pFem4ta, tourSuma10Masc);
  assert(sumaMixtoInvalido.isValid === false && sumaMixtoInvalido.sum === 9, "Suma 10: Hombre 4ta (4) + Mujer 4ta (computa 5) = 9 es Rechazado");

  // e) Validación en Torneo Femenino Suma 10
  // Dos mujeres 5ta: 5 + 5 = 10 (Válido)
  const sumaFemValida = validateCoupleCategorySuma(pFem5ta, pFem5ta, tourSuma10Fem);
  assert(sumaFemValida.isValid === true && sumaFemValida.sum === 10, "Suma 10 Femenino: Mujer 5ta + Mujer 5ta = 10 es Válido");

  // Hombre en Torneo Femenino Suma 10 (Rechazado por género)
  const sumaHombreEnFem = validateCoupleCategorySuma(pMasc5ta, pFem5ta, tourSuma10Fem);
  assert(sumaHombreEnFem.isValid === false && sumaHombreEnFem.error?.includes("Femenino") === true, "Suma 10 Femenino: Rechaza hombre");

  // f) validateCoupleFormation para Torneo SUMA
  const sumaPlayers = [pMasc3ra, pMasc4ta, pMasc5ta, pMasc6ta, pMasc7ma, pFem4ta, pFem5ta, pFem6ta];
  const formSumaValida = validateCoupleFormation("tour_suma_10_masc", "p_m4", "p_m6", [], null, tourSuma10Masc, sumaPlayers);
  assert(formSumaValida.isValid === true, "validateCoupleFormation acepta 4ta + 6ta en Suma 10");

  const formSumaInvalida = validateCoupleFormation("tour_suma_10_masc", "p_m4", "p_m5", [], null, tourSuma10Masc, sumaPlayers);
  assert(formSumaInvalida.isValid === false && formSumaInvalida.error?.includes("Suma 10") === true, "validateCoupleFormation rechaza 4ta + 5ta en Suma 10");

  // g) generateRandomCouples para Torneo SUMA
  // Probamos que el emparejamiento inteligente de 4 jugadores respeta la suma requerida
  const autoPlayersSuma: Player[] = [
    { id: "s_p1", first_name: "A", last_name: "4ta", gender: "Masculino", category: "4ta", created_at: "" },
    { id: "s_p2", first_name: "B", last_name: "4ta", gender: "Masculino", category: "4ta", created_at: "" },
    { id: "s_p3", first_name: "C", last_name: "6ta", gender: "Masculino", category: "6ta", created_at: "" },
    { id: "s_p4", first_name: "D", last_name: "6ta", gender: "Masculino", category: "6ta", created_at: "" },
  ];
  // Dos de 4ta y dos de 6ta: la única forma válida de armar parejas para Suma 10 es (4ta+6ta) y (4ta+6ta).
  // Si se unieran 4ta+4ta sumaría 8 (inválido).
  const autoCouplesSuma = generateRandomCouples(autoPlayersSuma, "tour_suma_10_masc", 1, tourSuma10Masc);
  assert(autoCouplesSuma.length === 2, "generateRandomCouples genera 2 parejas válidas para Suma 10");
  for (const c of autoCouplesSuma) {
    const check = validateCoupleCategorySuma(c.player1, c.player2, tourSuma10Masc);
    assert(check.isValid === true && check.sum >= 10, "Cada pareja generada automáticamente cumple la Suma 10");
  }

  // ==========================================================================
  // 12. CUADRO DE ELIMINACIÓN: CLIC EN GANADOR, MARCADORES Y AVANCE A PRÓXIMA INSTANCIA
  // ==========================================================================
  const bracketMatchesSim: Match[] = [
    // Cuartos de Final (4 partidos)
    { id: "m_qf_1", tournament_id: "t_elim", stage: "quarter", match_number: 101, couple1_id: "c_1A", couple2_id: "c_2D", status: "pending", created_at: "2026-10-14T10:00:00Z" },
    { id: "m_qf_2", tournament_id: "t_elim", stage: "quarter", match_number: 102, couple1_id: "c_1C", couple2_id: "c_2B", status: "pending", created_at: "2026-10-14T10:05:00Z" },
    { id: "m_qf_3", tournament_id: "t_elim", stage: "quarter", match_number: 103, couple1_id: "c_1D", couple2_id: "c_2C", status: "pending", created_at: "2026-10-14T10:10:00Z" },
    { id: "m_qf_4", tournament_id: "t_elim", stage: "quarter", match_number: 104, couple1_id: "c_1B", couple2_id: "c_2A", status: "pending", created_at: "2026-10-14T10:15:00Z" },
    // Semifinales (2 partidos con slots pendientes)
    { id: "m_sf_1", tournament_id: "t_elim", stage: "semi", match_number: 105, couple1_id: null, couple2_id: null, status: "pending", created_at: "2026-10-14T11:00:00Z" },
    { id: "m_sf_2", tournament_id: "t_elim", stage: "semi", match_number: 106, couple1_id: null, couple2_id: null, status: "pending", created_at: "2026-10-14T11:05:00Z" },
    // Gran Final (1 partido)
    { id: "m_final", tournament_id: "t_elim", stage: "final", match_number: 107, couple1_id: null, couple2_id: null, status: "pending", created_at: "2026-10-14T12:00:00Z" },
  ];

  // Simulación Paso 1: Administrador hace clic en la pareja 1A de Cuartos 1 y anota marcador "9/4"
  const qf1Slot = findNextPlayoffMatchSlot(bracketMatchesSim, bracketMatchesSim[0]);
  assert(qf1Slot !== null, "Cuartos 1 encuentra slot sucesivo en semifinales");
  assert(qf1Slot?.targetMatchId === "m_sf_1" && qf1Slot?.slotField === "couple1_id", "Ganador Cuartos 1 avanza a Semifinal 1 (couple1_id)");

  // Aplicar resultado en Cuartos 1
  bracketMatchesSim[0].winner_couple_id = "c_1A";
  bracketMatchesSim[0].score_set1 = "9/4";
  bracketMatchesSim[0].status = "completed";

  // Verificar propagación reactiva hacia Semifinal 1
  const simStep1 = propagatePlayoffWinners(bracketMatchesSim);
  const sf1AfterQf1 = simStep1.updatedMatches.find((m) => m.id === "m_sf_1");
  assert(sf1AfterQf1?.couple1_id === "c_1A", "La pareja ganadora (1A) aparece automáticamente en la próxima instancia (Semifinal 1 como pareja 1)");
  assert(sf1AfterQf1?.couple2_id === null, "La pareja 2 de Semifinal 1 sigue pendiente de rival");

  // Simulación Paso 2: Administrador hace clic en la pareja 2B de Cuartos 2 y anota marcador "9/6"
  bracketMatchesSim[1].winner_couple_id = "c_2B";
  bracketMatchesSim[1].score_set1 = "9/6";
  bracketMatchesSim[1].status = "completed";

  const simStep2 = propagatePlayoffWinners(bracketMatchesSim);
  const sf1AfterQf2 = simStep2.updatedMatches.find((m) => m.id === "m_sf_1");
  assert(sf1AfterQf2?.couple1_id === "c_1A" && sf1AfterQf2?.couple2_id === "c_2B", "Semifinal 1 ahora tiene a sus dos parejas completas: 1A vs 2B");

  // Simulación Paso 3: Completar Cuartos 3 (gana 1D) y Cuartos 4 (gana 1B)
  bracketMatchesSim[2].winner_couple_id = "c_1D";
  bracketMatchesSim[2].score_set1 = "9/5";
  bracketMatchesSim[2].status = "completed";

  bracketMatchesSim[3].winner_couple_id = "c_1B";
  bracketMatchesSim[3].score_set1 = "9/7";
  bracketMatchesSim[3].status = "completed";

  const simStep3 = propagatePlayoffWinners(bracketMatchesSim);
  const sf2AfterQf = simStep3.updatedMatches.find((m) => m.id === "m_sf_2");
  assert(sf2AfterQf?.couple1_id === "c_1D" && sf2AfterQf?.couple2_id === "c_1B", "Semifinal 2 conformada con 1D vs 1B");

  // Simulación Paso 4: Completar Semifinales hacia la Gran Final
  // Clic en 1A en Semifinal 1 -> Marcador "9/5"
  bracketMatchesSim[4].couple1_id = "c_1A";
  bracketMatchesSim[4].couple2_id = "c_2B";
  bracketMatchesSim[4].winner_couple_id = "c_1A";
  bracketMatchesSim[4].score_set1 = "9/5";
  bracketMatchesSim[4].status = "completed";

  // Clic en 1B en Semifinal 2 -> Marcador "9/8"
  bracketMatchesSim[5].couple1_id = "c_1D";
  bracketMatchesSim[5].couple2_id = "c_1B";
  bracketMatchesSim[5].winner_couple_id = "c_1B";
  bracketMatchesSim[5].score_set1 = "9/8";
  bracketMatchesSim[5].status = "completed";

  const simStep4 = propagatePlayoffWinners(bracketMatchesSim);
  const finalMatch = simStep4.updatedMatches.find((m) => m.id === "m_final");
  assert(finalMatch?.couple1_id === "c_1A" && finalMatch?.couple2_id === "c_1B", "La Gran Final tiene a las dos parejas finalistas que avanzaron: 1A vs 1B");

  // Simulación Paso 5: Clic en pareja 1A en la Gran Final -> Marcador "9/6" -> ¡Campeones!
  bracketMatchesSim[6].couple1_id = "c_1A";
  bracketMatchesSim[6].couple2_id = "c_1B";
  bracketMatchesSim[6].winner_couple_id = "c_1A";
  bracketMatchesSim[6].score_set1 = "9/6";
  bracketMatchesSim[6].status = "completed";

  assert(bracketMatchesSim[6].winner_couple_id === "c_1A", "Pareja ganadora de la Final (1A) identificada para pintar de verde");
  assert(bracketMatchesSim[6].couple2_id === "c_1B" && bracketMatchesSim[6].winner_couple_id !== "c_1B", "Pareja perdedora de la Final (1B) identificada para pintar de rojo");

  // =========================================================================
  // SUITE 10: Llaves Clasificatorias Proyectadas e Interacción de Cuadro
  // =========================================================================
  log.push("--- SUITE 10: Llaves Clasificatorias Proyectadas e Interacción de Cuadro ---");

  // Test 10.1: getNextStage para 16avos de final
  assert(getNextStage("round_of_32") === "round_of_16", "getNextStage('round_of_32') avanza a 'round_of_16'");
  assert(getNextStage("dieciseisavos") === "round_of_16", "getNextStage('dieciseisavos') normalizado avanza a 'round_of_16'");

  // Test 10.2: findNextPlayoffMatchSlot desde round_of_32 a round_of_16
  const r32MatchesTest = [
    { id: "m_r32_0", stage: "round_of_32", match_number: 1 },
    { id: "m_r32_1", stage: "round_of_32", match_number: 2 },
  ];
  const r16MatchesTest = [
    { id: "m_r16_0", stage: "round_of_16", match_number: 3 },
  ];
  const allR32AndR16 = [...r32MatchesTest, ...r16MatchesTest];
  const slotFromR32Match0 = findNextPlayoffMatchSlot(allR32AndR16, r32MatchesTest[0]);
  const slotFromR32Match1 = findNextPlayoffMatchSlot(allR32AndR16, r32MatchesTest[1]);
  assert(slotFromR32Match0?.targetMatchId === "m_r16_0" && slotFromR32Match0.slotField === "couple1_id", "Ganador de r32_0 avanza a r16_0 como couple1_id");
  assert(slotFromR32Match1?.targetMatchId === "m_r16_0" && slotFromR32Match1.slotField === "couple2_id", "Ganador de r32_1 avanza a r16_0 como couple2_id");

  // Test 10.3: Bracket proyectado en memoria (sin IDs en BD) genera identificadores válidos y es interactivo
  const qualifiedMock: QualifiedPair[] = [
    { pairId: "c_A1", zoneName: "Zona A", zonePosition: 1, points: 6, gameDifference: 12 },
    { pairId: "c_B2", zoneName: "Zona B", zonePosition: 2, points: 4, gameDifference: 4 },
    { pairId: "c_B1", zoneName: "Zona B", zonePosition: 1, points: 6, gameDifference: 10 },
    { pairId: "c_A2", zoneName: "Zona A", zonePosition: 2, points: 4, gameDifference: 2 },
  ];
  const projectedBracket = generateSeededPlayoffBracket(qualifiedMock);
  assert(projectedBracket.firstRoundMatches.length === 2, "Cuadro proyectado de 4 clasificados tiene 2 semifinales");
  
  // Simular la construcción de matches proyectados con sus IDs
  const initialStage = projectedBracket.allStages[0];
  const projectedRounds = [
    {
      round: initialStage,
      matches: projectedBracket.firstRoundMatches.map((m, idx) => ({
        id: `proj_${initialStage}_${idx}_${m.couple1Id}_${m.couple2Id}`,
        pair1: m.couple1Id,
        pair2: m.couple2Id,
        winner: m.isBye ? m.advancingPairId : undefined,
        score: m.isBye ? "BYE" : undefined,
        status: m.isBye ? "completed" : "pending",
      })),
    },
  ];

  // Comprobar que los partidos proyectados no son "Por definir" ni "BYE" y tienen IDs válidos
  const semi0 = projectedRounds[0].matches[0];
  const semi1 = projectedRounds[0].matches[1];
  assert(semi0.id.startsWith("proj_semi_0"), "Match 0 proyectado tiene ID sintético válido");
  assert(semi1.id.startsWith("proj_semi_1"), "Match 1 proyectado tiene ID sintético válido");
  assert(semi0.pair1 === "c_A1" && semi0.pair2 === "c_B2", "Semis 0 cruza 1° de Zona A vs 2° de Zona B");
  assert(
    (semi1.pair1 === "c_A2" && semi1.pair2 === "c_B1") || (semi1.pair1 === "c_B1" && semi1.pair2 === "c_A2"),
    "Semis 1 cruza 2° de Zona A vs 1° de Zona B según FAP"
  );

  // Verificar la lógica de clickeabilidad:
  const canInteract = true;
  const isSemi0P1Clickable = Boolean(
    canInteract &&
    semi0.pair1 !== "Por definir" &&
    semi0.pair2 !== "Por definir" &&
    semi0.pair1 !== "BYE" &&
    semi0.pair2 !== "BYE"
  );
  const isSemi0P2Clickable = Boolean(
    canInteract &&
    semi0.pair1 !== "Por definir" &&
    semi0.pair2 !== "Por definir" &&
    semi0.pair1 !== "BYE" &&
    semi0.pair2 !== "BYE"
  );
  assert(isSemi0P1Clickable === true, "Pareja 1 en llave clasificatoria proyectada es 100% clickeable");
  assert(isSemi0P2Clickable === true, "Pareja 2 en llave clasificatoria proyectada es 100% clickeable");

  // Simular clic en c_A1 como ganador:
  const clickedWinningPairId = semi0.pair1;
  const isP1Winner = clickedWinningPairId === semi0.pair1;
  const isP2Loser = clickedWinningPairId !== semi0.pair2 && semi0.pair2 !== "BYE";
  assert(isP1Winner === true, "Pareja ganadora c_A1 se identifica para pintar de verde");
  assert(isP2Loser === true, "Pareja perdedora c_B2 se identifica para pintar de rojo");

  // TEST 13: Visualización de Zonas en Programación de Partidos (resolveMatchZone y formatZoneDisplayName)
  const dummyZones = [
    { id: "z1", tournament_id: "t1", name: "Zona A", zone_number: 1, created_at: "" },
    { id: "z2", tournament_id: "t1", name: "B", zone_number: 2, created_at: "" },
    { id: "z3", tournament_id: "t1", name: "", zone_number: 3, created_at: "" },
  ];

  assert(formatZoneDisplayName("Zona A", 1) === "Zona A", "formatZoneDisplayName respeta Zona A");
  assert(formatZoneDisplayName("B", 2) === "Zona B", "formatZoneDisplayName antepone Zona a B");
  assert(formatZoneDisplayName("", 3) === "Zona 3", "formatZoneDisplayName usa número si name vacío");
  assert(formatZoneDisplayName(null, 4) === "Zona 4", "formatZoneDisplayName usa número si name null");

  const matchWithDirectZone = {
    stage: "zone",
    zone_id: "z1",
    couple1_id: "c1",
    couple2_id: "c2",
  };
  assert(getMatchZoneDisplayName(matchWithDirectZone, dummyZones) === "Zona A", "Resuelve Zona A por zone_id directo");

  const matchWithoutDirectZone = {
    stage: "zone",
    zone_id: null,
    couple1_id: "c_b1",
    couple2_id: "c_b2",
  };
  const dummyCouples = [
    { id: "c_b1", tournament_id: "t1", player1_id: "p1", player2_id: "p2", created_at: "", zone_id: "z2" },
  ];
  assert(getMatchZoneDisplayName(matchWithoutDirectZone, dummyZones, dummyCouples) === "Zona B", "Resuelve Zona B por couple1.zone_id");

  const matchViaMap = {
    stage: "zone",
    zone_id: null,
    couple1_id: "c_c1",
    couple2_id: "c_c2",
  };
  const dummyZoneCouplesMap = { z3: ["c_c1", "c_c2"] };
  assert(getMatchZoneDisplayName(matchViaMap, dummyZones, [], dummyZoneCouplesMap) === "Zona 3", "Resuelve Zona 3 por zoneCouplesMap");

  const playoffMatch = {
    stage: "quarter",
    zone_id: "z1",
    couple1_id: "c1",
    couple2_id: "c2",
  };
  assert(getMatchZoneDisplayName(playoffMatch, dummyZones) === null, "Partidos de playoffs no retornan zona");

  // TEST 14: Regla SPT Zona de 4 Parejas (Orden: P1 vs P4, P2 vs P3, Ganador vs Ganador, Perdedor vs Perdedor)
  const zone4Couples = ["c_p1", "c_p2", "c_p3", "c_p4"];
  const generated4 = generateZoneMatches(zone4Couples);

  assert(generated4.length === 4, "Zona de 4 parejas genera exactamente 4 partidos");
  assert(
    generated4[0].couple1Id === "c_p1" && generated4[0].couple2Id === "c_p4",
    "Partido 1 de zona de 4 es Pareja 1 vs Pareja 4"
  );
  assert(
    generated4[1].couple1Id === "c_p2" && generated4[1].couple2Id === "c_p3",
    "Partido 2 de zona de 4 es Pareja 2 vs Pareja 3"
  );
  assert(
    generated4[2].couple1Id === null && generated4[2].couple2Id === null,
    "Partido 3 (Ganador vs Ganador) inicia sin parejas asignadas"
  );
  assert(
    generated4[3].couple1Id === null && generated4[3].couple2Id === null,
    "Partido 4 (Perdedor vs Perdedor) inicia sin parejas asignadas"
  );

  // Verificación de badges e info contextual para zona de 4
  const mock4Matches: Match[] = [
    { id: "m1", tournament_id: "t1", stage: "zone", zone_id: "z4", match_number: 1, couple1_id: "c_p1", couple2_id: "c_p4", status: "scheduled", created_at: "" },
    { id: "m2", tournament_id: "t1", stage: "zone", zone_id: "z4", match_number: 2, couple1_id: "c_p2", couple2_id: "c_p3", status: "scheduled", created_at: "" },
    { id: "m3", tournament_id: "t1", stage: "zone", zone_id: "z4", match_number: 3, couple1_id: null, couple2_id: null, status: "scheduled", created_at: "" },
    { id: "m4", tournament_id: "t1", stage: "zone", zone_id: "z4", match_number: 4, couple1_id: null, couple2_id: null, status: "scheduled", created_at: "" },
  ];

  const m1Info = getZone4MatchInfo(mock4Matches[0], mock4Matches);
  const m2Info = getZone4MatchInfo(mock4Matches[1], mock4Matches);
  const m3Info = getZone4MatchInfo(mock4Matches[2], mock4Matches);
  const m4Info = getZone4MatchInfo(mock4Matches[3], mock4Matches);

  assert(m1Info.roundBadge === "Ronda 1 (P1 vs P4)", "m1Info badge correcto");
  assert(m2Info.roundBadge === "Ronda 1 (P2 vs P3)", "m2Info badge correcto");
  assert(m3Info.roundBadge === "Ganador vs Ganador", "m3Info badge correcto (G vs G)");
  assert(m4Info.roundBadge === "Perdedor vs Perdedor", "m4Info badge correcto (P vs P)");
  assert(m3Info.couple1Placeholder === "Ganador P1 vs P4", "m3Info placeholder c1 correcto");
  assert(m3Info.couple2Placeholder === "Ganador P2 vs P3", "m3Info placeholder c2 correcto");
  assert(m4Info.couple1Placeholder === "Perdedor P1 vs P4", "m4Info placeholder c1 correcto");
  assert(m4Info.couple2Placeholder === "Perdedor P2 vs P3", "m4Info placeholder c2 correcto");

  // Propagación reactiva al completarse partidos 1 y 2
  // Partido 1: c_p1 vence a c_p4
  mock4Matches[0].status = "completed";
  mock4Matches[0].winner_couple_id = "c_p1";
  mock4Matches[0].score_set1 = "9-4";

  // Partido 2: c_p2 vence a c_p3
  mock4Matches[1].status = "completed";
  mock4Matches[1].winner_couple_id = "c_p2";
  mock4Matches[1].score_set1 = "9-6";

  const { updatedMatches: propagated } = propagateZoneMatches(mock4Matches);
  const propagatedM3 = propagated.find((m) => m.id === "m3");
  const propagatedM4 = propagated.find((m) => m.id === "m4");

  assert(
    propagatedM3?.couple1_id === "c_p1" && propagatedM3?.couple2_id === "c_p2",
    "Propagación Partido 3: Ganador M1 (c_p1) vs Ganador M2 (c_p2)"
  );
  assert(
    propagatedM4?.couple1_id === "c_p4" && propagatedM4?.couple2_id === "c_p3",
    "Propagación Partido 4: Perdedor M1 (c_p4) vs Perdedor M2 (c_p3)"
  );

  // Completar partidos 3 y 4 y validar cálculo de tabla de posiciones
  // Partido 3 (Ganador vs Ganador): c_p1 vence a c_p2 -> c_p1 es 1°, c_p2 es 2°
  propagatedM3!.status = "completed";
  propagatedM3!.winner_couple_id = "c_p1";
  propagatedM3!.score_set1 = "9-7";

  // Partido 4 (Perdedor vs Perdedor): c_p3 vence a c_p4 -> c_p3 es 3°, c_p4 es 4°
  propagatedM4!.status = "completed";
  propagatedM4!.winner_couple_id = "c_p3";
  propagatedM4!.score_set1 = "9-5";

  const standingsZone4GSL = calculateRoundRobinStandings(propagated, zone4Couples);

  assert(standingsZone4GSL[0].pair_id === "c_p1", "1° Lugar: c_p1 (ganó M1 y ganó M3 - Ganador de Zona)");
  assert(standingsZone4GSL[1].pair_id === "c_p2", "2° Lugar: c_p2 (ganó M2 y perdió M3 - Clasificado como 2°)");
  assert(standingsZone4GSL[2].pair_id === "c_p3", "3° Lugar: c_p3 (perdió M2 y ganó M4 - 3° puesto)");
  assert(standingsZone4GSL[3].pair_id === "c_p4", "4° Lugar: c_p4 (perdió M1 y perdió M4 - 4° puesto eliminado)");

  const qualifiedGSL = getQualifiedPairs(standingsZone4GSL);
  const eliminatedGSL = getEliminatedPair(standingsZone4GSL);
  assert(qualifiedGSL.length === 3, "Clasifican 3 parejas en zona de 4");
  assert(qualifiedGSL[0].pair_id === "c_p1" && qualifiedGSL[1].pair_id === "c_p2", "Top 2 clasificados son c_p1 y c_p2");
  assert(eliminatedGSL?.pair_id === "c_p4", "La 4ta pareja (c_p4) queda estrictamente eliminada");

  // =========================================================================
  // PRUEBAS DE COMBINACIÓN PERSONALIZADA DE ZONAS (buildCustomZonesConfig)
  // Ejemplo usuario: 2 zonas de 4 parejas y 6 zonas de 3 parejas
  // =========================================================================
  const customConfig1 = buildCustomZonesConfig(
    { numZones: 2, zoneSize: 4 },
    { numZones: 6, zoneSize: 3 }
  );

  assert(customConfig1.totalZones === 8, "2 zonas de 4 + 6 zonas de 3 genera exactamente 8 zonas en total");
  assert(customConfig1.totalCapacity === 26, "2*4 (8) + 6*3 (18) = 26 parejas de capacidad total");
  assert(customConfig1.zones.length === 8, "El array de zonas contiene 8 elementos");
  assert(customConfig1.zones[0].name === "Zona A" && customConfig1.zones[0].size === 4, "Zona A tiene cupo de 4 parejas");
  assert(customConfig1.zones[1].name === "Zona B" && customConfig1.zones[1].size === 4, "Zona B tiene cupo de 4 parejas");
  assert(customConfig1.zones[2].name === "Zona C" && customConfig1.zones[2].size === 3, "Zona C tiene cupo de 3 parejas");
  assert(customConfig1.zones[7].name === "Zona H" && customConfig1.zones[7].size === 3, "Zona H tiene cupo de 3 parejas");
  assert(customConfig1.summary === "2 zonas de 4 parejas y 6 zonas de 3 parejas", "Resumen de la combinación es claro");

  // Caso: 4 zonas de 3 parejas (sin grupo 2)
  const customConfig2 = buildCustomZonesConfig(
    { numZones: 4, zoneSize: 3 }
  );
  assert(customConfig2.totalZones === 4, "4 zonas de 3 genera 4 zonas");
  assert(customConfig2.totalCapacity === 12, "4*3 = 12 parejas de capacidad");
  assert(customConfig2.zones[3].name === "Zona D", "Última zona es Zona D");

  // Caso: 3 zonas de 4 parejas
  const customConfig3 = buildCustomZonesConfig(
    { numZones: 3, zoneSize: 4 },
    { numZones: 0, zoneSize: 3 }
  );
  assert(customConfig3.totalZones === 3, "3 zonas de 4 genera 3 zonas");
  assert(customConfig3.totalCapacity === 12, "3*4 = 12 parejas de capacidad");

  return {
    passed,
    failed,
    total: passed + failed,
    log,
    failures,
  };
}
