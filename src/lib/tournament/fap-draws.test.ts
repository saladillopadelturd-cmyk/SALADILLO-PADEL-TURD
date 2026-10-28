import { describe, it } from "node:test";
import assert from "node:assert";
import {
  FAP_DRAW_TEMPLATES,
  findFAPTemplate,
  buildZoneLetterMap,
  resolveFAPToken,
} from "./fap-draws";
import { generateSeededPlayoffBracket, type QualifiedPair } from "./elimination";

describe("Conformación oficial de Cuadros FAP (LIBRO.pdf págs 122-148)", () => {
  it("contiene todas las plantillas oficiales desde 6 hasta 32 parejas", () => {
    for (let couples = 6; couples <= 32; couples++) {
      const template = FAP_DRAW_TEMPLATES[couples];
      assert(template, `Debe existir plantilla FAP para ${couples} parejas`);
      assert(template.couplesCount === couples);
      assert(template.matches.length === template.totalSlots / 2);
    }
  });

  it("en todas las plantillas 1º A encabeza el cuadro superior y 1º B cierra el cuadro inferior", () => {
    for (let couples = 6; couples <= 32; couples++) {
      const template = FAP_DRAW_TEMPLATES[couples];
      const firstMatch = template.matches[0];
      const lastMatch = template.matches[template.matches.length - 1];

      assert(
        firstMatch.includes("1º A"),
        `Plantilla ${couples} parejas: 1º A debe estar en el primer partido`
      );
      assert(
        lastMatch.includes("1º B"),
        `Plantilla ${couples} parejas: 1º B debe estar en el último partido`
      );
    }
  });

  it("ningún partido de primera ronda enfrenta a parejas de la misma zona", () => {
    for (let couples = 6; couples <= 32; couples++) {
      const template = FAP_DRAW_TEMPLATES[couples];
      for (const [t1, t2] of template.matches) {
        if (t1 === "BYE" || t2 === "BYE") continue;
        const z1 = t1.slice(-1);
        const z2 = t2.slice(-1);
        assert.notStrictEqual(
          z1,
          z2,
          `En ${couples} parejas: partido ${t1} vs ${t2} enfrenta a la misma zona ${z1}`
        );
      }
    }
  });

  it("verifica el cuadro exacto de 6 parejas (LIBRO.pdf pág 122 - 2 zonas de 3)", () => {
    const qualified: QualifiedPair[] = [
      { pairId: "A1", zoneName: "Zona A", zonePosition: 1, points: 4, gameDifference: 8 },
      { pairId: "A2", zoneName: "Zona A", zonePosition: 2, points: 2, gameDifference: 0 },
      { pairId: "B1", zoneName: "Zona B", zonePosition: 1, points: 4, gameDifference: 6 },
      { pairId: "B2", zoneName: "Zona B", zonePosition: 2, points: 2, gameDifference: -2 },
    ];

    const bracket = generateSeededPlayoffBracket(qualified, 6);
    assert.strictEqual(bracket.totalSlots, 4);
    assert.strictEqual(bracket.allStages[0], "semi");
    assert.strictEqual(bracket.firstRoundMatches.length, 2);

    // M0: 1º A vs 2º B
    assert.strictEqual(bracket.firstRoundMatches[0].couple1Id, "A1");
    assert.strictEqual(bracket.firstRoundMatches[0].couple2Id, "B2");

    // M1: 2º A vs 1º B
    assert.strictEqual(bracket.firstRoundMatches[1].couple1Id, "A2");
    assert.strictEqual(bracket.firstRoundMatches[1].couple2Id, "B1");
  });

  it("verifica el cuadro exacto de 7 parejas (LIBRO.pdf pág 123 - Zona A: 4, Zona B: 3)", () => {
    const qualified: QualifiedPair[] = [
      { pairId: "A1", zoneName: "Zona A", zonePosition: 1, points: 6, gameDifference: 12 },
      { pairId: "A2", zoneName: "Zona A", zonePosition: 2, points: 4, gameDifference: 4 },
      { pairId: "A3", zoneName: "Zona A", zonePosition: 3, points: 2, gameDifference: -2 },
      { pairId: "B1", zoneName: "Zona B", zonePosition: 1, points: 4, gameDifference: 8 },
      { pairId: "B2", zoneName: "Zona B", zonePosition: 2, points: 2, gameDifference: 2 },
    ];

    const bracket = generateSeededPlayoffBracket(qualified, 7);
    assert.strictEqual(bracket.totalSlots, 8);
    assert.strictEqual(bracket.allStages[0], "quarter");
    assert.strictEqual(bracket.byesCount, 3);

    // M0: 1º A vs BYE
    assert.strictEqual(bracket.firstRoundMatches[0].couple1Id, "A1");
    assert.strictEqual(bracket.firstRoundMatches[0].couple2Id, "BYE");
    assert.strictEqual(bracket.firstRoundMatches[0].isBye, true);
    assert.strictEqual(bracket.firstRoundMatches[0].advancingPairId, "A1");

    // M1: 3º A vs 2º B
    assert.strictEqual(bracket.firstRoundMatches[1].couple1Id, "A3");
    assert.strictEqual(bracket.firstRoundMatches[1].couple2Id, "B2");
    assert.strictEqual(bracket.firstRoundMatches[1].isBye, false);

    // M2: 2º A vs BYE
    assert.strictEqual(bracket.firstRoundMatches[2].couple1Id, "A2");
    assert.strictEqual(bracket.firstRoundMatches[2].couple2Id, "BYE");
    assert.strictEqual(bracket.firstRoundMatches[2].isBye, true);
    assert.strictEqual(bracket.firstRoundMatches[2].advancingPairId, "A2");

    // M3: BYE vs 1º B
    assert.strictEqual(bracket.firstRoundMatches[3].couple1Id, "BYE");
    assert.strictEqual(bracket.firstRoundMatches[3].couple2Id, "B1");
    assert.strictEqual(bracket.firstRoundMatches[3].isBye, true);
    assert.strictEqual(bracket.firstRoundMatches[3].advancingPairId, "B1");
  });

  it("verifica el cuadro exacto de 12 parejas (LIBRO.pdf pág 128 - 4 zonas de 3)", () => {
    const qualified: QualifiedPair[] = [
      { pairId: "A1", zoneName: "Zona A", zonePosition: 1, points: 4, gameDifference: 6 },
      { pairId: "A2", zoneName: "Zona A", zonePosition: 2, points: 2, gameDifference: 1 },
      { pairId: "B1", zoneName: "Zona B", zonePosition: 1, points: 4, gameDifference: 5 },
      { pairId: "B2", zoneName: "Zona B", zonePosition: 2, points: 2, gameDifference: 0 },
      { pairId: "C1", zoneName: "Zona C", zonePosition: 1, points: 4, gameDifference: 4 },
      { pairId: "C2", zoneName: "Zona C", zonePosition: 2, points: 2, gameDifference: -1 },
      { pairId: "D1", zoneName: "Zona D", zonePosition: 1, points: 4, gameDifference: 3 },
      { pairId: "D2", zoneName: "Zona D", zonePosition: 2, points: 2, gameDifference: -2 },
    ];

    const bracket = generateSeededPlayoffBracket(qualified, 12);
    assert.strictEqual(bracket.totalSlots, 8);
    assert.strictEqual(bracket.byesCount, 0);

    // P57: 1º A vs 2º B
    assert.strictEqual(bracket.firstRoundMatches[0].couple1Id, "A1");
    assert.strictEqual(bracket.firstRoundMatches[0].couple2Id, "B2");

    // P58: 2º C vs 1º D
    assert.strictEqual(bracket.firstRoundMatches[1].couple1Id, "C2");
    assert.strictEqual(bracket.firstRoundMatches[1].couple2Id, "D1");

    // P59: 1º C vs 2º D
    assert.strictEqual(bracket.firstRoundMatches[2].couple1Id, "C1");
    assert.strictEqual(bracket.firstRoundMatches[2].couple2Id, "D2");

    // P60: 2º A vs 1º B
    assert.strictEqual(bracket.firstRoundMatches[3].couple1Id, "A2");
    assert.strictEqual(bracket.firstRoundMatches[3].couple2Id, "B1");
  });

  it("verifica el cuadro exacto de 24 parejas (LIBRO.pdf pág 140 - 8 zonas de 3)", () => {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const qualified: QualifiedPair[] = [];
    letters.forEach((l) => {
      qualified.push({
        pairId: `${l}1`,
        zoneName: `Zona ${l}`,
        zonePosition: 1,
        points: 4,
        gameDifference: 4,
      });
      qualified.push({
        pairId: `${l}2`,
        zoneName: `Zona ${l}`,
        zonePosition: 2,
        points: 2,
        gameDifference: 0,
      });
    });

    const bracket = generateSeededPlayoffBracket(qualified, 24);
    assert.strictEqual(bracket.totalSlots, 16);
    assert.strictEqual(bracket.byesCount, 0);
    assert.strictEqual(bracket.allStages[0], "round_of_16");

    // P49: 1º A vs 2º B
    assert.strictEqual(bracket.firstRoundMatches[0].couple1Id, "A1");
    assert.strictEqual(bracket.firstRoundMatches[0].couple2Id, "B2");

    // P50: 2º G vs 1º H
    assert.strictEqual(bracket.firstRoundMatches[1].couple1Id, "G2");
    assert.strictEqual(bracket.firstRoundMatches[1].couple2Id, "H1");

    // P51: 1º E vs 2º F
    assert.strictEqual(bracket.firstRoundMatches[2].couple1Id, "E1");
    assert.strictEqual(bracket.firstRoundMatches[2].couple2Id, "F2");

    // P52: 2º C vs 1º D
    assert.strictEqual(bracket.firstRoundMatches[3].couple1Id, "C2");
    assert.strictEqual(bracket.firstRoundMatches[3].couple2Id, "D1");

    // P53: 1º C vs 2º D
    assert.strictEqual(bracket.firstRoundMatches[4].couple1Id, "C1");
    assert.strictEqual(bracket.firstRoundMatches[4].couple2Id, "D2");

    // P54: 2º E vs 1º F
    assert.strictEqual(bracket.firstRoundMatches[5].couple1Id, "E2");
    assert.strictEqual(bracket.firstRoundMatches[5].couple2Id, "F1");

    // P55: 1º G vs 2º H
    assert.strictEqual(bracket.firstRoundMatches[6].couple1Id, "G1");
    assert.strictEqual(bracket.firstRoundMatches[6].couple2Id, "H2");

    // P56: 2º A vs 1º B
    assert.strictEqual(bracket.firstRoundMatches[7].couple1Id, "A2");
    assert.strictEqual(bracket.firstRoundMatches[7].couple2Id, "B1");
  });
});
