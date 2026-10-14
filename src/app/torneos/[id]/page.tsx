import TournamentDetailView from "@/components/tournament/TournamentDetailView";

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
