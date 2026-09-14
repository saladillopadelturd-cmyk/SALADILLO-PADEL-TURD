import { redirect } from "next/navigation";

export default async function TorneosZonasRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/torneo/${id}`);
}
