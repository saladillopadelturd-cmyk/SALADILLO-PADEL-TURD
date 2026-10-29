import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildManualPlayoffBracket,
  buildManualPlayoffBracketFromSlots,
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

    // 2. Las llaves de 16vos no utilizadas (como el BYE de pA) se eliminan al definir el cuadro
    const matchBye = result.matchesToInsert.find(
      (m) => m.stage === "round_of_32" && m.couple1_id === "pA"
    );
    assert.strictEqual(matchBye, undefined, "pA no debe tener llave de 16vos porque pasa directo a 8vos");
    const r32Count = result.matchesToInsert.filter((m) => m.stage === "round_of_32").length;
    assert.strictEqual(r32Count, 1, "Solo debe haber 1 partido de 16vos (el cruce jugado)");

    // 3. En la previsualización de 8vos de final (round_of_16), pA aparece colocada directamente
    const round8 = result.previewRounds.find((r) => r.stage === "round_of_16");
    assert.ok(round8);
    const hasPAin8 = round8.matches.some(
      (m) => m.couple1.id === "pA" || m.couple2.id === "pA"
    );
    assert.ok(hasPAin8, "pA debe aparecer directamente sembrada en 8vos de final");
  });

  it("Caso 7: Si todas las parejas son sembradas en 8vos, se eliminan todas las llaves de 16vos y arranca en 8vos", () => {
    const couples: ManualCoupleEntry[] = [
      { id: "s1", name: "Sembrada 1", action: "seed" },
      { id: "s2", name: "Sembrada 2", action: "seed" },
      { id: "s3", name: "Sembrada 3", action: "seed" },
      { id: "s4", name: "Sembrada 4", action: "seed" },
    ];

    const result = buildManualPlayoffBracket(couples, 101);
    assert.strictEqual(result.allStages[0], "round_of_16", "La primera etapa debe ser round_of_16");
    assert.ok(!result.allStages.includes("round_of_32"), "No debe incluirse round_of_32");

    const r32Matches = result.matchesToInsert.filter((m) => m.stage === "round_of_32");
    assert.strictEqual(r32Matches.length, 0, "No debe insertarse ninguna llave de 16vos no utilizada");
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

  it("Caso 8: Asignación secuencial de arriba hacia abajo (Llave 1 de 8vos con sembrada y 16vos, luego pasa a Llave 2)", () => {
    let slots = initializeR1Slots();

    // 1. En la primer llave se siembra una pareja (ocupa slot 0 de arriba hacia abajo)
    slots = assignSeedToSlots(slots, "P1");
    assert.strictEqual(slots[0].type, "seed");
    assert.strictEqual(slots[0].couple1Id, "P1");

    // 2. Seguido a esto se eligen 2 parejas para jugar 16vos de final (ocupan slot 1)
    slots = assignPlayToSlots(slots, "P2");
    assert.strictEqual(slots[1].type, "match");
    assert.strictEqual(slots[1].couple1Id, "P2");
    assert.strictEqual(slots[1].couple2Id, null, "P2 espera rival en 16vos");

    slots = assignPlayToSlots(slots, "P3");
    assert.strictEqual(slots[1].type, "match");
    assert.strictEqual(slots[1].couple1Id, "P2");
    assert.strictEqual(slots[1].couple2Id, "P3", "P2 y P3 disputan 16vos para enfrentar a P1 en 8vos");

    // 3. De allí pasamos a la segunda llave de octavos (slots 2 y 3)
    slots = assignSeedToSlots(slots, "P4");
    assert.strictEqual(slots[2].type, "seed");
    assert.strictEqual(slots[2].couple1Id, "P4", "P4 ocupa la parte superior de la 2da llave de 8vos");

    slots = assignPlayToSlots(slots, "P5");
    slots = assignPlayToSlots(slots, "P6");
    assert.strictEqual(slots[3].type, "match");
    assert.strictEqual(slots[3].couple1Id, "P5");
    assert.strictEqual(slots[3].couple2Id, "P6", "P5 y P6 disputan 16vos para la 2da llave de 8vos");

    // 4. Verificamos la construcción del cuadro
    const couplesMap = new Map([
      ["P1", { id: "P1", name: "Pareja 1 (Sembrada)" }],
      ["P2", { id: "P2", name: "Pareja 2 (Juega 16vos)" }],
      ["P3", { id: "P3", name: "Pareja 3 (Juega 16vos)" }],
      ["P4", { id: "P4", name: "Pareja 4 (Sembrada)" }],
      ["P5", { id: "P5", name: "Pareja 5 (Juega 16vos)" }],
      ["P6", { id: "P6", name: "Pareja 6 (Juega 16vos)" }],
    ]);

    const result = buildManualPlayoffBracketFromSlots(couplesMap, slots, 6, 101);
    const round8 = result.previewRounds.find((r) => r.stage === "round_of_16");
    assert.ok(round8);

    // Partido 1 de 8vos: Pareja 1 sembrada arriba, Ganador de 16vos abajo
    const match8_1 = round8.matches[0];
    assert.strictEqual(match8_1.couple1.id, "P1", "Llave 1 de 8vos (arriba) tiene a P1 sembrada");
    assert.strictEqual(match8_1.couple2.isFeeder, true, "Llave 1 de 8vos (abajo) recibe al ganador de 16vos");

    // Partido 2 de 8vos: Pareja 4 sembrada arriba, Ganador de 16vos abajo
    const match8_2 = round8.matches[1];
    assert.strictEqual(match8_2.couple1.id, "P4", "Llave 2 de 8vos (arriba) tiene a P4 sembrada");
    assert.strictEqual(match8_2.couple2.isFeeder, true, "Llave 2 de 8vos (abajo) recibe al ganador de 16vos");
  });
});
