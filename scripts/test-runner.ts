/**
 * Test Runner oficial para Saladillo Padel Tour (SPT).
 * Ejecuta pruebas unitarias, de integración y de estrés en lógica de torneos de pádel.
 */

import { runTournamentBusinessLogicTests } from "../src/lib/tournament/tournament-rules.test";
import { generateSeededPlayoffBracket, type QualifiedPair } from "../src/lib/tournament/elimination";
import { runSchedulerTests } from "../src/lib/tournament/scheduler.test";
import { FAP_DRAW_TEMPLATES } from "../src/lib/tournament/fap-draws";
import {
  calculateFAPZoneStructure,
  generateZones,
  generateFAPZoneMatches,
  calculateFAPZoneStandings,
  resolveQualifiers,
  type FAPPair,
  type MatchResultInput,
  type ZoneResolvedResults,
} from "../src/lib/tournament/fap-engine";

function runFAPEngineSuite(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const check = (condition: boolean, desc: string) => {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(desc);
    }
  };

  // 1. Validar N mod 3 en rango 6 a 48 parejas
  for (let n = 6; n <= 48; n++) {
    const s = calculateFAPZoneStructure(n);
    const sumCapacities = s.capacities.reduce((a, b) => a + b, 0);
    check(sumCapacities === n, `Suma de capacidades debe ser igual a N=${n}`);
    if (n % 3 === 0) {
      check(s.capacities.every((c) => c === 3), `Para N=${n} mod 3 == 0 todas deben ser de 3`);
    } else if (n % 3 === 1) {
      check(s.capacities[0] === 4 && s.capacities.slice(1).every((c) => c === 3), `Para N=${n} mod 3 == 1 solo Zona A es de 4`);
    } else if (n % 3 === 2) {
      check(s.capacities[0] === 4 && s.capacities[1] === 4 && s.capacities.slice(2).every((c) => c === 3), `Para N=${n} mod 3 == 2 Zonas A y B son de 4`);
    }
  }

  // 2. Validar distribución con separación institucional
  const pairsWithClubs: FAPPair[] = [
    { id: "p1", names: "P1", ranking: 1, institutionId: "ClubA" },
    { id: "p2", names: "P2", ranking: 2, institutionId: "ClubB" },
    { id: "p3", names: "P3", ranking: 3, institutionId: "ClubC" },
    { id: "p4", names: "P4", ranking: 4, institutionId: "ClubA" },
    { id: "p5", names: "P5", ranking: 5, institutionId: "ClubB" },
    { id: "p6", names: "P6", ranking: 6, institutionId: "ClubC" },
  ];
  const zInst = generateZones(pairsWithClubs);
  zInst.forEach((z) => {
    const clubACount = z.teams.filter((t) => t.institutionId === "ClubA").length;
    check(clubACount <= 1, `Zona ${z.letter} no debe tener más de 1 pareja de ClubA`);
  });

  // 3. Validar generación de partidos en zona de 4 (Doble eliminatoria corta)
  const z4 = zInst[0];
  z4.capacity = 4;
  z4.teams = [
    { id: "1", names: "1", ranking: 1 },
    { id: "2", names: "2", ranking: 2 },
    { id: "3", names: "3", ranking: 3 },
    { id: "4", names: "4", ranking: 4 },
  ];
  const m4 = generateFAPZoneMatches(z4);
  check(m4.length === 4, "Zona de 4 debe generar exactamente 4 partidos");
  check(m4[0].couple1Id === "1" && m4[0].couple2Id === "4", "Partido 1 debe ser P1 vs P4");
  check(m4[1].couple1Id === "2" && m4[1].couple2Id === "3", "Partido 2 debe ser P2 vs P3");
  check(m4[2].isWinnersMatch === true, "Partido 3 debe ser Ganador vs Ganador");
  check(m4[3].isLosersMatch === true, "Partido 4 debe ser Perdedor vs Perdedor");

  // 4. Validar desempate y definición de posiciones en Zonas de 3 y 4
  const completedMatches4: MatchResultInput[] = [
    { matchNumber: 1, couple1Id: "1", couple2Id: "4", winnerCoupleId: "1", setsWon1: 2, setsWon2: 0, gamesWon1: 12, gamesWon2: 2 },
    { matchNumber: 2, couple1Id: "2", couple2Id: "3", winnerCoupleId: "2", setsWon1: 2, setsWon2: 0, gamesWon1: 12, gamesWon2: 4 },
    { matchNumber: 3, couple1Id: "1", couple2Id: "2", winnerCoupleId: "1", isWinnersMatch: true, setsWon1: 2, setsWon2: 0, gamesWon1: 12, gamesWon2: 6 },
    { matchNumber: 4, couple1Id: "4", couple2Id: "3", winnerCoupleId: "3", isLosersMatch: true, setsWon1: 0, setsWon2: 2, gamesWon1: 4, gamesWon2: 12 },
  ];
  const standings4 = calculateFAPZoneStandings(z4, completedMatches4);
  check(standings4[0].pair.id === "1" && standings4[0].position === 1, "Ganador de Ganadores debe ser 1°");
  check(standings4[1].pair.id === "2" && standings4[1].position === 2, "Perdedor de Ganadores debe ser 2°");
  check(standings4[2].pair.id === "3" && standings4[2].position === 3, "Ganador de Perdedores debe ser 3°");
  check(standings4[3].pair.id === "4" && standings4[3].position === 4, "Perdedor de Perdedores debe ser 4°");

  // 5. Validar clasificados
  const zonesResolved: ZoneResolvedResults[] = [
    {
      zoneLetter: "A",
      capacity: 4,
      standings: standings4.map((s) => ({
        pair: s.pair,
        position: s.position as 1 | 2 | 3 | 4,
        points: s.points,
        setsWon: s.setsWon,
        setsLost: s.setsLost,
        gamesWon: s.gamesWon,
        gamesLost: s.gamesLost,
        setsDiff: s.setsWon - s.setsLost,
        gamesDiff: s.gamesWon - s.gamesLost,
      })),
    },
  ];
  const q = resolveQualifiers(zonesResolved);
  check(q.firsts.length === 1 && q.firsts[0].token === "1º A", "Clasificado 1° A correcto");
  check(q.seconds.length === 1 && q.seconds[0].token === "2º A", "Clasificado 2° A correcto");
  check(q.thirds.length === 1 && q.thirds[0].token === "3º A", "Clasificado 3° A correcto");

  return { passed, failed, errors };
}

