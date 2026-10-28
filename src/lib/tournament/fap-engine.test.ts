import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateFAPZoneStructure,
  generateZones,
  distributePairsSnakeWithInstitutionCheck,
  generateFAPZoneMatches,
  resolveQualifiers,
  buildBracket32,
  type FAPPair,
  type FAPZone,
  type ZoneResolvedResults,
} from "./fap-engine";

describe("FAP Tournament Engine - Estructura y Conformación de Zonas", () => {
  it("dimensiona zonas con regla N mod 3 (28 a 48 parejas)", () => {
    // 28 parejas: 1 de 4 (A) + 8 de 3 (B a I) = 9 zonas
    const s28 = calculateFAPZoneStructure(28);
    assert.strictEqual(s28.numZones, 9);
    assert.strictEqual(s28.capacities[0], 4);
    assert.deepStrictEqual(s28.capacities.slice(1), [3, 3, 3, 3, 3, 3, 3, 3]);

    // 29 parejas: 2 de 4 (A y B) + 7 de 3 (C a I) = 9 zonas
    const s29 = calculateFAPZoneStructure(29);
    assert.strictEqual(s29.numZones, 9);
    assert.strictEqual(s29.capacities[0], 4);
    assert.strictEqual(s29.capacities[1], 4);
    assert.deepStrictEqual(s29.capacities.slice(2), [3, 3, 3, 3, 3, 3, 3]);

    // 30 parejas: 10 de 3 (A a J)
    const s30 = calculateFAPZoneStructure(30);
    assert.strictEqual(s30.numZones, 10);
    assert(s30.capacities.every((c) => c === 3));

    // 31 parejas: 1 de 4 (A) + 9 de 3 (B a J) = 10 zonas
    const s31 = calculateFAPZoneStructure(31);
    assert.strictEqual(s31.numZones, 10);
    assert.strictEqual(s31.capacities[0], 4);
    assert(s31.capacities.slice(1).every((c) => c === 3));

    // 32 parejas: 2 de 4 (A y B) + 8 de 3 (C a J) = 10 zonas
    const s32 = calculateFAPZoneStructure(32);
    assert.strictEqual(s32.numZones, 10);
    assert.strictEqual(s32.capacities[0], 4);
    assert.strictEqual(s32.capacities[1], 4);
    assert(s32.capacities.slice(2).every((c) => c === 3));

    // 33 parejas: 11 de 3 (A a K)
    const s33 = calculateFAPZoneStructure(33);
    assert.strictEqual(s33.numZones, 11);
    assert(s33.capacities.every((c) => c === 3));

    // 48 parejas: 16 de 3 (A a P)
    const s48 = calculateFAPZoneStructure(48);
    assert.strictEqual(s48.numZones, 16);
    assert(s48.capacities.every((c) => c === 3));
  });

  it("distribuye por serpenteado evitando coincidencia de institución", () => {
    // 9 parejas, 3 zonas (A, B, C de 3)
    // Supongamos duplas 1 y 6 son del Club X (en serpenteado estándar: 1->A, 6->A)
    const pairs: FAPPair[] = [
      { id: "p1", names: "Dupla 1", ranking: 1, institutionId: "Club_X" },
      { id: "p2", names: "Dupla 2", ranking: 2, institutionId: "Club_Y" },
      { id: "p3", names: "Dupla 3", ranking: 3, institutionId: "Club_Z" },
      { id: "p4", names: "Dupla 4", ranking: 4, institutionId: "Club_W" },
      { id: "p5", names: "Dupla 5", ranking: 5, institutionId: "Club_Y" },
      { id: "p6", names: "Dupla 6", ranking: 6, institutionId: "Club_X" },
      { id: "p7", names: "Dupla 7", ranking: 7, institutionId: "Club_W" },
      { id: "p8", names: "Dupla 8", ranking: 8, institutionId: "Club_Z" },
      { id: "p9", names: "Dupla 9", ranking: 9, institutionId: "Club_V" },
    ];

    const zones = generateZones(pairs);
    assert.strictEqual(zones.length, 3);

    // Ninguna zona debe tener más de 1 dupla de Club_X
    for (const z of zones) {
      const xCount = z.teams.filter((t) => t.institutionId === "Club_X").length;
      assert(xCount <= 1, `Zona ${z.letter} no debe tener dos parejas del Club_X`);
    }
  });

  it("si colisión institucional es inevitable, programa enfrentamiento en Partido 1", () => {
    // 6 parejas, 2 zonas de 3. Pero 3 duplas son del Club_X (inevitablemente 2 compartirán zona)
    const pairs: FAPPair[] = [
      { id: "p1", names: "Dupla 1", ranking: 1, institutionId: "Club_X" },
      { id: "p2", names: "Dupla 2", ranking: 2, institutionId: "Club_X" },
      { id: "p3", names: "Dupla 3", ranking: 3, institutionId: "Club_X" },
      { id: "p4", names: "Dupla 4", ranking: 4, institutionId: "Club_Y" },
      { id: "p5", names: "Dupla 5", ranking: 5, institutionId: "Club_Y" },
      { id: "p6", names: "Dupla 6", ranking: 6, institutionId: "Club_Z" },
    ];

    const zones = generateZones(pairs);
    const collidingZone = zones.find((z) => z.forcedFirstMatchPairIds);
    assert(collidingZone, "Debe registrarse una zona con cruce forzado de misma institución");

    const matches = generateFAPZoneMatches(collidingZone);
    assert.strictEqual(matches.length, 3);
    // Partido 1 debe enfrentar a las 2 parejas de Club_X
    const [c1, c2] = collidingZone.forcedFirstMatchPairIds!;
    assert(
      (matches[0].couple1Id === c1 && matches[0].couple2Id === c2) ||
        (matches[0].couple1Id === c2 && matches[0].couple2Id === c1),
      "El partido 1 debe enfrentar obligatoriamente a las parejas de la misma institución"
    );
  });
});

