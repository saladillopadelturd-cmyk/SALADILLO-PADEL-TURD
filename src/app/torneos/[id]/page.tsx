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
      .select("name, category, date, location, gender")
      .eq("id", id)
      .maybeSingle();

    if (tour) {
      const title = `${tour.name} (${tour.category}${tour.gender ? ` - ${tour.gender}` : ""})`;
      const description = `Consulta las zonas, fixture de partidos, llaves de playoffs y resultados en vivo del torneo ${tour.name} (${tour.category}) en Saladillo Padel Tour.`;

      return {
        title,
        description,
        openGraph: {
          title: `${title} | SPT Saladillo`,
          description,
          url: `/torneos/${id}`,
        },
        alternates: {
          canonical: `/torneos/${id}`,
        },
      };
    }
  } catch (err) {
    console.warn("Aviso generando metadatos de torneo:", err);
  }

  return {
    title: "Torneo Oficial de Pádel",
    description: "Detalle del torneo, partidos, llaves y posiciones en vivo en Saladillo Padel Tour.",
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