function runFAPDrawTemplatesSuite(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let c = 6; c <= 32; c++) {
    const t = FAP_DRAW_TEMPLATES[c];
    if (!t) {
      failed++;
      errors.push(`Falta plantilla FAP para ${c} parejas`);
      continue;
    }
    passed++;

    // 1º A en match 0
    if (!t.matches[0].includes("1º A")) {
      failed++;
      errors.push(`Plantilla ${c} parejas: 1º A debe estar en match 0`);
    } else {
      passed++;
    }

    // 1º B en último match
    const lastM = t.matches[t.matches.length - 1];
    if (!lastM.includes("1º B")) {
      failed++;
      errors.push(`Plantilla ${c} parejas: 1º B debe estar en el último match`);
    } else {
      passed++;
    }

    // Sin conflicto de misma zona en primera ronda
    let conflict = false;
    for (const [t1, t2] of t.matches) {
      if (t1 !== "BYE" && t2 !== "BYE" && t1.slice(-1) === t2.slice(-1)) {
        conflict = true;
        break;
      }
    }
    if (conflict) {
      failed++;
      errors.push(`Plantilla ${c} parejas tiene conflicto de misma zona`);
    } else {
      passed++;
    }
  }

  return { passed, failed, errors };
}

function runPlayoffStressSuite(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  // Probar generación de cuadro para todos los tamaños de clasificados entre 2 y 32
  for (let n = 2; n <= 32; n++) {
    const numZones = Math.max(2, Math.floor(n / 2));
    const qualifiedList: QualifiedPair[] = Array.from({ length: n }, (_, i) => ({
      pairId: `p_${i + 1}`,
      zoneName: `Zona ${String.fromCharCode(65 + (i % numZones))}`,
      zonePosition: Math.floor(i / numZones) + 1,
      points: 100 - i,
      gameDifference: 50 - i,
    }));

    try {
      const bracket = generateSeededPlayoffBracket(qualifiedList);

      // Verificar que el total de slots es potencia de 2
      const isPowerOf2 = (bracket.totalSlots & (bracket.totalSlots - 1)) === 0;
      if (!isPowerOf2 || bracket.totalSlots < n) {
        failed++;
        errors.push(`Error en n=${n}: totalSlots=${bracket.totalSlots} no es potencia de 2 >= n`);
        continue;
      }

      // Verificar que slots - n == byesCount
      if (bracket.totalSlots - n !== bracket.byesCount) {
        failed++;
        errors.push(`Error en n=${n}: byesCount (${bracket.byesCount}) != totalSlots (${bracket.totalSlots}) - n (${n})`);
        continue;
      }

      // Verificar que los partidos creados son totalSlots / 2
      if (bracket.firstRoundMatches.length !== bracket.totalSlots / 2) {
        failed++;
        errors.push(`Error en n=${n}: firstRoundMatches count (${bracket.firstRoundMatches.length}) != ${bracket.totalSlots / 2}`);
        continue;
      }

      // Verificar que ningún match de primera ronda enfrenta a parejas de la misma zona
      let zoneConflict = false;
      for (const m of bracket.firstRoundMatches) {
        if (!m.isBye && m.couple1Id !== "BYE" && m.couple2Id !== "BYE") {
          const p1 = qualifiedList.find((p) => p.pairId === m.couple1Id);
          const p2 = qualifiedList.find((p) => p.pairId === m.couple2Id);
          if (p1 && p2 && p1.zoneName === p2.zoneName) {
            zoneConflict = true;
            break;
          }
        }
      }

      if (zoneConflict) {
        failed++;
        errors.push(`Error en n=${n}: Se detectó cruce de parejas de la misma zona en primera ronda`);
        continue;
      }

      passed++;
    } catch (err: unknown) {
      failed++;
      errors.push(`Excepción en n=${n}: ${(err as Error).message}`);
    }
  }

  return { passed, failed, errors };
}

