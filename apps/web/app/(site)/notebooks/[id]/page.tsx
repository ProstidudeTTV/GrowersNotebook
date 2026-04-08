import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotebookDetailClient } from "@/components/notebook-detail-client";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { isUuid } from "@/lib/is-uuid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Notebook" };
  try {
    const n = await apiFetch<{
      title: string;
      customStrainLabel: string | null;
      strain: { name: string | null } | null;
    }>(`/notebooks/${id}`, { timeoutMs: 8000 });
    const strain =
      n.strain?.name?.trim() || n.customStrainLabel?.trim() || "";
    return {
      title: `${n.title}${strain ? ` · ${strain}` : ""} · ${SITE_NAME}`,
      alternates: { canonical: canonicalPath(`/notebooks/${id}`) },
    };
  } catch {
    return { title: "Notebook" };
  }
}

export default async function NotebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  let data: NotebookDetailPayload;
  try {
    data = await apiFetch<NotebookDetailPayload>(`/notebooks/${id}`, {
      token: token ?? undefined,
      timeoutMs: 12_000,
    });
  } catch {
    notFound();
  }

  return <NotebookDetailClient initial={data} />;
}
