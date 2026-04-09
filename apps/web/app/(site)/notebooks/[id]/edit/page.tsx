import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/is-uuid";

export default async function NotebookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  redirect(`/notebooks/${id}?setup=1`);
}
