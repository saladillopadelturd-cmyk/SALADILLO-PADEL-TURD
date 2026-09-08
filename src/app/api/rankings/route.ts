import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOURNAMENT_POINTS: Record<number, number> = {
  1: 100,
  2: 70,
  3: 50,
  4: 40,
  5: 30,
  6: 20,
  7: 15,
  8: 10,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { tournamentId } = await request.json();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const { data: completedMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "completed")
    .eq("round", "final");

  if (!completedMatches || completedMatches.length === 0) {
    return NextResponse.json(
      { error: "El torneo aún no tiene final completada" },
      { status: 400 }
    );
  }

  const finalMatch = completedMatches[0];
  const championId = finalMatch.winner_id;
  const runnerUpId =
    finalMatch.winner_id === finalMatch.pair1_id
      ? finalMatch.pair2_id
      : finalMatch.pair1_id;

  const { data: existingRankings } = await supabase
    .from("tournament_rankings")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (existingRankings && existingRankings.length > 0) {
    return NextResponse.json({
      success: true,
      message: "Rankings ya calculados",
    });
  }

  const rankings = [];

  if (championId) {
    const { data: championPairs } = await supabase
      .from("pairs")
      .select("player1_id, player2_id")
      .eq("id", championId)
      .single();

    if (championPairs) {
      for (const playerId of [
        championPairs.player1_id,
        championPairs.player2_id,
      ]) {
        rankings.push({
          tournament_id: tournamentId,
          pair_id: championId,
          player_id: playerId,
          points_earned: TOURNAMENT_POINTS[1] ?? 100,
          final_position: 1,
        });
      }
    }
  }

  if (runnerUpId) {
    const { data: runnerUpPairs } = await supabase
      .from("pairs")
      .select("player1_id, player2_id")
      .eq("id", runnerUpId)
      .single();

    if (runnerUpPairs) {
      for (const playerId of [
        runnerUpPairs.player1_id,
        runnerUpPairs.player2_id,
      ]) {
        rankings.push({
          tournament_id: tournamentId,
          pair_id: runnerUpId,
          player_id: playerId,
          points_earned: TOURNAMENT_POINTS[2] ?? 70,
          final_position: 2,
        });
      }
    }
  }

  if (rankings.length > 0) {
    await supabase.from("tournament_rankings").insert(rankings);

    for (const ranking of rankings) {
      const { data: existingGlobal } = await supabase
        .from("global_rankings")
        .select("*")
        .eq("player_id", ranking.player_id)
        .single();

      if (existingGlobal) {
        await supabase
          .from("global_rankings")
          .update({
            total_points: existingGlobal.total_points + ranking.points_earned,
            tournaments_played: existingGlobal.tournaments_played + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("player_id", ranking.player_id);
      } else {
        await supabase.from("global_rankings").insert({
          player_id: ranking.player_id,
          total_points: ranking.points_earned,
          tournaments_played: 1,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    rankingsCreated: rankings.length,
  });
}
