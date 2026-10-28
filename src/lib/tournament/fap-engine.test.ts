import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateFAPZoneStructure,
  generateZones,
  distributePairsSnakeWithInstitutionCheck,
  generateFAPZoneMatches,
  calculateFAPZoneStandings,
  resolveQualifiers,
  type FAPPair,
  type FAPZone,
  type ZoneResolvedResults,
  type MatchResultInput,
} from "./fap-engine";

describe("FAP Tournament Engine - Estructura y Conformación de Zonas", () => {
  it("dimensiona zonas con regla N mod 3 (Regla FAP 1.1)", () => {
    // N mod 3 == 0 -> Todas de 3
    const s9 = calculateFAPZoneStructure(9);
    assert.strictEqual(s9.numZones, 3);
    assert(s9.capacities.every((c) => c === 3));

    // N mod 3 == 1 -> Zona A es de 4 obligatoriamente, restantes de 3
    const s10 = calculateFAPZoneStructure(10);
    assert.strictEqual(s10.numZones, 3);
    assert.strictEqual(s10.capacities[0], 4);
    assert.deepStrictEqual(s10.capacities.slice(1), [3, 3]);

    const s28 = calculateFAPZoneStructure(28);
    assert.strictEqual(s28.numZones, 9);
    assert.strictEqual(s28.capacities[0], 4);
    assert.deepStrictEqual(s28.capacities.slice(1), [3, 3, 3, 3, 3, 3, 3, 3]);

    // N mod 3 == 2 -> Zonas A y B son de 4 obligatoriamente, restantes de 3
    const s11 = calculateFAPZoneStructure(11);
    assert.strictEqual(s11.numZones, 3);
    assert.strictEqual(s11.capacities[0], 4);
    assert.strictEqual(s11.capacities[1], 4);
    assert.deepStrictEqual(s11.capacities.slice(2), [3]);

    const s29 = calculateFAPZoneStructure(29);
    assert.strictEqual(s29.numZones, 9);
    assert.strictEqual(s29.capacities[0], 4);
    assert.strictEqual(s29.capacities[1], 4);
    assert.deepStrictEqual(s29.capacities.slice(2), [3, 3, 3, 3, 3, 3, 3]);
  });

  it("distribuye por serpenteado evitando coincidencia de institución (Regla FAP 1.2)", () => {
    const pairs: FAPPair[] = [
      { id: "p1", names: "Dupla 1", ranking: 1, institutionId: "Club_A" },
      { id: "p2", names: "Dupla 2", ranking: 2, institutionId: "Club_B" },
      { id: "p3", names: "Dupla 3", ranking: 3, institutionId: "Club_C" },
      { id: "p4", names: "Dupla 4", ranking: 4, institutionId: "Club_A" },
      { id: "p5", names: "Dupla 5", ranking: 5, institutionId: "Club_B" },
      { id: "p6", names: "Dupla 6", ranking: 6, institutionId: "Club_C" },
      { id: "p7", names: "Dupla 7", ranking: 7, institutionId: "Club_D" },
      { id: "p8", names: "Dupla 8", ranking: 8, institutionId: "Club_E" },
      { id: "p9", names: "Dupla 9", ranking: 9, institutionId: "Club_F" },
    ];

    const zones = generateZones(pairs);
    assert.strictEqual(zones.length, 3);

    for (const z of zones) {
      const clubACount = z.teams.filter((t) => t.institutionId === "Club_A").length;
      const clubBCount = z.teams.filter((t) => t.institutionId === "Club_B").length;
      assert(clubACount <= 1, `Zona ${z.letter} no debe tener más de 1 dupla del Club_A`);
      assert(clubBCount <= 1, `Zona ${z.letter} no debe tener más de 1 dupla del Club_B`);
    }
  });

  it("si la coincidencia institucional es inevitable, programa enfrentamiento obligatorio en Partido 1", () => {
    // 6 parejas, 2 zonas de 3. 3 duplas del Club_X -> Inevitable que 2 compartan zona
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

    const [f1, f2] = collidingZone.forcedFirstMatchPairIds!;
    assert(
      (matches[0].couple1Id === f1 && matches[0].couple2Id === f2) ||
        (matches[0].couple1Id === f2 && matches[0].couple2Id === f1),
      "El Partido 1 debe enfrentar obligatoriamente a las parejas de la misma institución"
    );
  });
});

