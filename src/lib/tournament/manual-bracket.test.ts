import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildManualPlayoffBracket,
  type ManualCoupleEntry,
} from "./manual-bracket";

describe("Motor Manual de Eliminación Directa", () => {
  it("Caso 1: 2 parejas con acción 'play' conforman una Final directa", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "c1", name: "Pareja 1", action: "play" },
      { id: "c2", name: "Pareja 2", action: "play" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.allStages.length, 1);
    assert.strictEqual(result.allStages[0], "final");
    assert.strictEqual(result.matchesToInsert.length, 1);
    assert.strictEqual(result.matchesToInsert[0].couple1_id, "c1");
    assert.strictEqual(result.matchesToInsert[0].couple2_id, "c2");
    assert.strictEqual(result.unpairedPlayCouple, null);
  });

  it("Caso 2: 1 pareja sembrada ('seed') y 2 parejas jugando ('play')", () => {
    // Orden de arriba hacia abajo:
    // 1. Pareja A -> Sembrada (espera rival)
    // 2. Pareja B -> Jugar \_ Juegan entre sí en R1
    // 3. Pareja C -> Jugar /
    const couples: ManualCoupleEntry[] = [
      { id: "pA", name: "Pareja A (1° Zona A)", action: "seed" },
      { id: "pB", name: "Pareja B (2° Zona B)", action: "play" },
      { id: "pC", name: "Pareja C (2° Zona A)", action: "play" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    // Ronda 1: Semifinal (Match 101: pA con BYE, Match 102: pB vs pC)
    // Ronda 2: Final (Match 103: pA pre-asignada vs Ganador P#102)
    assert.strictEqual(result.allStages.length, 2);
    assert.strictEqual(result.allStages[0], "semi");
    assert.strictEqual(result.allStages[1], "final");

    // Match 101: pA con BYE
    const m101 = result.matchesToInsert.find((m) => m.match_number === 101);
    assert.ok(m101);
    assert.strictEqual(m101.couple1_id, "pA");
    assert.strictEqual(m101.winner_couple_id, "pA");
    assert.strictEqual(m101.status, "completed");

    // Match 102: pB vs pC
    const m102 = result.matchesToInsert.find((m) => m.match_number === 102);
    assert.ok(m102);
    assert.strictEqual(m102.couple1_id, "pB");
    assert.strictEqual(m102.couple2_id, "pC");
    assert.strictEqual(m102.status, "pending");

    // Match 103 (Final): pA prellenada esperando al ganador
    const mFinal = result.matchesToInsert.find((m) => m.stage === "final");
    assert.ok(mFinal);
    assert.strictEqual(mFinal.couple1_id, "pA");
    assert.strictEqual(mFinal.couple2_id, null);
  });

  it("Caso 3: Detecta pareja impar pendiente con acción 'play'", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "p1", name: "Pareja 1", action: "play" },
      { id: "p2", name: "Pareja 2", action: "seed" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.ok(result.unpairedPlayCouple);
    assert.strictEqual(result.unpairedPlayCouple.id, "p1");
  });

  it("Caso 4: Estructura de 6 parejas (2 sembradas y 2 cruces preliminares)", () => {
    // Arriba hacia abajo:
    // 1: Sembrada A
    // 2: Jugar B \_ Cruce 1
    // 3: Jugar C /
    // 4: Jugar D \_ Cruce 2
    // 5: Jugar E /
    // 6: Sembrada F
    const couples: ManualCoupleEntry[] = [
      { id: "sA", name: "Sembrada A", action: "seed" },
      { id: "jB", name: "Juega B", action: "play" },
      { id: "jC", name: "Juega C", action: "play" },
      { id: "jD", name: "Juega D", action: "play" },
      { id: "jE", name: "Juega E", action: "play" },
      { id: "sF", name: "Sembrada F", action: "seed" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.unpairedPlayCouple, null);
    // 4 branches: sA, (jB vs jC), (jD vs jE), sF.
    // Cuartos (R1) -> Semis (R2) -> Final (R3)
    assert.strictEqual(result.allStages[0], "quarter");
    assert.strictEqual(result.allStages[1], "semi");
    assert.strictEqual(result.allStages[2], "final");

    // En semifinales:
    // Semi 1: sA vs Ganador(jB vs jC)
    // Semi 2: Ganador(jD vs jE) vs sF
    const semiMatches = result.matchesToInsert.filter((m) => m.stage === "semi");
    assert.strictEqual(semiMatches.length, 2);
    assert.strictEqual(semiMatches[0].couple1_id, "sA");
    assert.strictEqual(semiMatches[0].couple2_id, null); // Espera al ganador de jB vs jC
    assert.strictEqual(semiMatches[1].couple1_id, null); // Espera al ganador de jD vs jE
    assert.strictEqual(semiMatches[1].couple2_id, "sF");
  });
});