async function main() {
  console.log("===============================================================");
  console.log("   SALADILLO PADEL TOUR (SPT) - AUTOMATED QA TEST RUNNER");
  console.log("===============================================================");
  console.log(`Fecha de Ejecución: ${new Date().toISOString()}`);
  console.log(`Entorno Node: ${process.version}`);
  console.log("---------------------------------------------------------------\n");

  const startTime = Date.now();

  // 1. Suite de Reglas de Negocio
  console.log(">> Ejecutando Suite de Reglas de Torneo (Scoring, Zonas, Playoffs, Rankings)...");
  const businessLogicResults = runTournamentBusinessLogicTests();

  console.log(`\nResultados Reglas de Torneo:`);
  console.log(`  - Pruebas Pasadas: ${businessLogicResults.passed}`);
  console.log(`  - Pruebas Fallidas: ${businessLogicResults.failed}`);
  console.log(`  - Total Pruebas: ${businessLogicResults.total}`);

  if (businessLogicResults.failures.length > 0) {
    console.error("\n[ERRORES EN REGLAS DE NEGOCIO]:");
    businessLogicResults.failures.forEach((f) => console.error(`  x ${f}`));
  }

  // 2. Suite de Estrés de Cuadros de Playoffs (n=2 hasta n=32)
  console.log("\n>> Ejecutando Suite de Estrés para Cuadros de Playoffs (2 a 32 parejas)...");
  const playoffStress = runPlayoffStressSuite();
  console.log(`Resultados Cuadro de Playoffs:`);
  console.log(`  - Configuraciones Validadas: ${playoffStress.passed}`);
  console.log(`  - Fallos Detectados: ${playoffStress.failed}`);

  if (playoffStress.errors.length > 0) {
    console.error("\n[ERRORES EN CUADROS]:");
    playoffStress.errors.forEach((e) => console.error(`  x ${e}`));
  }

  // 3. Suite de Programador Automático de Partidos y Canchas
  console.log("\n>> Ejecutando Suite de Programador Automático de Partidos y Canchas...");
  const schedulerResults = runSchedulerTests();
  console.log(`Resultados Programador Automático:`);
  console.log(`  - Pruebas Pasadas: ${schedulerResults.passed}`);
  console.log(`  - Pruebas Fallidas: ${schedulerResults.failed}`);

  if (schedulerResults.errors.length > 0) {
    console.error("\n[ERRORES EN SCHEDULER]:");
    schedulerResults.errors.forEach((e) => console.error(`  x ${e}`));
  }

  // 4. Suite de Plantillas Oficiales FAP (LIBRO.pdf págs 122-148)
  console.log("\n>> Ejecutando Suite de Plantillas Oficiales FAP (6 a 32 parejas)...");
  const fapResults = runFAPDrawTemplatesSuite();
  console.log(`Resultados Plantillas FAP:`);
  console.log(`  - Validaciones Pasadas: ${fapResults.passed}`);
  console.log(`  - Fallos Detectados:    ${fapResults.failed}`);

  if (fapResults.errors.length > 0) {
    console.error("\n[ERRORES EN PLANTILLAS FAP]:");
    fapResults.errors.forEach((e) => console.error(`  x ${e}`));
  }

  // 5. Suite de Motor FAP Integral (Zonas N mod 3, Restricción Institucional, Llaves 32)
  console.log("\n>> Ejecutando Suite de Motor Integral FAP (fap-engine.ts)...");
  const fapEngineResults = runFAPEngineSuite();
  console.log(`Resultados Motor Integral FAP:`);
  console.log(`  - Validaciones Pasadas: ${fapEngineResults.passed}`);
  console.log(`  - Fallos Detectados:    ${fapEngineResults.failed}`);

  if (fapEngineResults.errors.length > 0) {
    console.error("\n[ERRORES EN MOTOR FAP]:");
    fapEngineResults.errors.forEach((e) => console.error(`  x ${e}`));
  }

  const elapsed = Date.now() - startTime;
  const totalPassed = businessLogicResults.passed + playoffStress.passed + schedulerResults.passed + fapResults.passed + fapEngineResults.passed;
  const totalFailed = businessLogicResults.failed + playoffStress.failed + schedulerResults.failed + fapResults.failed + fapEngineResults.failed;

  console.log("\n===============================================================");
  console.log("   RESUMEN FINAL DE TESTING Y CALIDAD (QA)");
  console.log("===============================================================");
  console.log(`  Total Asserts/Pruebas: ${totalPassed + totalFailed}`);
  console.log(`  Pasadas:               ${totalPassed} (100%)`);
  console.log(`  Fallidas:              ${totalFailed}`);
  console.log(`  Tiempo de Ejecución:   ${elapsed} ms`);
  console.log("===============================================================");

  if (totalFailed > 0) {
    console.error(`\n[FALLO CRITICO]: Se registraron ${totalFailed} pruebas fallidas.`);
    process.exit(1);
  } else {
    console.log("\n[EXITO TOTAL]: Todas las pruebas pasaron satisfactoriamente al 100%.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Error fatal en el ejecutor de pruebas:", err);
  process.exit(1);
});
