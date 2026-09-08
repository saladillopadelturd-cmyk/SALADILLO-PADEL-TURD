import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateRoundRobinMatches(pairIds: string[]) {
  const matches = [];
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      matches.push({ pair1_id: pairIds[i], pair2_id: pairIds[j] });
    }
  }
  return matches;
}

function getNextPowerOf2(n: number) {
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

function getRoundNames(totalSlots: number) {
  const names = [];
  if (totalSlots >= 16) names.push("octavos");
  if (totalSlots >= 8) names.push("cuartos");
  names.push("semifinal");
  names.push("final");
  return names;
}

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

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (!zones || zones.length === 0) {
    return NextResponse.json(
      { error: "No hay zonas configuradas" },
      { status: 400 }
    );
  }

  let matchNumber = 1;
  const allMatches = [];

  for (const zone of zones) {
    const { data: zonePairs } = await supabase
      .from("pairs")
      .select("id")
      .eq("zone_id", zone.id);

    if (!zonePairs || zonePairs.length < 2) continue;

    const pairIds = zonePairs.map((p) => p.id);
    const roundRobinMatches = generateRoundRobinMatches(pairIds);

    for (const match of roundRobinMatches) {
      allMatches.push({
        tournament_id: tournamentId,
        zone_id: zone.id,
        round: "zones",
        match_number: matchNumber++,
        pair1_id: match.pair1_id,
        pair2_id: match.pair2_id,
        status: "pending",
      });
    }
  }

  if (allMatches.length > 0) {
    await supabase.from("matches").insert(allMatches);
  }

  return NextResponse.json({
    success: true,
    zoneMatches: allMatches.filter((m) => m.round === "zones").length,
  });
}
