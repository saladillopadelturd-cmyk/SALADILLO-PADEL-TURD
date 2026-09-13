import TournamentDetailView from "@/components/tournament/TournamentDetailView";

export default async function TorneoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TournamentDetailView id={id} />;
}