describe("FAP Tournament Engine - Modalidad de Juego y Definición de Zonas", () => {
  it("en zona de 4 genera 4 partidos (Doble Eliminatoria Corta)", () => {
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

    // Ronda 1: P1 vs P4 y P2 vs P3
    assert.strictEqual(matches[0].couple1Id, "p1");
    assert.strictEqual(matches[0].couple2Id, "p4");
    assert.strictEqual(matches[1].couple1Id, "p2");
    assert.strictEqual(matches[1].couple2Id, "p3");

    // Ronda 2: Ganador vs Ganador y Perdedor vs Perdedor
    assert.strictEqual(matches[2].isWinnersMatch, true);
    assert.strictEqual(matches[3].isLosersMatch, true);
  });

  it("calcula posiciones y desempates en Zona de 3 parejas según criterios oficiales FAP", () => {
    const zone: FAPZone = {
      letter: "B",
      zoneIndex: 1,
      capacity: 3,
      teams: [
        { id: "B1", names: "B1", ranking: 1 },
        { id: "B2", names: "B2", ranking: 2 },
        { id: "B3", names: "B3", ranking: 3 },
      ],
    };

    // Caso de triple empate en puntos (1 victoria y 1 derrota cada uno: 3 puntos c/u)
    // Desempate 1: Diferencia de sets
    // B1: 2-0 y 0-2 -> setsDiff = 0
    // B2: 2-1 y 1-2 -> setsDiff = 0
    // B3: 2-1 y 1-2 -> setsDiff = 0
    // Desempate 2: Diferencia de games
    // B1: gamesWon 20, gamesLost 14 -> gamesDiff = +6
    // B2: gamesWon 16, gamesLost 16 -> gamesDiff = 0
    // B3: gamesWon 14, gamesLost 20 -> gamesDiff = -6
    const completedMatches: MatchResultInput[] = [
      {
        matchNumber: 1,
        couple1Id: "B1",
        couple2Id: "B2",
        winnerCoupleId: "B1",
        setsWon1: 2,
        setsWon2: 0,
        gamesWon1: 12,
        gamesWon2: 4,
      },
      {
        matchNumber: 2,
        couple1Id: "B2",
        couple2Id: "B3",
        winnerCoupleId: "B2",
        setsWon1: 2,
        setsWon2: 1,
        gamesWon1: 12,
        gamesWon2: 8,
      },
      {
        matchNumber: 3,
        couple1Id: "B1",
        couple2Id: "B3",
        winnerCoupleId: "B3",
        setsWon1: 0,
        setsWon2: 2,
        gamesWon1: 2,
        gamesWon2: 12,
      },
    ];

    // En triple empate (1V y 1D cada uno):
    // Criterio 1 FAP: Diferencia de sets
    // B3: 3 sets a favor, 2 en contra -> setsDiff = +1 (1° Puesto)
    // B1: 2 sets a favor, 2 en contra -> setsDiff = 0  (2° Puesto)
    // B2: 2 sets a favor, 3 en contra -> setsDiff = -1 (3° Puesto)
    const standings = calculateFAPZoneStandings(zone, completedMatches);
    assert.strictEqual(standings.length, 3);

    // 1° B3 (+1 setsDiff)
    assert.strictEqual(standings[0].pair.id, "B3");
    assert.strictEqual(standings[0].position, 1);

    // 2° B1 (0 setsDiff)
    assert.strictEqual(standings[1].pair.id, "B1");
    assert.strictEqual(standings[1].position, 2);

    // 3° B2 (-1 setsDiff)
    assert.strictEqual(standings[2].pair.id, "B2");
    assert.strictEqual(standings[2].position, 3);
  });

  it("calcula posiciones en Zona de 4 parejas (Ganador define 1°/2°, Perdedor define 3°/eliminado)", () => {
    const zone: FAPZone = {
      letter: "A",
      zoneIndex: 0,
      capacity: 4,
      teams: [
        { id: "A1", names: "A1", ranking: 1 },
        { id: "A2", names: "A2", ranking: 2 },
        { id: "A3", names: "A3", ranking: 3 },
        { id: "A4", names: "A4", ranking: 4 },
      ],
    };

    // R1: A1 vs A4 (Gana A1), A2 vs A3 (Gana A2)
    // R2 Ganadores: A1 vs A2 (Gana A1) -> 1° A1, 2° A2
    // R2 Perdedores: A4 vs A3 (Gana A3) -> 3° A3, 4° A4 (eliminado)
    const matches: MatchResultInput[] = [
      { matchNumber: 1, couple1Id: "A1", couple2Id: "A4", winnerCoupleId: "A1", setsWon1: 2, setsWon2: 0, gamesWon1: 12, gamesWon2: 2 },
      { matchNumber: 2, couple1Id: "A2", couple2Id: "A3", winnerCoupleId: "A2", setsWon1: 2, setsWon2: 0, gamesWon1: 12, gamesWon2: 4 },
      { matchNumber: 3, couple1Id: "A1", couple2Id: "A2", winnerCoupleId: "A1", isWinnersMatch: true, setsWon1: 2, setsWon2: 1, gamesWon1: 14, gamesWon2: 10 },
      { matchNumber: 4, couple1Id: "A4", couple2Id: "A3", winnerCoupleId: "A3", isLosersMatch: true, setsWon1: 0, setsWon2: 2, gamesWon1: 4, gamesWon2: 12 },
    ];

    const standings = calculateFAPZoneStandings(zone, matches);
    assert.strictEqual(standings.length, 4);

    assert.strictEqual(standings[0].pair.id, "A1");
    assert.strictEqual(standings[0].position, 1);

    assert.strictEqual(standings[1].pair.id, "A2");
    assert.strictEqual(standings[1].position, 2);

    assert.strictEqual(standings[2].pair.id, "A3");
    assert.strictEqual(standings[2].position, 3);

    assert.strictEqual(standings[3].pair.id, "A4");
    assert.strictEqual(standings[3].position, 4);
  });

  it("clasifica exactamente 2 parejas en zonas de 3 y 3 parejas en zonas de 4 (Regla FAP 2)", () => {
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

    // 1ros puestos
    assert.strictEqual(qualifiers.firsts.length, 2);
    assert.strictEqual(qualifiers.firsts[0].token, "1º A");
    assert.strictEqual(qualifiers.firsts[1].token, "1º B");

    // 2dos puestos
    assert.strictEqual(qualifiers.seconds.length, 2);
    assert.strictEqual(qualifiers.seconds[0].token, "2º A");
    assert.strictEqual(qualifiers.seconds[1].token, "2º B");

    // 3ros puestos: Solo clasifica de Zona A (capacidad 4). El 3ro de Zona B queda eliminado.
    assert.strictEqual(qualifiers.thirds.length, 1);
    assert.strictEqual(qualifiers.thirds[0].token, "3º A");
  });
});
