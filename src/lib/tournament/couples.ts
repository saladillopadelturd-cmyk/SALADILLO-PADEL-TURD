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
 * Valida si un jugador es elegible para participar en un torneo específico según las reglas de Saladillo Padel Tour:
 * 
 * 1. Torneos Femeninos:
 *    - Solo pueden inscribirse jugadoras Femeninas.
 *    - No se permite que una jugadora se anote en un torneo de categoría inferior (ej: jugadora de 5ta en torneo femenino de 6ta -> RECHAZADA).
 * 
 * 2. Torneos Masculinos:
 *    - Jugadores Masculinos: No pueden anotarse en un torneo de categoría inferior (ej: hombre de 5ta en torneo de 6ta -> RECHAZADO).
 *    - Jugadoras Femeninas: Se permite una bonificación reglamentaria de HASTA UNA CATEGORÍA SUPERIOR a la del torneo.
 *      (Ejemplo: en un torneo Masculino de 6ta categoría pueden inscribirse mujeres de 5ta categoría. Mujeres de 4ta o superior -> RECHAZADAS).
 */
export function isPlayerEligibleForTournament(
  player: Player,
  tournament: Tournament
): { eligible: boolean; reason?: string } {
  const tourGender = (tournament.gender || "Masculino").toLowerCase();
  const playerGender = (player.gender || "Masculino").toLowerCase();
  const isTourFemale = tourGender === "femenino";
  const isPlayerFemale = playerGender === "femenino";

  const tourLevel = parseCategoryLevel(tournament.category);
  const playerLevel = parseCategoryLevel(player.category);

  // 1. Torneo Femenino
  if (isTourFemale) {
    if (!isPlayerFemale) {
      return {
        eligible: false,
        reason: `El torneo es Femenino. No se permiten jugadores masculinos (${player.first_name} ${player.last_name}).`,
      };
    }

    // En torneo femenino, una jugadora de categoría superior (ej: 5ta, nivel 5) no puede jugar en torneo inferior (ej: 6ta, nivel 6)
    if (playerLevel < tourLevel) {
      return {
        eligible: false,
        reason: `La jugadora ${player.first_name} ${player.last_name} es de ${player.category || "categoría superior"} y no puede anotarse en un torneo de categoría inferior (${tournament.category || "6ta"}).`,
      };
    }

    return { eligible: true };
  }

  // 2. Torneo Masculino
  if (isPlayerFemale) {
    // Regla especial: Mujeres pueden tener hasta una categoría superior a la del torneo
    // Ejemplo: Torneo 6ta (nivel 6) -> Se permiten mujeres de 5ta (nivel 5) o inferiores (6ta, 7ma, 8va).
    const maxAllowedFemaleLevel = tourLevel - 1; // 6 - 1 = 5 (nivel 5 = 5ta)
    if (playerLevel < maxAllowedFemaleLevel) {
      return {
        eligible: false,
        reason: `La jugadora ${player.first_name} ${player.last_name} es de ${player.category || "4ta"} y supera el límite para un torneo Masculino de ${tournament.category || "6ta"} (máximo permitido: mujeres hasta ${maxAllowedFemaleLevel}ta categoría).`,
      };
    }
    return { eligible: true };
  }

  // Jugador Masculino en Torneo Masculino:
  // No permitir que un jugador se anote en un torneo de una categoría inferior (playerLevel < tourLevel es superior)
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

  return allPlayers.filter((player) => {
    // Si ya integra una pareja en este torneo, no está disponible
    if (assigned.has(player.id)) return false;
    // Si ya fue seleccionado como el compañero en la misma pareja, no está disponible
    if (excludePlayerId && player.id === excludePlayerId) return false;
    // Si se requiere filtrado estricto por elegibilidad de torneo
    if (tournament && filterByEligibility) {
      const { eligible } = isPlayerEligibleForTournament(player, tournament);
      if (!eligible) return false;
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
 * Empareja de a dos en dos y asigna la numeración secuencial correlativa ("Pareja 1", "Pareja 2", etc.).
 */
export function generateRandomCouples(
  availablePlayers: Player[],
  tournamentId: string,
  startingNumber = 1
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
  const shuffled = [...availablePlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const result = [];
  let currentNum = startingNumber;

  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];
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