describe("FAP Tournament Engine - Modalidad de Juego y Clasificados", () => {
  it("en zona de 4 parejas genera 4 partidos (Doble Eliminatoria Corta)", () => {
    const zone: FAPZone = {
      letter: "A",
      zoneIndex: 0,
      capacity: 4,
      teams: [
        { id: "p1", names: "Ranking 1", ranking: 1 },
        { id: "p2", names: "Ranking 2", ranking: 2 },
        { id: "p3", names: "Ranking 3", ranking: 3 },
        { id: "p4", names: "Ranking 4", ranking: 4 },
      ],
    };

    const matches = generateFAPZoneMatches(zone);
    assert.strictEqual(matches.length, 4);

    // R1: P1 vs P4
    assert.strictEqual(matches[0].couple1Id, "p1");
    assert.strictEqual(matches[0].couple2Id, "p4");

    // R1: P2 vs P3
    assert.strictEqual(matches[1].couple1Id, "p2");
    assert.strictEqual(matches[1].couple2Id, "p3");

    // R2: Ganador vs Ganador
    assert.strictEqual(matches[2].isWinnersMatch, true);

    // R2: Perdedor vs Perdedor
    assert.strictEqual(matches[3].isLosersMatch, true);
  });

  it("clasifica exactamente 2 parejas en zonas de 3 y 3 parejas en zonas de 4", () => {
    const zonesData: ZoneResolvedResults[] = [
      {
        zoneLetter: "A",
        capacity: 4,
        standings: [
          { pair: { id: "A1", names: "Dupla A1", ranking: 1 }, position: 1, points: 4, setsWon: 4, setsLost: 0, gamesWon: 24, gamesLost: 8, setsDiff: 4, gamesDiff: 16 },
          { pair: { id: "A2", names: "Dupla A2", ranking: 4 }, position: 2, points: 3, setsWon: 2, setsLost: 2, gamesWon: 18, gamesLost: 16, setsDiff: 0, gamesDiff: 2 },
          { pair: { id: "A3", names: "Dupla A3", ranking: 8 }, position: 3, points: 3, setsWon: 2, setsLost: 2, gamesWon: 16, gamesLost: 18, setsDiff: 0, gamesDiff: -2 },
          { pair: { id: "A4", names: "Dupla A4", ranking: 12 }, position: 4, points: 2, setsWon: 0, setsLost: 4, gamesWon: 8, gamesLost: 24, setsDiff: -4, gamesDiff: -16 },
        ],
      },
      {
        zoneLetter: "B",
        capacity: 3,
        standings: [
          { pair: { id: "B1", names: "Dupla B1", ranking: 2 }, position: 1, points: 4, setsWon: 4, setsLost: 1, gamesWon: 20, gamesLost: 10, setsDiff: 3, gamesDiff: 10 },
          { pair: { id: "B2", names: "Dupla B2", ranking: 5 }, position: 2, points: 3, setsWon: 3, setsLost: 3, gamesWon: 15, gamesLost: 15, setsDiff: 0, gamesDiff: 0 },
          { pair: { id: "B3", names: "Dupla B3", ranking: 9 }, position: 3, points: 2, setsWon: 1, setsLost: 4, gamesWon: 10, gamesLost: 20, setsDiff: -3, gamesDiff: -10 },
        ],
      },
    ];

    const qualifiers = resolveQualifiers(zonesData);

    // 1ros: A1 y B1
    assert.strictEqual(qualifiers.firsts.length, 2);
    assert.strictEqual(qualifiers.firsts[0].token, "1º A");
    assert.strictEqual(qualifiers.firsts[1].token, "1º B");

    // 2dos: A2 y B2
    assert.strictEqual(qualifiers.seconds.length, 2);
    assert.strictEqual(qualifiers.seconds[0].token, "2º A");
    assert.strictEqual(qualifiers.seconds[1].token, "2º B");

    // 3ros: Solo de Zona A (Zona de 4) -> A3. En Zona B el 3ro queda eliminado.
    assert.strictEqual(qualifiers.thirds.length, 1);
    assert.strictEqual(qualifiers.thirds[0].token, "3º A");
  });
});

