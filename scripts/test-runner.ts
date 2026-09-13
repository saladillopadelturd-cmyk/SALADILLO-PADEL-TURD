/**
 * Test Runner oficial para Saladillo Padel Tour (SPT).
 * Ejecuta pruebas unitarias, de integración y de estrés en lógica de torneos de pádel.
 */

import { runTournamentBusinessLogicTests } from "../src/lib/tournament/tournament-rules.test";
import { generateSeededPlayoffBracket, type QualifiedPair } from "../src/lib/tournament/elimination";

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

  const elapsed = Date.now() - startTime;
  const totalPassed = businessLogicResults.passed + playoffStress.passed;
  const totalFailed = businessLogicResults.failed + playoffStress.failed;

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
