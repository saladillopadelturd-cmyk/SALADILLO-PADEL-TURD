import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

  const { data: pairs } = await supabase
    .from("pairs")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (!pairs || pairs.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 parejas" },
      { status: 400 }
    );
  }

  const shuffledPairs = shuffleArray(pairs);
  const { zone_size, num_zones } = tournament;

  const zonesToCreate = [];
  const pairsToUpdate = [];

  for (let i = 0; i < num_zones; i++) {
    zonesToCreate.push({
      tournament_id: tournamentId,
      name: `Zona ${String.fromCharCode(65 + i)}`,
      zone_number: i + 1,
    });
  }

  const { data: createdZones, error: zoneError } = await supabase
    .from("zones")
    .insert(zonesToCreate)
    .select();

  if (zoneError) {
    return NextResponse.json({ error: zoneError.message }, { status: 500 });
  }

  for (let i = 0; i < shuffledPairs.length; i++) {
    const zoneIndex = i % num_zones;
    pairsToUpdate.push({
      id: shuffledPairs[i].id,
      zone_id: createdZones[zoneIndex].id,
    });
  }

  for (const update of pairsToUpdate) {
    await supabase
      .from("pairs")
      .update({ zone_id: update.zone_id })
      .eq("id", update.id);
  }

  return NextResponse.json({
    success: true,
    zones: createdZones,
    assignedPairs: pairsToUpdate.length,
  });
}
