import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BreederDetailBody,
  type BreederDetailJson,
} from "@/components/catalog/breeder-detail-body";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const safe = slug?.trim();
  if (!safe) return { title: "Breeder" };
  try {
    const data = await apiFetch<BreederDetailJson>(
      `/breeders/${encodeURIComponent(safe)}?reviewsPage=1&reviewsPageSize=1`,
      { timeoutMs: 10_000 },
    );
    const b = data.breeder;
    const title = b.name?.trim() || safe;
    const desc =
      b.description?.trim() ||
      `${title} — breeder on ${SITE_NAME}.`;
    return {
      title,
      description: desc,
      openGraph: {
        title: `${title} · ${SITE_NAME}`,
        description: desc,
        url: canonicalPath(`/breeders/${safe}`),
      },
      alternates: { canonical: canonicalPath(`/breeders/${safe}`) },
    };
  } catch {
    return { title: "Breeder" };
  }
}

export default async function BreederDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewsPage?: string; strainReviewsPage?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const strainReviewsPage = Number(sp.strainReviewsPage ?? 1) || 1;
  const safe = slug?.trim();
  if (!safe) notFound();

  return (
    <BreederDetailBody
      slug={safe}
      reviewsPage={reviewsPage}
      strainReviewsPage={strainReviewsPage}
      variant="page"
    />
  );
}
