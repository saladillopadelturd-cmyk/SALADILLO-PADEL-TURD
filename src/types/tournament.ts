export type GameMode =
  | "round_robin_diff"
  | "american_9games"
  | "american_2sets";

export type TournamentStatus =
  | "draft"
  | "registration"
  | "active"
  | "completed"
  | "cancelled";

export type MatchRound =
  | "zones"
  | "octavos"
  | "cuartos"
  | "semifinal"
  | "final"
  | "tercer_puesto";

export type MatchStatus = "pending" | "scheduled" | "in_progress" | "completed";

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string | null;
  game_mode: GameMode;
  zone_size: number;
  num_zones: number;
  status: TournamentStatus;
  created_by: string | null;
  created_at: string;
}

export interface Zone {
  id: string;
  tournament_id: string;
  name: string;
  zone_number: number;
  created_at: string;
}

export interface Pair {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  zone_id: string | null;
  seed: number | null;
  created_at: string;
  player1?: Player;
  player2?: Player;
}

export interface Player {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  zone_id: string | null;
  round: MatchRound;
  match_number: number;
  pair1_id: string;
  pair2_id: string;
  winner_id: string | null;
  score_pair1: ScoreData | null;
  score_pair2: ScoreData | null;
  court: string | null;
  scheduled_at: string | null;
  status: MatchStatus;
  created_at: string;
  pair1?: Pair;
  pair2?: Pair;
}

export interface ScoreData {
  sets: number[];
  games_won: number;
  games_lost: number;
  tiebreak?: number[];
}

export interface ZoneStanding {
  id: string;
  zone_id: string;
  pair_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  points: number;
  position: number | null;
  pair?: Pair;
}

export interface TournamentRanking {
  id: string;
  tournament_id: string;
  pair_id: string | null;
  player_id: string;
  points_earned: number;
  final_position: number | null;
  player?: Player;
  pair?: Pair;
}

export interface GlobalRanking {
  id: string;
  player_id: string;
  total_points: number;
  tournaments_played: number;
  updated_at: string;
  player?: Player;
}