describe("FAP Tournament Engine - Llaves >28 Parejas (Tabla FAP 3.2 y BYEs)", () => {
  it("valida generación de llave para 28 parejas (19 clasificados, 13 BYEs, 3° A en 16vos)", () => {
    // 28 parejas: 9 zonas (A de 4, B..I de 3)
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const zonesData: ZoneResolvedResults[] = letters.map((l) => ({
      zoneLetter: l,
      capacity: l === "A" ? 4 : 3,
      standings: [
        { pair: { id: `${l}1`, names: `Dupla ${l}1`, ranking: 1 }, position: 1, points: 4, setsWon: 4, setsLost: 0, gamesWon: 12, gamesLost: 2, setsDiff: 4, gamesDiff: 10 },
        { pair: { id: `${l}2`, names: `Dupla ${l}2`, ranking: 2 }, position: 2, points: 3, setsWon: 2, setsLost: 2, gamesWon: 8, gamesLost: 8, setsDiff: 0, gamesDiff: 0 },
        ...(l === "A"
          ? [{ pair: { id: "A3", names: "Dupla A3", ranking: 3 }, position: 3 as const, points: 3, setsWon: 2, setsLost: 2, gamesWon: 6, gamesLost: 6, setsDiff: 0, gamesDiff: 0 }]
          : []),
      ],
    }));

    const qualifiers = resolveQualifiers(zonesData);
    assert.strictEqual(qualifiers.firsts.length, 9);
    assert.strictEqual(qualifiers.seconds.length, 9);
    assert.strictEqual(qualifiers.thirds.length, 1);
    assert.strictEqual(qualifiers.thirds[0].token, "3º A");

    const bracket = buildBracket32(qualifiers, 28);
    assert.strictEqual(bracket.totalSlots, 32);
    assert.strictEqual(bracket.totalQualified, 19);
    assert.strictEqual(bracket.numByes, 13);

    // 13 BYEs implican exactamente 3 partidos a disputar en 16vos
    const activeMatches = bracket.matches16vos.filter((m) => !m.isBye);
    assert.strictEqual(activeMatches.length, 3);

    // 1º A en match 1, 1º B en match 16
    assert.strictEqual(bracket.matches16vos[0].token1, "1º A");
    assert.strictEqual(bracket.matches16vos[0].token2, "BYE");
    assert.strictEqual(bracket.matches16vos[15].token2, "1º B");
    assert.strictEqual(bracket.matches16vos[15].token1, "BYE");

    // 3º A juega 16vos (NUNCA recibe BYE)
    const match3A = bracket.matches16vos.find(
      (m) => m.token1 === "3º A" || m.token2 === "3º A"
    );
    assert(match3A, "3º A debe estar en un cruce");
    assert.strictEqual(match3A.isBye, false, "3º A NUNCA debe recibir BYE");
  });

  it("valida generación de llave para 29 parejas (20 clasificados, 12 BYEs, 3° A y 3° B en 16vos)", () => {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const zonesData: ZoneResolvedResults[] = letters.map((l) => ({
      zoneLetter: l,
      capacity: l === "A" || l === "B" ? 4 : 3,
      standings: [
        { pair: { id: `${l}1`, names: `Dupla ${l}1`, ranking: 1 }, position: 1, points: 4, setsWon: 4, setsLost: 0, gamesWon: 12, gamesLost: 2, setsDiff: 4, gamesDiff: 10 },
        { pair: { id: `${l}2`, names: `Dupla ${l}2`, ranking: 2 }, position: 2, points: 3, setsWon: 2, setsLost: 2, gamesWon: 8, gamesLost: 8, setsDiff: 0, gamesDiff: 0 },
        ...(l === "A" || l === "B"
          ? [{ pair: { id: `${l}3`, names: `Dupla ${l}3`, ranking: 3 }, position: 3 as const, points: 3, setsWon: 2, setsLost: 2, gamesWon: 6, gamesLost: 6, setsDiff: 0, gamesDiff: 0 }]
          : []),
      ],
    }));

    const qualifiers = resolveQualifiers(zonesData);
    assert.strictEqual(qualifiers.firsts.length, 9);
    assert.strictEqual(qualifiers.seconds.length, 9);
    assert.strictEqual(qualifiers.thirds.length, 2);

    const bracket = buildBracket32(qualifiers, 29);
    assert.strictEqual(bracket.totalQualified, 20);
    assert.strictEqual(bracket.numByes, 12);

    const activeMatches = bracket.matches16vos.filter((m) => !m.isBye);
    assert.strictEqual(activeMatches.length, 4);

    // 3º A y 3º B juegan 16vos sin BYE
    const match3A = bracket.matches16vos.find((m) => m.token1 === "3º A" || m.token2 === "3º A");
    const match3B = bracket.matches16vos.find((m) => m.token1 === "3º B" || m.token2 === "3º B");
    assert(match3A && !match3A.isBye, "3º A debe disputar partido de 16vos");
    assert(match3B && !match3B.isBye, "3º B debe disputar partido de 16vos");
  });

  it("valida generación de llave para 48 parejas (32 clasificados, 0 BYEs, 16 partidos completos)", () => {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
    const zonesData: ZoneResolvedResults[] = letters.map((l) => ({
      zoneLetter: l,
      capacity: 3,
      standings: [
        { pair: { id: `${l}1`, names: `Dupla ${l}1`, ranking: 1 }, position: 1, points: 4, setsWon: 4, setsLost: 0, gamesWon: 12, gamesLost: 2, setsDiff: 4, gamesDiff: 10 },
        { pair: { id: `${l}2`, names: `Dupla ${l}2`, ranking: 2 }, position: 2, points: 3, setsWon: 2, setsLost: 2, gamesWon: 8, gamesLost: 8, setsDiff: 0, gamesDiff: 0 },
      ],
    }));

    const qualifiers = resolveQualifiers(zonesData);
    assert.strictEqual(qualifiers.firsts.length, 16);
    assert.strictEqual(qualifiers.seconds.length, 16);
    assert.strictEqual(qualifiers.thirds.length, 0);

    const bracket = buildBracket32(qualifiers, 48);
    assert.strictEqual(bracket.totalQualified, 32);
    assert.strictEqual(bracket.numByes, 0);

    // 16 partidos activos completos
    const activeMatches = bracket.matches16vos.filter((m) => !m.isBye);
    assert.strictEqual(activeMatches.length, 16);
  });
});
