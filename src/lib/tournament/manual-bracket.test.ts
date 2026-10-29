import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildManualPlayoffBracket,
  initializeR1Slots,
  assignSeedToSlots,
  assignPlayToSlots,
  removeCoupleFromSlots,
  OFFICIAL_STAGES,
  type ManualCoupleEntry,
} from "./manual-bracket";

describe("Motor Manual de Eliminación Directa: 16vos para Jugar y 8vos para Sembradas", () => {
  it("Caso 1: Las etapas canónicas comienzan en 16vos y continúan en 8vos, Cuartos, Semis y Final", () => {
    assert.deepStrictEqual(OFFICIAL_STAGES, [
      "round_of_32",
      "round_of_16",
      "quarter",
      "semi",
      "final",
    ]);
  });

  it("Caso 2: 2 parejas con acción 'play' juegan en 16vos de Final", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "c1", name: "Pareja 1", action: "play" },
      { id: "c2", name: "Pareja 2", action: "play" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.allStages[0], "round_of_32");
    assert.strictEqual(result.allStages[1], "round_of_16");

    // Match de 16vos de final conformado
    const m16 = result.matchesToInsert.find((m) => m.stage === "round_of_32");
    assert.ok(m16);
    assert.strictEqual(m16.couple1_id, "c1");
    assert.strictEqual(m16.couple2_id, "c2");
    assert.strictEqual(m16.status, "pending");
  });

  it("Caso 3: Pareja sembrada aparece en 8vos de Final y parejas con 'play' juegan en 16vos", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "pA", name: "Pareja A (1° Zona A)", action: "seed" },
      { id: "pB", name: "Pareja B (2° Zona B)", action: "play" },
      { id: "pC", name: "Pareja C (2° Zona A)", action: "play" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);

    // 1. Parejas pB y pC juegan en 16vos de Final (round_of_32)
    const matchPlay = result.matchesToInsert.find(
      (m) => m.stage === "round_of_32" && m.couple1_id === "pB" && m.couple2_id === "pC"
    );
    assert.ok(matchPlay, "pB y pC deben jugar en 16vos");

    // 2. Pareja pA recibe BYE en 16vos para pasar directo a 8vos
    const matchBye = result.matchesToInsert.find(
      (m) => m.stage === "round_of_32" && m.couple1_id === "pA"
    );
    assert.ok(matchBye, "pA debe recibir BYE en 16vos");
    assert.strictEqual(matchBye.status, "completed");

    // 3. En la previsualización de 8vos de final (round_of_16), pA aparece colocada directamente
    const round8 = result.previewRounds.find((r) => r.stage === "round_of_16");
    assert.ok(round8);
    const hasPAin8 = round8.matches.some(
      (m) => m.couple1.id === "pA" || m.couple2.id === "pA"
    );
    assert.ok(hasPAin8, "pA debe aparecer directamente sembrada en 8vos de final");
  });

  it("Caso 4: Detecta pareja impar pendiente para jugar en 16vos", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "p1", name: "Pareja 1", action: "play" },
      { id: "p2", name: "Pareja 2", action: "seed" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.unpairedPlayCouples.length, 1);
    assert.strictEqual(result.unpairedPlayCouples[0], "p1");
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

  it("Caso 6: Inmutabilidad estricta (presionar X libera solo la pareja elegida)", () => {
    let slots = initializeR1Slots();
    assert.strictEqual(slots.length, 16); // 16 cruces de 16vos

    // Sembrar A
    slots = assignSeedToSlots(slots, "A");
    assert.strictEqual(slots[0].type, "seed");
    assert.strictEqual(slots[0].couple1Id, "A");

    // Jugar B y C en 16vos
    slots = assignPlayToSlots(slots, "B");
    slots = assignPlayToSlots(slots, "C");
    assert.strictEqual(slots[1].type, "match");
    assert.strictEqual(slots[1].couple1Id, "B");
    assert.strictEqual(slots[1].couple2Id, "C");

    // A sigue intacta
    assert.strictEqual(slots[0].couple1Id, "A");

    // Quitar B con (X)
    slots = removeCoupleFromSlots(slots, "B");
    assert.strictEqual(slots[1].couple1Id, "C");
    assert.strictEqual(slots[1].couple2Id, null);
    assert.strictEqual(slots[0].couple1Id, "A");
  });
});
