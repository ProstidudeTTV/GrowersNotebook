import { notFound } from "next/navigation";
import { NotebookOwnerEdit } from "./notebook-owner-edit";
import { isUuid } from "@/lib/is-uuid";

export default async function NotebookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <NotebookOwnerEdit notebookId={id} />;
}
