import { redirect } from "next/navigation";

export default async function LegacyClassGradesPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/professor/turmas/${id}?tab=notas`);
}
