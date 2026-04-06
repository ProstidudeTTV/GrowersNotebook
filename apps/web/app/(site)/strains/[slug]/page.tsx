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
  strain: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    effects: string[];
    effectsNotes: string | null;
    avgRating: string | null;
    reviewCount: number;
    breeder: { id: string; slug: string; name: string } | null;
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
  if (!safe) return { title: "Strain" };
  try {
    const data = await apiFetch<DetailJson>(
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
      `/strains/${encodeURIComponent(safe)}?${qs}`,
      { token: token ?? undefined, timeoutMs: 15_000 },
    );
  } catch {
    notFound();
  }

  const s = data.strain;
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
        <Link href="/strains" className="text-[#ff6a38] hover:underline">
          Strains
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--gn-text)]">{s.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-[var(--gn-text)]">{s.name}</h1>
      <div className="mt-2">
        <StarDisplay avg={s.avgRating} count={s.reviewCount} />
      </div>

      {s.breeder ? (
        <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
          Breeder:{" "}
          <Link
            href={`/breeders/${encodeURIComponent(s.breeder.slug)}`}
            className="font-medium text-[#ff6a38] hover:underline"
          >
            {s.breeder.name}
          </Link>
        </p>
      ) : null}

      {s.description?.trim() ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
          {s.description.trim()}
        </p>
      ) : null}

      {s.effects?.length ? (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
            Tags
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {s.effects.map((e) => (
              <li
                key={e}
                className="rounded-full bg-[var(--gn-surface-elevated)] px-2 py-0.5 text-xs text-[var(--gn-text)]"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {s.effectsNotes?.trim() ? (
        <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
          {s.effectsNotes.trim()}
        </p>
      ) : null}

      <section className="mt-10 border-t border-[var(--gn-divide)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Your review
        </h2>
        {hiddenNote ? (
          <p className="mt-2 text-sm text-amber-400">{hiddenNote}</p>
        ) : null}
        <div className="mt-3">
          <CatalogReviewForm
            entity="strain"
            slug={s.slug}
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
            disabledMessage="Sign in to rate and review this strain."
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
                href={`/strains/${encodeURIComponent(s.slug)}?reviewsPage=${reviewsPage - 1}`}
                className="text-[#ff6a38] hover:underline"
              >
                Newer reviews
              </Link>
            ) : null}
            {reviewsPage < totalPages ? (
              <Link
                href={`/strains/${encodeURIComponent(s.slug)}?reviewsPage=${reviewsPage + 1}`}
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
