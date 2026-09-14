import { redirect } from "next/navigation";

export default async function TorneosPlayoffsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/torneo/${id}`);
}
