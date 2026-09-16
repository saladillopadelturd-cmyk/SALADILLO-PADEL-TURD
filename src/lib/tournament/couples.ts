/**
 * Módulo de validación y reglas para la formación de parejas (Couples) en Saladillo Padel Tour (SPT).
 * 
 * Regla de negocio crítica:
 * - En la generación de parejas: cada jugador no podrá integrar más de una pareja en el mismo torneo.
 * - El jugador que ya integra una pareja no se verá en la lista de jugadores disponibles para formar parejas.
 */

import type { Couple, Player, Tournament } from "@/types/tournament";

/**
 * Convierte una categoría a su nivel numérico estándar de pádel:
 * 1ra = 1 (mayor nivel deportivo / profesional)
 * 2da = 2
 * 3ra = 3
 * 4ta = 4
 * 5ta = 5 (mejor que 6ta)
 * 6ta = 6
 * 7ma = 7
 * 8va = 8 (menor nivel deportivo / principiantes)
 * 
 * Regla clave: Un número menor indica un nivel de juego superior (5ta < 6ta en valor numérico, pero mejor en nivel).
 */
export function parseCategoryLevel(category?: string | null): number {
  if (!category) return 5; // Valor por defecto: 5ta
  const match = category.match(/\b([1-8])(?:ra|da|ta|ma|va)?\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 5;
}

/**
 * Determina si la categoría de un torneo corresponde al formato "SUMA" (ej: "Suma 10", "SUMA 11", "Suma 8").
 */
export function isSumaCategory(category?: string | null): boolean {
  if (!category) return false;
  return /suma\s*\d+/i.test(category);
}

/**
 * Extrae el valor numérico objetivo de un torneo SUMA (ej: "Suma 10" -> 10, "Suma 8" -> 8).
 * Retorna null si no es un formato SUMA.
 */
export function parseSumaTarget(category?: string | null): number | null {
  if (!category) return null;
  const match = category.match(/suma\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Calcula el nivel numérico efectivo de un jugador para un torneo específico,
 * aplicando las bonificaciones reglamentarias de género (ej: mujeres en torneos masculinos).
 * 
 * Regla oficial SPT:
 * - En torneos Femeninos: nivel directo del jugador (1 a 8).
 * - En torneos Masculinos:
 *   - Jugadores masculinos: nivel directo (1 a 8).
 *   - Jugadoras femeninas: bonificación de +1 en su categoría (ej: mujer de 5ta computa como nivel 6).
 */
export function getEffectivePlayerLevelForTournament(
  player: Player,
  tournament: Tournament
): number {
  const baseLevel = parseCategoryLevel(player.category);
  const tourGender = (tournament.gender || "Masculino").toLowerCase();
  const playerGender = (player.gender || "Masculino").toLowerCase();

  // En torneo masculino, si el jugador es mujer tiene bonificación de +1 en el cómputo
  if (tourGender === "masculino" && playerGender === "femenino") {
    return baseLevel + 1;
  }

  return baseLevel;
}

/**
 * Valida si una dupla de jugadores cumple la condición de suma en un torneo formato "SUMA".
 * 
 * En pádel federado:
 * - Un torneo "Suma 10" establece el techo de nivel deportivo: la suma de categorías debe ser >= 10.
 * - Una pareja 5ta + 5ta suma 10 (Válido).
 * - Una pareja 4ta + 6ta suma 10 (Válido).
 * - Una pareja 5ta + 6ta suma 11 (Válido: menor nivel deportivo, no genera ventaja ilícita).
 * - Una pareja 4ta + 5ta suma 9 (Rechazada: supera el nivel permitido por tener suma menor).
 */
export function validateCoupleCategorySuma(
  player1: Player,
  player2: Player,
  tournament: Tournament
): { isValid: boolean; error?: string; sum: number; target: number } {
  const target = parseSumaTarget(tournament.category);
  if (target === null) {
    return { isValid: true, sum: 0, target: 0 };
  }

  const tourGender = (tournament.gender || "Masculino").toLowerCase();
  const p1Gender = (player1.gender || "Masculino").toLowerCase();
  const p2Gender = (player2.gender || "Masculino").toLowerCase();

  // En torneo femenino, ambos deben ser de sexo femenino
  if (tourGender === "femenino") {
    if (p1Gender !== "femenino") {
      return {
        isValid: false,
        error: `El torneo es Femenino. El Jugador 1 (${player1.first_name} ${player1.last_name}) es masculino.`,
        sum: 0,
        target,
      };
    }
    if (p2Gender !== "femenino") {
      return {
        isValid: false,
        error: `El torneo es Femenino. El Jugador 2 (${player2.first_name} ${player2.last_name}) es masculino.`,
        sum: 0,
        target,
      };
    }
  }

  const level1 = getEffectivePlayerLevelForTournament(player1, tournament);
  const level2 = getEffectivePlayerLevelForTournament(player2, tournament);
  const sum = level1 + level2;

  if (sum < target) {
    const p1Desc = `${player1.first_name} ${player1.last_name} (${player1.category || "5ta"}${
      tourGender === "masculino" && p1Gender === "femenino" ? " -> computa " + level1 : ""
    })`;
    const p2Desc = `${player2.first_name} ${player2.last_name} (${player2.category || "5ta"}${
      tourGender === "masculino" && p2Gender === "femenino" ? " -> computa " + level2 : ""
    })`;

    return {
      isValid: false,
      error: `La pareja suma ${sum} [${p1Desc} + ${p2Desc}] y supera el nivel permitido para un torneo Suma ${target} (la suma debe ser como mínimo ${target}).`,
      sum,
      target,
    };
  }

  return { isValid: true, sum, target };
}

/**
 * Valida si un jugador es elegible para participar en un torneo específico según las reglas de Saladillo Padel Tour:
 * 
 * 1. Torneos SUMA:
 *    - Si el torneo es Femenino, el jugador debe ser Femenino.
 *    - El jugador debe poder alcanzar la suma con algún compañero reglamentario (categoría hasta 8va).
 * 
 * 2. Torneos Tradicionales Femeninos:
 *    - Solo pueden inscribirse jugadoras Femeninas.
 *    - No se permite que una jugadora se anote en un torneo de categoría inferior.
 * 
 * 3. Torneos Tradicionales Masculinos:
 *    - Jugadores Masculinos: No pueden anotarse en un torneo de categoría inferior.
 *    - Jugadoras Femeninas: Se permite bonificación de HASTA UNA CATEGORÍA SUPERIOR al torneo.
 */
export function isPlayerEligibleForTournament(
  player: Player,
  tournament: Tournament
): { eligible: boolean; reason?: string } {
  const tourGender = (tournament.gender || "Masculino").toLowerCase();
  const playerGender = (player.gender || "Masculino").toLowerCase();
  const isTourFemale = tourGender === "femenino";
  const isPlayerFemale = playerGender === "femenino";

  // En torneo femenino, ningún hombre puede participar
  if (isTourFemale && !isPlayerFemale) {
    return {
      eligible: false,
      reason: `El torneo es Femenino. No se permiten jugadores masculinos (${player.first_name} ${player.last_name}).`,
    };
  }

  // 1. Torneo Formato SUMA
  if (isSumaCategory(tournament.category)) {
    const target = parseSumaTarget(tournament.category) ?? 10;
    const effectiveLevel = getEffectivePlayerLevelForTournament(player, tournament);
    
    // Nivel máximo posible para un compañero es 8va (8), o 9 si es mujer en torneo masculino
    const maxPartnerLevel = tourGender === "masculino" ? 9 : 8;
    if (effectiveLevel + maxPartnerLevel < target) {
      return {
        eligible: false,
        reason: `El jugador ${player.first_name} ${player.last_name} (${player.category || "1ra"}) no puede alcanzar la Suma ${target} ni siquiera acompañado por un jugador de menor categoría.`,
      };
    }

    return { eligible: true };
  }

  // 2. Torneo Tradicional (1ra a 8va)
  const tourLevel = parseCategoryLevel(tournament.category);
  const playerLevel = parseCategoryLevel(player.category);

  if (isTourFemale) {
    if (playerLevel < tourLevel) {
      return {
        eligible: false,
        reason: `La jugadora ${player.first_name} ${player.last_name} es de ${player.category || "categoría superior"} y no puede anotarse en un torneo de categoría inferior (${tournament.category || "6ta"}).`,
      };
    }
    return { eligible: true };
  }

  // Torneo Masculino Tradicional
  if (isPlayerFemale) {
    const maxAllowedFemaleLevel = tourLevel - 1; // 6 - 1 = 5 (nivel 5 = 5ta)
    if (playerLevel < maxAllowedFemaleLevel) {
      return {
        eligible: false,
        reason: `La jugadora ${player.first_name} ${player.last_name} es de ${player.category || "4ta"} y supera el límite para un torneo Masculino de ${tournament.category || "6ta"} (máximo permitido: mujeres hasta ${maxAllowedFemaleLevel}ta categoría).`,
      };
    }
    return { eligible: true };
  }

  if (playerLevel < tourLevel) {
    return {
      eligible: false,
      reason: `El jugador ${player.first_name} ${player.last_name} es de ${player.category || "categoría superior"} y no puede anotarse en un torneo de categoría inferior (${tournament.category || "6ta"}).`,
    };
  }

  return { eligible: true };
}

/**
 * Obtiene el conjunto de IDs de jugadores que ya forman parte de una pareja en un torneo específico.
 * @param couples Lista de parejas registradas
 * @param tournamentId ID del torneo
 * @param excludeCoupleId Opcional: ID de pareja a excluir (útil al editar una pareja existente)
 */
export function getAssignedPlayerIdsInTournament(
  couples: Couple[],
  tournamentId: string,
  excludeCoupleId?: string | null
): Set<string> {
  const assigned = new Set<string>();
  if (!tournamentId) return assigned;

  for (const couple of couples) {
    if (couple.tournament_id === tournamentId && (!excludeCoupleId || couple.id !== excludeCoupleId)) {
      if (couple.player1_id) assigned.add(couple.player1_id);
      if (couple.player2_id) assigned.add(couple.player2_id);
    }
  }

  return assigned;
}

/**
 * Obtiene la lista de jugadores disponibles para seleccionar en un torneo determinado.
 * Filtra a todos aquellos que ya integran una pareja en ese torneo y, opcionalmente,
 * al jugador seleccionado en la otra posición de la pareja para evitar auto-parejas.
 * Si se especifica el torneo y `filterByEligibility = true`, también descarta jugadores no elegibles.
 */
export function getAvailablePlayersForTournament(
  allPlayers: Player[],
  couples: Couple[],
  tournamentId: string,
  excludeCoupleId?: string | null,
  excludePlayerId?: string | null,
  tournament?: Tournament | null,
  filterByEligibility: boolean = false
): Player[] {
  if (!tournamentId) return [];

  const assigned = getAssignedPlayerIdsInTournament(couples, tournamentId, excludeCoupleId);
  const selectedPartner = excludePlayerId ? allPlayers.find((p) => p.id === excludePlayerId) : null;

  return allPlayers.filter((player) => {
    // Si ya integra una pareja en este torneo, no está disponible
    if (assigned.has(player.id)) return false;
    // Si ya fue seleccionado como el compañero en la misma pareja, no está disponible
    if (excludePlayerId && player.id === excludePlayerId) return false;

    // Si se requiere filtrado estricto por elegibilidad de torneo
    if (tournament && filterByEligibility) {
      const { eligible } = isPlayerEligibleForTournament(player, tournament);
      if (!eligible) return false;

      // Si es torneo SUMA y ya hay un compañero seleccionado, verificar compatibilidad de suma
      if (selectedPartner && isSumaCategory(tournament.category)) {
        const sumaCheck = validateCoupleCategorySuma(selectedPartner, player, tournament);
        if (!sumaCheck.isValid) return false;
      }
    }
    return true;
  });
}

/**
 * Valida si la formación o edición de una pareja cumple con todas las reglas de negocio:
 * 1. Torneo seleccionado.
 * 2. Ambos jugadores seleccionados.
 * 3. Jugadores diferentes (no puede ser la misma persona).
 * 4. Ninguno de los dos jugadores puede integrar ya otra pareja en el mismo torneo.
 * 5. Ambos jugadores deben ser elegibles para el torneo por Género y Categoría.
 * 6. En torneos SUMA, la pareja debe cumplir con la suma de categorías mínima estipulada.
 */
export function validateCoupleFormation(
  tournamentId: string,
  player1Id: string,
  player2Id: string,
  couples: Couple[],
  excludeCoupleId?: string | null,
  tournament?: Tournament | null,
  allPlayers?: Player[]
): { isValid: boolean; error?: string } {
  if (!tournamentId || tournamentId.trim() === "") {
    return { isValid: false, error: "Debes seleccionar un torneo." };
  }

  if (!player1Id || !player2Id) {
    return { isValid: false, error: "Debes seleccionar ambos jugadores para formar la pareja." };
  }

  if (player1Id === player2Id) {
    return {
      isValid: false,
      error: "El Jugador 1 y el Jugador 2 deben ser personas distintas.",
    };
  }

  const assigned = getAssignedPlayerIdsInTournament(couples, tournamentId, excludeCoupleId);

  if (assigned.has(player1Id)) {
    return {
      isValid: false,
      error: "El Jugador 1 ya integra una pareja en este torneo. Un jugador no puede formar más de una pareja.",
    };
  }

  if (assigned.has(player2Id)) {
    return {
      isValid: false,
      error: "El Jugador 2 ya integra una pareja en este torneo. Un jugador no puede formar más de una pareja.",
    };
  }

  // 5. Validación de elegibilidad por género y categoría
  if (tournament && allPlayers && allPlayers.length > 0) {
    const p1 = allPlayers.find((p) => p.id === player1Id);
    const p2 = allPlayers.find((p) => p.id === player2Id);

    if (p1) {
      const el1 = isPlayerEligibleForTournament(p1, tournament);
      if (!el1.eligible) {
        return { isValid: false, error: el1.reason || "El Jugador 1 no cumple con los requisitos del torneo." };
      }
    }

    if (p2) {
      const el2 = isPlayerEligibleForTournament(p2, tournament);
      if (!el2.eligible) {
        return { isValid: false, error: el2.reason || "El Jugador 2 no cumple con los requisitos del torneo." };
      }
    }

    // 6. En torneos SUMA, validar la suma de la pareja
    if (p1 && p2 && isSumaCategory(tournament.category)) {
      const sumaCheck = validateCoupleCategorySuma(p1, p2, tournament);
      if (!sumaCheck.isValid) {
        return { isValid: false, error: sumaCheck.error || "La pareja no cumple con la suma de categorías requerida." };
      }
    }
  }

  return { isValid: true };
}

/**
 * Calcula un mapa asociativo de ID de pareja a su número correlativo dentro de su respectivo torneo.
 * Las parejas se ordenan cronológicamente (created_at ascendente), de modo que la primera registrada
 * es la "Pareja 1", la segunda la "Pareja 2", y así sucesivamente.
 * Si la pareja ya cuenta con `couple_number` guardado, se respeta dicho valor.
 */
export function getCoupleNumberMap(couples: Couple[]): Map<string, number> {
  const byTournament: Record<string, Couple[]> = {};
  for (const c of couples) {
    if (!c.tournament_id) continue;
    if (!byTournament[c.tournament_id]) byTournament[c.tournament_id] = [];
    byTournament[c.tournament_id].push(c);
  }

  const map = new Map<string, number>();
  for (const tCouples of Object.values(byTournament)) {
    const sorted = [...tCouples].sort((a, b) => {
      // Priorizar couple_number explícito si existe
      if (a.couple_number != null && b.couple_number != null) {
        return a.couple_number - b.couple_number;
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    sorted.forEach((c, idx) => {
      map.set(c.id, c.couple_number ?? (idx + 1));
    });
  }

  return map;
}

/**
 * Abreviatura reglamentaria de jugador para SPT:
 * Primer letra del nombre seguida de punto y el apellido (ej: "Matias Vidal" -> "M. Vidal").
 * Si no tiene apellido, retorna el nombre.
 */
export function formatPlayerShortName(player?: { first_name?: string | null; last_name?: string | null } | null): string {
  if (!player) return "Jugador";
  const firstName = player.first_name?.trim() || "";
  const lastName = player.last_name?.trim() || "";

  if (!firstName && !lastName) return "Jugador";
  if (!lastName) return firstName;
  if (!firstName) return lastName;

  const initial = firstName.charAt(0).toUpperCase();
  return `${initial}. ${lastName}`;
}

/**
 * Devuelve el nombre formateado de la pareja con su número correspondiente y nombres abreviados.
 * Ejemplo: "Pareja 1: M. Vidal / C. Gómez" o sin número "M. Vidal / C. Gómez".
 * 
 * @param couple Objeto pareja
 * @param coupleNumber Número correlativo opcional (ej: 1 para "Pareja 1")
 * @param useShortNames Si es true (por defecto), abrevia los nombres a "I. Apellido" (ej: "M. Vidal")
 */
export function getCoupleLabelWithNumber(
  couple?: Couple | null,
  coupleNumber?: number,
  useShortNames: boolean = true
): string {
  if (!couple) return "Por definir";
  const num = coupleNumber ?? couple.couple_number;
  const prefix = num ? `Pareja ${num}: ` : "Pareja: ";

  let p1: string;
  let p2: string;

  if (useShortNames) {
    p1 = couple.player1 ? formatPlayerShortName(couple.player1) : "Jugador 1";
    p2 = couple.player2 ? formatPlayerShortName(couple.player2) : "Jugador 2";
  } else {
    p1 = couple.player1 ? `${couple.player1.first_name} ${couple.player1.last_name}`.trim() : "Jugador 1";
    p2 = couple.player2 ? `${couple.player2.first_name} ${couple.player2.last_name}`.trim() : "Jugador 2";
  }

  return `${prefix}${p1} / ${p2}`;
}

/**
 * Devuelve únicamente los nombres abreviados de los jugadores de la pareja ("I. Apellido / I. Apellido").
 * Sin el prefijo "Pareja X:".
 * Ejemplo: "M. Vidal / A. Ruiz"
 */
export function getCouplePlayersShortLabel(couple?: Couple | null): string {
  if (!couple) return "Por definir";
  const p1 = couple.player1 ? formatPlayerShortName(couple.player1) : "Jugador 1";
  const p2 = couple.player2 ? formatPlayerShortName(couple.player2) : "Jugador 2";
  return `${p1} / ${p2}`;
}

/**
 * Genera parejas aleatorias a partir de una lista de jugadores disponibles para un torneo.
 * En torneos SUMA, realiza emparejamientos inteligentes que satisfagan la suma de categorías requerida.
 * Asigna la numeración secuencial correlativa ("Pareja 1", "Pareja 2", etc.).
 */
export function generateRandomCouples(
  availablePlayers: Player[],
  tournamentId: string,
  startingNumber = 1,
  tournament?: Tournament | null
): {
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  couple_number: number;
  player1: Player;
  player2: Player;
  label: string;
}[] {
  if (!tournamentId || availablePlayers.length < 2) return [];

  // Mezclar jugadores con Fisher-Yates shuffle
  const pool = [...availablePlayers];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const result = [];
  let currentNum = startingNumber;

  // Si es torneo SUMA, emparejar inteligentemente de forma que cumplan con la suma y maximicen parejas válidas
  if (tournament && isSumaCategory(tournament.category)) {
    let bestPairs: [Player, Player][] = [];
    const maxPossiblePairs = Math.floor(availablePlayers.length / 2);

    for (let attempt = 0; attempt < 100; attempt++) {
      const trialPool = [...availablePlayers];
      // Shuffle aleatorio
      for (let i = trialPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trialPool[i], trialPool[j]] = [trialPool[j], trialPool[i]];
      }

      // Ordenar por nivel (los jugadores más avanzados primero para asegurarles compañero compatible)
      trialPool.sort((a, b) => {
        const la = getEffectivePlayerLevelForTournament(a, tournament);
        const lb = getEffectivePlayerLevelForTournament(b, tournament);
        return la - lb;
      });

      const trialMatched = new Set<string>();
      const trialPairs: [Player, Player][] = [];

      for (let i = 0; i < trialPool.length; i++) {
        const p1 = trialPool[i];
        if (trialMatched.has(p1.id)) continue;

        const validCandidates: number[] = [];
        for (let j = i + 1; j < trialPool.length; j++) {
          const p2 = trialPool[j];
          if (trialMatched.has(p2.id)) continue;
          if (validateCoupleCategorySuma(p1, p2, tournament).isValid) {
            validCandidates.push(j);
          }
        }

        if (validCandidates.length > 0) {
          const chosenIdx = validCandidates[Math.floor(Math.random() * validCandidates.length)];
          const p2 = trialPool[chosenIdx];
          trialMatched.add(p1.id);
          trialMatched.add(p2.id);
          trialPairs.push([p1, p2]);
        }
      }

      if (trialPairs.length > bestPairs.length) {
        bestPairs = trialPairs;
      }
      if (bestPairs.length === maxPossiblePairs) {
        break;
      }
    }

    // Mezclar el orden de las parejas sorteadas para asignar números correlativos imparciales
    for (let i = bestPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bestPairs[i], bestPairs[j]] = [bestPairs[j], bestPairs[i]];
    }

    for (const [p1, p2] of bestPairs) {
      const num = currentNum++;
      const p1Short = formatPlayerShortName(p1);
      const p2Short = formatPlayerShortName(p2);
      result.push({
        tournament_id: tournamentId,
        player1_id: p1.id,
        player2_id: p2.id,
        couple_number: num,
        player1: p1,
        player2: p2,
        label: `Pareja ${num}: ${p1Short} / ${p2Short}`,
      });
    }

    return result;
  }

  // Torneos tradicionales: emparejamiento directo 2 en 2
  for (let i = 0; i + 1 < pool.length; i += 2) {
    const p1 = pool[i];
    const p2 = pool[i + 1];
    const num = currentNum++;
    const p1Short = formatPlayerShortName(p1);
    const p2Short = formatPlayerShortName(p2);
    result.push({
      tournament_id: tournamentId,
      player1_id: p1.id,
      player2_id: p2.id,
      couple_number: num,
      player1: p1,
      player2: p2,
      label: `Pareja ${num}: ${p1Short} / ${p2Short}`,
    });
  }

  return result;
}

