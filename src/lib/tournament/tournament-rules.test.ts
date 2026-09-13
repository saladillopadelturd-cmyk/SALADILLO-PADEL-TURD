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
  type QualifiedPair,
} from "./elimination";

import {
  SPT_POINTS_SCALE,
  getCoupleKey,
  calculateTournamentStageStats,
  processDoubleRankingUpdate,
  type CoupleRankingRecord,
  type IndividualRankingRecord,
} from "./rankings";

import type { Match } from "@/types/tournament";

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
  assert(bracket8.firstRoundMatches[3].advancingPairId === "1B", "Seed 2 (1B) avanza por BYE en mitad inferior");

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
  // Escala de puntos oficial SPT
  assert(SPT_POINTS_SCALE.champion === 100, "Campeón = 100 pts");
  assert(SPT_POINTS_SCALE.runner_up === 70, "Subcampeón = 70 pts");
  assert(SPT_POINTS_SCALE.semifinalist === 50, "Semifinalista = 50 pts");
  assert(SPT_POINTS_SCALE.quarterfinalist === 30, "Cuartofinalista = 30 pts");
  assert(SPT_POINTS_SCALE.round_of_16 === 15, "Octavofinalista = 15 pts");
  assert(SPT_POINTS_SCALE.group_stage === 10, "Fase de grupos = 10 pts");

  // Clave canónica de parejas
  assert(getCoupleKey("p1", "p2") === "p1_p2", "getCoupleKey('p1', 'p2') es 'p1_p2'");
  assert(getCoupleKey("p2", "p1") === "p1_p2", "getCoupleKey('p2', 'p1') es simétrico e invariante al orden");

  // Simulación de 2 torneos sucesivos con diferentes parejas:
  // Torneo 1:
  // Pareja C1: Jugador A (jA) + Jugador B (jB) -> CAMPEONES (100 pts)
  // Pareja C2: Jugador C (jC) + Jugador D (jD) -> SUBCAMPEONES (70 pts)
  // Pareja C3: Jugador E (jE) + Jugador F (jF) -> SEMIS (50 pts)
  const tournament1Couples = [
    { id: "c1", player1_id: "jA", player2_id: "jB" },
    { id: "c2", player1_id: "jC", player2_id: "jD" },
    { id: "c3", player1_id: "jE", player2_id: "jF" },
  ];
  const tournament1Matches: Match[] = [
    { id: "m_semi", tournament_id: "t1", stage: "semi", couple1_id: "c1", couple2_id: "c3", winner_couple_id: "c1", score_set1: "9-4", status: "completed", created_at: "" },
    { id: "m_final", tournament_id: "t1", stage: "final", couple1_id: "c1", couple2_id: "c2", winner_couple_id: "c1", score_set1: "9-5", status: "completed", created_at: "" },
  ];

  const t1Stats = calculateTournamentStageStats(tournament1Matches, tournament1Couples);
  assert(t1Stats["c1"].pointsEarned === 100, "C1 campeón obtiene 100 pts");
  assert(t1Stats["c2"].pointsEarned === 70, "C2 subcampeón obtiene 70 pts");
  assert(t1Stats["c3"].pointsEarned === 50, "C3 semifinalista obtiene 50 pts");

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

  // Verificar estado post Torneo 1
  const c1Key = getCoupleKey("jA", "jB");
  assert(coupleRankings.get(c1Key)?.points === 100, "Ranking Pareja [jA-jB] = 100 pts");
  assert(indivRankings.get("jA")?.points === 100, "Ranking Individual jA = 100 pts");
  assert(indivRankings.get("jB")?.points === 100, "Ranking Individual jB = 100 pts");

  // Torneo 2:
  // jA juega ahora con jC (nueva dupla) y quedan SUBCAMPEONES (70 pts).
  // jB juega con jE (nueva dupla) y caen en SEMIS (50 pts).
  // jD juega con jF y ganan el torneo (100 pts).
  const tournament2Couples = [
    { id: "c_AC", player1_id: "jA", player2_id: "jC" },
    { id: "c_BE", player1_id: "jB", player2_id: "jE" },
    { id: "c_DF", player1_id: "jD", player2_id: "jF" },
  ];
  const tournament2Matches: Match[] = [
    { id: "m2_semi", tournament_id: "t2", stage: "semi", couple1_id: "c_AC", couple2_id: "c_BE", winner_couple_id: "c_AC", score_set1: "9-6", status: "completed", created_at: "" },
    { id: "m2_final", tournament_id: "t2", stage: "final", couple1_id: "c_DF", couple2_id: "c_AC", winner_couple_id: "c_DF", score_set1: "9-7", status: "completed", created_at: "" },
  ];

  const t2Stats = calculateTournamentStageStats(tournament2Matches, tournament2Couples);
  const update2 = processDoubleRankingUpdate({
    existingCoupleRankings: coupleRankings,
    existingIndividualRankings: indivRankings,
    tournamentStats: t2Stats,
    category: "5ta",
  });
  coupleRankings = update2.updatedCoupleRankings;
  indivRankings = update2.updatedIndividualRankings;

  // Verificaciones del Sistema de Doble Ranking SPT:
  // 1. Ranking de la Pareja original [jA-jB]:
  // NO jugó en Torneo 2 -> Sus puntos se mantienen intactos en 100 pts
  assert(coupleRankings.get(c1Key)?.points === 100, "Ranking Pareja [jA-jB] se conserva intacto en 100 pts al no competir junta");
  assert(coupleRankings.get(c1Key)?.tournamentsPlayed === 1, "Ranking Pareja [jA-jB] registra 1 torneo jugado");

  // 2. Ranking de la nueva pareja [jA-jC]:
  const keyAC = getCoupleKey("jA", "jC");
  assert(coupleRankings.get(keyAC)?.points === 70, "Ranking nueva Pareja [jA-jC] = 70 pts");

  // 3. Ranking Individual de jA:
  // Ganó 100 pts en T1 con jB + 70 pts en T2 con jC = 170 pts en total
  assert(indivRankings.get("jA")?.points === 170, "Ranking Individual jA acumuló 170 pts (100 + 70)");
  assert(indivRankings.get("jA")?.tournamentsPlayed === 2, "Ranking Individual jA registra 2 torneos jugados");

  // 4. Ranking Individual de jB:
  // Ganó 100 pts en T1 con jA + 50 pts en T2 con jE = 150 pts en total
  assert(indivRankings.get("jB")?.points === 150, "Ranking Individual jB acumuló 150 pts (100 + 50)");
  assert(indivRankings.get("jB")?.tournamentsPlayed === 2, "Ranking Individual jB registra 2 torneos jugados");

  // 5. Ranking Individual de jC:
  // Ganó 70 pts en T1 con jD + 70 pts en T2 con jA = 140 pts
  assert(indivRankings.get("jC")?.points === 140, "Ranking Individual jC acumuló 140 pts (70 + 70)");

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

  return {
    passed,
    failed,
    total: passed + failed,
    log,
    failures,
  };
}
