import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StrainDetailBody,
  type StrainDetailJson,
} from "@/components/catalog/strain-detail-body";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const safe = slug?.trim();
  if (!safe) return { title: "Strain" };
  try {
    const data = await apiFetch<StrainDetailJson>(
      `/strains/${encodeURIComponent(safe)}?reviewsPage=1&reviewsPageSize=1`,
      { timeoutMs: 10_000 },
    );
    const s = data.strain;
    const title = s.name?.trim() || safe;
    const desc =
      s.description?.trim() ||
      `${title} — strain reference on ${SITE_NAME}.`;
    return {
      title,
      description: desc,
      openGraph: {
        title: `${title} · ${SITE_NAME}`,
        description: desc,
        url: canonicalPath(`/strains/${safe}`),
      },
      alternates: { canonical: canonicalPath(`/strains/${safe}`) },
    };
  } catch {
    return { title: "Strain" };
  }
}

export default async function StrainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewsPage?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const safe = slug?.trim();
  if (!safe) notFound();

  return (
    <StrainDetailBody
      slug={safe}
      reviewsPage={reviewsPage}
      variant="page"
    />
  );
}
