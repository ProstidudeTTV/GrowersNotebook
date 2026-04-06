import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogReviewForm } from "@/components/catalog/catalog-review-form";
import { StarDisplay } from "@/components/catalog/star-display";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type DetailJson = {
  breeder: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    website: string | null;
    country: string | null;
    avgRating: string | null;
    reviewCount: number;
  };
  reviews: {
    items: Array<{
      id: string;
      rating: string;
      body: string;
      createdAt: string;
      author: { id: string; displayName: string | null };
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
  viewerReview: {
    id: string;
    rating: string;
    body: string;
    hidden: boolean;
  } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const safe = slug?.trim();
  if (!safe) return { title: "Breeder" };
  try {
    const data = await apiFetch<DetailJson>(
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
  searchParams: Promise<{ reviewsPage?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const reviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const safe = slug?.trim();
  if (!safe) notFound();

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let data: DetailJson;
  try {
    const qs = new URLSearchParams({
      reviewsPage: String(reviewsPage),
      reviewsPageSize: "15",
    });
    data = await apiFetch<DetailJson>(
      `/breeders/${encodeURIComponent(safe)}?${qs}`,
      { token: token ?? undefined, timeoutMs: 15_000 },
    );
  } catch {
    notFound();
  }

  const b = data.breeder;
  const hiddenNote =
    data.viewerReview?.hidden === true
      ? "Your review was removed by moderators."
      : null;

  const totalPages = Math.max(
    1,
    Math.ceil(data.reviews.total / data.reviews.pageSize),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm text-[var(--gn-text-muted)]">
        <Link href="/breeders" className="text-[#ff6a38] hover:underline">
          Breeders
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--gn-text)]">{b.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-[var(--gn-text)]">{b.name}</h1>
      <div className="mt-2">
        <StarDisplay avg={b.avgRating} count={b.reviewCount} />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--gn-text-muted)]">
        {b.country?.trim() ? <span>{b.country.trim()}</span> : null}
        {b.website?.trim() ? (
          <a
            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[#ff6a38] hover:underline"
          >
            Website
          </a>
        ) : null}
      </div>

      {b.description?.trim() ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
          {b.description.trim()}
        </p>
      ) : null}

      <p className="mt-6 text-sm">
        <Link
          href={`/strains?breederSlug=${encodeURIComponent(b.slug)}`}
          className="text-[#ff6a38] hover:underline"
        >
          Strains from this breeder
        </Link>
      </p>

      <section className="mt-10 border-t border-[var(--gn-divide)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Your review
        </h2>
        {hiddenNote ? (
          <p className="mt-2 text-sm text-amber-400">{hiddenNote}</p>
        ) : null}
        <div className="mt-3">
          <CatalogReviewForm
            entity="breeder"
            slug={b.slug}
            initialRating={
              data.viewerReview && !data.viewerReview.hidden
                ? data.viewerReview.rating
                : null
            }
            initialBody={
              data.viewerReview && !data.viewerReview.hidden
                ? data.viewerReview.body
                : null
            }
            disabled={!user}
            disabledMessage="Sign in to rate and review this breeder."
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Community reviews ({data.reviews.total})
        </h2>
        <ul className="mt-4 space-y-4">
          {data.reviews.items.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link
                  href={`/u/${r.author.id}`}
                  className="font-medium text-[#ff6a38] hover:underline"
                >
                  {r.author.displayName?.trim() || "Grower"}
                </Link>
                <StarDisplay avg={r.rating} />
              </div>
              {r.body?.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                  {r.body.trim()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center gap-4 text-sm">
            {reviewsPage > 1 ? (
              <Link
                href={`/breeders/${encodeURIComponent(b.slug)}?reviewsPage=${reviewsPage - 1}`}
                className="text-[#ff6a38] hover:underline"
              >
                Newer reviews
              </Link>
            ) : null}
            {reviewsPage < totalPages ? (
              <Link
                href={`/breeders/${encodeURIComponent(b.slug)}?reviewsPage=${reviewsPage + 1}`}
                className="text-[#ff6a38] hover:underline"
              >
                Older reviews
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
