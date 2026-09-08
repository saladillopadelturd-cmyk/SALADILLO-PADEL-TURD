import type { Match, ScoreData, ZoneStanding, Pair } from "@/types/tournament";

interface StandingInput {
  pairId: string;
  match: Match;
  score1: ScoreData;
  score2: ScoreData;
}

export function calculateRoundRobinStandings(
  matches: Match[],
  pairIds: string[]
): ZoneStanding[] {
  const standings: Record<
    string,
    {
      pairId: string;
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      setsWon: number;
      setsLost: number;
      gamesWon: number;
      gamesLost: number;
      points: number;
    }
  > = {};

  pairIds.forEach((id) => {
    standings[id] = {
      pairId: id,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
    };
  });

  matches
    .filter((m) => m.status === "completed" && m.score_pair1 && m.score_pair2)
    .forEach((match) => {
      const s1 = standings[match.pair1_id];
      const s2 = standings[match.pair2_id];
      if (!s1 || !s2) return;

      const score1 = match.score_pair1!;
      const score2 = match.score_pair2!;

      s1.matchesPlayed++;
      s2.matchesPlayed++;

      s1.gamesWon += score1.games_won;
      s1.gamesLost += score1.games_lost;
      s2.gamesWon += score2.games_won;
      s2.gamesLost += score2.games_lost;

      s1.setsWon += score1.sets?.filter((s, i) => s > (score2.sets?.[i] ?? 0)).length ?? 0;
      s1.setsLost += score2.sets?.filter((s, i) => s > (score1.sets?.[i] ?? 0)).length ?? 0;
      s2.setsWon += score2.sets?.filter((s, i) => s > (score1.sets?.[i] ?? 0)).length ?? 0;
      s2.setsLost += score1.sets?.filter((s, i) => s > (score2.sets?.[i] ?? 0)).length ?? 0;

      if (match.winner_id === match.pair1_id) {
        s1.matchesWon++;
        s1.points += 2;
        s2.matchesLost++;
      } else if (match.winner_id === match.pair2_id) {
        s2.matchesWon++;
        s2.points += 2;
        s1.matchesLost++;
      } else {
        s1.points += 1;
        s2.points += 1;
      }
    });

  const result = Object.values(standings).map((s) => ({
    ...s,
    gameDifference: s.gamesWon - s.gamesLost,
  }));

  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.gamesWon - a.gamesLost;
    const diffB = b.gamesWon - b.gamesLost;
    if (diffB !== diffA) return diffB - diffA;
    return b.gamesWon - a.gamesWon;
  });

  return result.map((s, i) => ({
    id: "",
    zone_id: "",
    pair_id: s.pairId,
    matches_played: s.matchesPlayed,
    matches_won: s.matchesWon,
    matches_lost: s.matchesLost,
    sets_won: s.setsWon,
    sets_lost: s.setsLost,
    games_won: s.gamesWon,
    games_lost: s.gamesLost,
    points: s.points,
    position: i + 1,
  }));
}

export function getQualifiedPairs(
  standings: ZoneStanding[],
  zoneSize: number
): ZoneStanding[] {
  const eliminateCount = zoneSize >= 4 ? 1 : 0;
  return standings.slice(0, standings.length - eliminateCount);
}
