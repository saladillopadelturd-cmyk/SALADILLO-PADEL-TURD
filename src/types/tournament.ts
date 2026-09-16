export type GameMode =
  | "round_robin_diff"
  | "american_9games"
  | "american_2sets";

export type TournamentStatus =
  | "draft"
  | "zones"
  | "playoffs"
  | "finished"
  | "registration"
  | "active"
  | "completed"
  | "cancelled";

export type MatchStage =
  | "zone"
  | "round_of_16"
  | "quarter"
  | "semi"
  | "final"
  | "third_place";

export type MatchRound = MatchStage | "octavos" | "cuartos" | "semifinal" | "tercer_puesto";

export type MatchStatus = "pending" | "in_progress" | "completed" | "scheduled";

export interface Tournament {
  id: string;
  name: string;
  date: string;
  category: string;
  status: TournamentStatus;
  game_mode: GameMode;
  zone_size: number;
  num_zones: number;
  golden_point: boolean;
  location?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Zone {
  id: string;
  tournament_id: string;
  name: string;
  zone_number: number;
  created_at: string;
}

export type PlayerGender = "Masculino" | "Femenino";

export interface Player {
  id: string;
  user_id?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  gender?: PlayerGender | string | null;
  category?: string | null;
  is_observed?: boolean | null;
  created_at: string;
}

export interface Couple {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  couple_number?: number | null;
  seed?: number | null;
  created_at: string;
  player1?: Player;
  player2?: Player;
  zone_id?: string | null; // For UI or denormalized display
}

// Alias for Pair for backward compatibility
export type Pair = Couple;

export interface ZoneCouple {
  id: string;
  zone_id: string;
  couple_id: string;
  created_at: string;
  couple?: Couple;
  zone?: Zone;
}

export interface Match {
  id: string;
  tournament_id: string;
  stage: MatchStage;
  zone_id?: string | null;
  couple1_id?: string | null;
  couple2_id?: string | null;
  court_name?: string | null;
  scheduled_time?: string | null;
  score_set1?: string | null;
  score_set2?: string | null;
  score_super_tb?: string | null;
  winner_couple_id?: string | null;
  status: MatchStatus;
  match_number?: number;
  created_at: string;
  updated_at?: string;

  // Relations & backward-compat
  couple1?: Couple;
  couple2?: Couple;
  winner_couple?: Couple;
  pair1?: Couple;
  pair2?: Couple;
  pair1_id?: string;
  pair2_id?: string;
  court?: string | null;
  scheduled_at?: string | null;
  round?: MatchRound;
  winner_id?: string | null;
  score_pair1?: ScoreData | null;
  score_pair2?: ScoreData | null;
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
  couple_id?: string;
  pair_id?: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  sets_won?: number;
  sets_lost?: number;
  games_won?: number;
  games_lost?: number;
  points: number;
  position?: number | null;
  couple?: Couple;
  pair?: Couple;
}

export interface Ranking {
  id: string;
  ranking_type: "individual" | "couple";
  player_id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  couple_key?: string | null;
  category: string;
  points: number;
  tournaments_played: number;
  matches_won: number;
  matches_lost: number;
  updated_at: string;
  player?: Player;
  player1?: Player;
  player2?: Player;
}

export interface TournamentRanking {
  id: string;
  tournament_id: string;
  pair_id?: string | null;
  player_id: string;
  points_earned: number;
  final_position?: number | null;
  player?: Player;
  pair?: Couple;
}

export interface GlobalRanking {
  id: string;
  player_id: string;
  total_points: number;
  tournaments_played: number;
  updated_at: string;
  player?: Player;
}
