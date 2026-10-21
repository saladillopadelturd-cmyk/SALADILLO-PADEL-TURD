import type { Metadata } from "next";
import TournamentDetailView from "@/components/tournament/TournamentDetailView";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: tour } = await supabase
      .from("tournaments")
      .select("name, category, gender")
      .eq("id", id)
      .maybeSingle();

    if (tour) {
      const title = `${tour.name} (${tour.category}${tour.gender ? ` - ${tour.gender}` : ""})`;
      return {
        title,
        alternates: {
          canonical: `/torneos/${id}`,
        },
      };
    }
  } catch {}

  return {
    title: "Torneo Oficial de Pádel",
    alternates: {
      canonical: `/torneos/${id}`,
    },
  };
}

export default async function TorneoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  return <TournamentDetailView id={id} initialTab={resolvedSearchParams?.tab} />;
}
