import { autoScheduleMatches, parseStartDateTime, generateDefaultCourtNames, normalizeScheduledTime } from "./scheduler";
import type { Match } from "@/types/tournament";

export function runSchedulerTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
    }
  }

  // TEST 1: Generación de nombres de canchas por defecto
  const courts3 = generateDefaultCourtNames(3);
  assert(courts3.length === 3, "Debe generar 3 nombres de cancha");
  assert(courts3[0] === "Cancha 1" && courts3[1] === "Cancha 2" && courts3[2] === "Cancha 3", "Nombres deben ser Cancha 1, Cancha 2, Cancha 3");

  // TEST 2: Parsing de fecha y hora
  const dt = parseStartDateTime("2026-10-20", "09:30");
  assert(dt.getFullYear() === 2026, "Año debe ser 2026");
  assert(dt.getMonth() === 9, "Mes debe ser 9 (Octubre 0-indexado)");
  assert(dt.getDate() === 20, "Día debe ser 20");
  assert(dt.getHours() === 9 && dt.getMinutes() === 30, "Hora debe ser 09:30");

  // TEST 3: Programación de 2 zonas de 3 parejas (6 partidos en total) con 2 canchas
  // Zona 1: parejas c1, c2, c3 -> 3 partidos
  // Zona 2: parejas c4, c5, c6 -> 3 partidos
  const mockMatches: Match[] = [
    { id: "m1", tournament_id: "t1", stage: "zone", zone_id: "z1", couple1_id: "c1", couple2_id: "c2", status: "pending", created_at: "" },
    { id: "m2", tournament_id: "t1", stage: "zone", zone_id: "z1", couple1_id: "c2", couple2_id: "c3", status: "pending", created_at: "" },
    { id: "m3", tournament_id: "t1", stage: "zone", zone_id: "z1", couple1_id: "c1", couple2_id: "c3", status: "pending", created_at: "" },
    { id: "m4", tournament_id: "t1", stage: "zone", zone_id: "z2", couple1_id: "c4", couple2_id: "c5", status: "pending", created_at: "" },
    { id: "m5", tournament_id: "t1", stage: "zone", zone_id: "z2", couple1_id: "c5", couple2_id: "c6", status: "pending", created_at: "" },
    { id: "m6", tournament_id: "t1", stage: "zone", zone_id: "z2", couple1_id: "c4", couple2_id: "c6", status: "pending", created_at: "" },
  ];

  const result = autoScheduleMatches(mockMatches, {
    courtCount: 2,
    courtNames: ["Cancha 1", "Cancha Central"],
    matchDurationMinutes: 40,
    startDate: "2026-10-25",
    startTime: "09:00",
  });

  assert(result.totalMatches === 6, "Total partidos programados debe ser 6");
  assert(result.assignments.length === 6, "Debe haber 6 asignaciones");
  assert(result.courtsUsed.length === 2, "Debe usar 2 canchas");
  assert(result.courtsUsed[1] === "Cancha Central", "Debe respetar nombre personalizado");

  // TEST 4: Validación crucial -> NINGUNA pareja debe jugar al mismo tiempo en el mismo slotIndex
  const slotCouplesMap = new Map<number, Set<string>>();
  for (const a of result.assignments) {
    const origMatch = mockMatches.find((m) => m.id === a.matchId)!;
    if (!slotCouplesMap.has(a.slotIndex)) {
      slotCouplesMap.set(a.slotIndex, new Set<string>());
    }
    const currentSlotCouples = slotCouplesMap.get(a.slotIndex)!;

    if (origMatch.couple1_id) {
      assert(!currentSlotCouples.has(origMatch.couple1_id), `Pareja ${origMatch.couple1_id} no debe jugar simultáneamente en slot ${a.slotIndex}`);
      currentSlotCouples.add(origMatch.couple1_id);
    }
    if (origMatch.couple2_id) {
      assert(!currentSlotCouples.has(origMatch.couple2_id), `Pareja ${origMatch.couple2_id} no debe jugar simultáneamente en slot ${a.slotIndex}`);
      currentSlotCouples.add(origMatch.couple2_id);
    }
  }

  // TEST 5: Prueba con torneo completo (Fase de Zonas + Playoffs)
  // Las semifinales y final deben tener horario posterior a las zonas
  const fullTournamentMatches: Match[] = [
    ...mockMatches,
    { id: "semi1", tournament_id: "t1", stage: "semi", match_number: 1, couple1_id: "c1", couple2_id: "c4", status: "pending", created_at: "" },
    { id: "semi2", tournament_id: "t1", stage: "semi", match_number: 2, couple1_id: "c2", couple2_id: "c5", status: "pending", created_at: "" },
    { id: "final1", tournament_id: "t1", stage: "final", match_number: 3, couple1_id: null, couple2_id: null, status: "pending", created_at: "" },
  ];

  const fullResult = autoScheduleMatches(fullTournamentMatches, {
    courtCount: 3,
    matchDurationMinutes: 45,
    startDate: "2026-11-01",
    startTime: "10:00",
  });

  assert(fullResult.totalMatches === 9, "Debe programar los 9 partidos");
  const semi1Assignment = fullResult.assignments.find((a) => a.matchId === "semi1")!;
  const semi2Assignment = fullResult.assignments.find((a) => a.matchId === "semi2")!;
  const finalAssignment = fullResult.assignments.find((a) => a.matchId === "final1")!;

  // Las semifinales no deben ocurrir antes de los partidos de zona
  const zoneAssignments = fullResult.assignments.filter((a) => a.matchId.startsWith("m"));
  const maxZoneSlot = Math.max(...zoneAssignments.map((a) => a.slotIndex));
  assert(semi1Assignment.slotIndex >= maxZoneSlot, "Semis deben jugarse después de terminar zonas");
  assert(semi2Assignment.slotIndex >= maxZoneSlot, "Semis deben jugarse después de terminar zonas");
  assert(finalAssignment.slotIndex > semi1Assignment.slotIndex, "La Final debe jugarse después de las semifinales");

  // TEST 6: Caso borde 1 sola cancha
  const singleCourtResult = autoScheduleMatches(mockMatches.slice(0, 3), {
    courtCount: 1,
    matchDurationMinutes: 30,
    startDate: "2026-10-25",
    startTime: "08:00",
  });
  assert(singleCourtResult.totalMatches === 3, "Debe programar 3 partidos en 1 cancha");
  assert(singleCourtResult.totalSlots === 3, "Con 1 cancha, 3 partidos requieren 3 slots");
  assert(singleCourtResult.assignments[0].courtName === "Cancha 1", "Debe ser Cancha 1");

  // TEST 7: Opción onlyUnscheduled
  const partiallyScheduled: Match[] = [
    { ...mockMatches[0], court_name: "Cancha Central", scheduled_time: "2026-10-25T08:00:00.000Z" },
    mockMatches[1],
    mockMatches[2],
  ];
  const unscheduledOnlyResult = autoScheduleMatches(partiallyScheduled, {
    courtCount: 2,
    matchDurationMinutes: 30,
    startDate: "2026-10-25",
    startTime: "09:00",
    onlyUnscheduled: true,
  });
  assert(unscheduledOnlyResult.totalMatches === 2, "Solo debe programar los 2 partidos pendientes");

  // TEST 8: Normalización de horarios
  const norm1 = normalizeScheduledTime("14:30", "2026-10-25");
  assert(norm1 !== null && norm1.includes("2026-10-25"), "Debe componer ISO válido con la fecha del torneo");
  const norm2 = normalizeScheduledTime("14:30 hs", "2026-10-25");
  assert(norm2 !== null && norm2.includes("2026-10-25"), "Debe manejar texto como 14:30 hs");
  const normEmpty = normalizeScheduledTime("");
  assert(normEmpty === null, "Debe ser null para vacío");

  return { passed, failed, errors };
}
