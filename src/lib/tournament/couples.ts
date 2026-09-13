/**
 * Módulo de validación y reglas para la formación de parejas (Couples) en Saladillo Padel Tour (SPT).
 * 
 * Regla de negocio crítica:
 * - En la generación de parejas: cada jugador no podrá integrar más de una pareja en el mismo torneo.
 * - El jugador que ya integra una pareja no se verá en la lista de jugadores disponibles para formar parejas.
 */

import type { Couple, Player } from "@/types/tournament";

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
 * 
 * @param allPlayers Lista completa de jugadores registrados en el sistema
 * @param couples Lista de parejas registradas
 * @param tournamentId ID del torneo seleccionado
 * @param excludeCoupleId Opcional: ID de la pareja que se está editando
 * @param excludePlayerId Opcional: ID del jugador ya elegido (Jugador 1 o Jugador 2)
 */
export function getAvailablePlayersForTournament(
  allPlayers: Player[],
  couples: Couple[],
  tournamentId: string,
  excludeCoupleId?: string | null,
  excludePlayerId?: string | null
): Player[] {
  if (!tournamentId) return [];

  const assigned = getAssignedPlayerIdsInTournament(couples, tournamentId, excludeCoupleId);

  return allPlayers.filter((player) => {
    // Si ya integra una pareja en este torneo, no está disponible
    if (assigned.has(player.id)) return false;
    // Si ya fue seleccionado como el compañero en la misma pareja, no está disponible
    if (excludePlayerId && player.id === excludePlayerId) return false;
    return true;
  });
}

/**
 * Valida si la formación o edición de una pareja cumple con todas las reglas de negocio:
 * 1. Torneo seleccionado.
 * 2. Ambos jugadores seleccionados.
 * 3. Jugadores diferentes (no puede ser la misma persona).
 * 4. Ninguno de los dos jugadores puede integrar ya otra pareja en el mismo torneo.
 */
export function validateCoupleFormation(
  tournamentId: string,
  player1Id: string,
  player2Id: string,
  couples: Couple[],
  excludeCoupleId?: string | null
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

  return { isValid: true };
}
