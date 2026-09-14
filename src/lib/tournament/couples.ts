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
 * Devuelve el nombre formateado de la pareja con su número correspondiente.
 * Ejemplo: "Pareja 1: Juan Pérez / Carlos Gómez"
 */
export function getCoupleLabelWithNumber(couple?: Couple | null, coupleNumber?: number): string {
  if (!couple) return "Por definir";
  const num = coupleNumber ?? couple.couple_number;
  const prefix = num ? `Pareja ${num}: ` : "Pareja: ";
  const p1 = couple.player1 ? `${couple.player1.first_name} ${couple.player1.last_name}`.trim() : "Jugador 1";
  const p2 = couple.player2 ? `${couple.player2.first_name} ${couple.player2.last_name}`.trim() : "Jugador 2";
  return `${prefix}${p1} / ${p2}`;
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
    result.push({
      tournament_id: tournamentId,
      player1_id: p1.id,
      player2_id: p2.id,
      couple_number: num,
      player1: p1,
      player2: p2,
      label: `Pareja ${num}: ${p1.first_name} ${p1.last_name} / ${p2.first_name} ${p2.last_name}`,
    });
  }

  return result;
}

