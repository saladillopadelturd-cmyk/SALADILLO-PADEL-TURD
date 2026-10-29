import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildManualPlayoffBracket,
  initializeR1Slots,
  assignSeedToSlots,
  assignPlayToSlots,
  removeCoupleFromSlots,
  buildManualPlayoffBracketFromSlots,
  type ManualCoupleEntry,
} from "./manual-bracket";

describe("Motor Manual de Eliminación Directa con Slots Anclados", () => {
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
    assert.strictEqual(result.unpairedPlayCouples.length, 0);
  });

  it("Caso 2: 1 pareja sembrada ('seed') y 2 parejas jugando ('play')", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "pA", name: "Pareja A (1° Zona A)", action: "seed" },
      { id: "pB", name: "Pareja B (2° Zona B)", action: "play" },
      { id: "pC", name: "Pareja C (2° Zona A)", action: "play" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
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
  });

  it("Caso 3: Detecta pareja impar pendiente con acción 'play'", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "p1", name: "Pareja 1", action: "play" },
      { id: "p2", name: "Pareja 2", action: "seed" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.unpairedPlayCouples.length, 1);
    assert.strictEqual(result.unpairedPlayCouples[0], "p1");
  });

  it("Caso 4: Estructura de 6 parejas (2 sembradas y 2 cruces preliminares)", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "sA", name: "Sembrada A", action: "seed" },
      { id: "jB", name: "Juega B", action: "play" },
      { id: "jC", name: "Juega C", action: "play" },
      { id: "jD", name: "Juega D", action: "play" },
      { id: "jE", name: "Juega E", action: "play" },
      { id: "sF", name: "Sembrada F", action: "seed" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.unpairedPlayCouples.length, 0);
    assert.strictEqual(result.allStages[0], "quarter");
    assert.strictEqual(result.allStages[1], "semi");
    assert.strictEqual(result.allStages[2], "final");

    const semiM = result.matchesToInsert.filter((m) => m.stage === "semi");
    assert.strictEqual(semiM.length, 2);
    assert.strictEqual(semiM[0].couple1_id, "sA");
    assert.strictEqual(semiM[1].couple2_id, "sF");
  });

  it("Caso 5: Campos de cada llave inician VACÍOS si action es null", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "c1", name: "P1", action: null },
      { id: "c2", name: "P2", action: null },
      { id: "c3", name: "P3", action: null },
      { id: "c4", name: "P4", action: null },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.assignedCount, 0);

    for (const round of result.previewRounds) {
      for (const match of round.matches) {
        assert.strictEqual(match.couple1.isEmpty, true);
        assert.strictEqual(match.couple2.isEmpty, true);
      }
    }

    assert.strictEqual(result.matchesToInsert.length, 0);
  });

  it("Caso 6: Inmutabilidad de slots fijados (una nueva asignación NUNCA mueve a parejas previas)", () => {
    // 8 parejas base -> 4 slots en Ronda 1
    let slots = initializeR1Slots(8);
    assert.strictEqual(slots.length, 4);

    // 1. Sembrar pareja A -> se ancla en slot 0
    slots = assignSeedToSlots(slots, "A");
    assert.strictEqual(slots[0].type, "seed");
    assert.strictEqual(slots[0].couple1Id, "A");

    // 2. Colocar pareja B y C para Jugar -> se anclan en slot 1
    slots = assignPlayToSlots(slots, "B");
    slots = assignPlayToSlots(slots, "C");
    assert.strictEqual(slots[1].type, "match");
    assert.strictEqual(slots[1].couple1Id, "B");
    assert.strictEqual(slots[1].couple2Id, "C");
    // Verificamos que A en slot 0 NO se movió
    assert.strictEqual(slots[0].type, "seed");
    assert.strictEqual(slots[0].couple1Id, "A");

    // 3. Sembrar pareja D -> se ancla en el primer slot libre (slot 2)
    slots = assignSeedToSlots(slots, "D");
    assert.strictEqual(slots[2].type, "seed");
    assert.strictEqual(slots[2].couple1Id, "D");
    // Verificamos que A en slot 0 y B/C en slot 1 siguen exactamente en sus lugares
    assert.strictEqual(slots[0].couple1Id, "A");
    assert.strictEqual(slots[1].couple1Id, "B");
    assert.strictEqual(slots[1].couple2Id, "C");

    // 4. Presionar (X) en B (removeCoupleFromSlots)
    slots = removeCoupleFromSlots(slots, "B");
    // B fue removida, C permanece en slot 1 esperando rival
    assert.strictEqual(slots[1].couple1Id, "C");
    assert.strictEqual(slots[1].couple2Id, null);
    // Y A en slot 0 y D en slot 2 NO se alteraron en lo más mínimo
    assert.strictEqual(slots[0].couple1Id, "A");
    assert.strictEqual(slots[2].couple1Id, "D");
  });
});
