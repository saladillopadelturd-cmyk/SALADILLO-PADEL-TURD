import { redirect } from "next/navigation";

export default async function AdminTorneoFixturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/torneos/${id}?tab=fixture`);
}
