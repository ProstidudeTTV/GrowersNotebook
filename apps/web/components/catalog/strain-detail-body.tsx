import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogStrainBreederLink } from "@/components/catalog/catalog-strain-breeder-link";
import { CatalogModalCrumb } from "@/components/catalog/catalog-modal-crumb";
import { CatalogReviewForm } from "@/components/catalog/catalog-review-form";
import { CatalogSubRatingsSummary } from "@/components/catalog/catalog-sub-ratings-summary";
import { StarDisplay } from "@/components/catalog/star-display";
import { apiFetch } from "@/lib/api-public";
import type { StrainsListQuery } from "@/lib/catalog-list-urls";
import {
  strainPreviewPath,
  strainsListPath,
} from "@/lib/catalog-list-urls";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export type StrainReviewMedia = {
  url: string;
  type: "image" | "video" | string;
};

type StrainGrowDiaryPreview = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  owner: { id: string; displayName: string | null };
};

export type StrainDetailJson = {
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
      subRatings: Record<string, unknown>;
      media: StrainReviewMedia[];
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
    subRatings: Record<string, unknown>;
    media: StrainReviewMedia[];
    hidden: boolean;
  } | null;
};

function ReviewPhotos({
  media,
  altPrefix,
}: {
  media: StrainReviewMedia[];
  altPrefix: string;
}) {
  const imgs = media.filter((m) => m.type === "image" && m.url?.trim());
  if (imgs.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {imgs.map((m, i) => (
        <li key={`${m.url}-${i}`} className="overflow-hidden rounded-md ring-1 ring-[var(--gn-ring)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.url}
            alt={`${altPrefix} ${i + 1}`}
            className="h-24 w-24 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </li>
      ))}
    </ul>
  );
}

export async function StrainDetailBody({
  slug,
  reviewsPage,
  variant,
  /** When set (list preview overlay), links keep /strains?detail=… and scroll position */
  listPreview,
}: {
  slug: string;
  reviewsPage: number;
  variant: "page" | "modal";
  listPreview?: StrainsListQuery;
}) {
  const safe = slug?.trim();
  if (!safe) notFound();

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let data: StrainDetailJson;
  try {
    const qs = new URLSearchParams({
      reviewsPage: String(reviewsPage),
      reviewsPageSize: "15",
    });
    data = await apiFetch<StrainDetailJson>(
      `/strains/${encodeURIComponent(safe)}?${qs}`,
      { token: token ?? undefined, timeoutMs: 15_000 },
    );
  } catch {
    notFound();
  }

  const s = data.strain;

  let growDiariesItems: StrainGrowDiaryPreview[] = [];
  let growDiariesTotal = 0;
  try {
    const nbQs = new URLSearchParams({
      page: "1",
      pageSize: "8",
      strainSlug: s.slug,
    });
    const nbRes = await apiFetch<{
      items: StrainGrowDiaryPreview[];
      total: number;
    }>(`/notebooks?${nbQs}`, {
      token: token ?? undefined,
      timeoutMs: 12_000,
    });
    growDiariesItems = nbRes.items;
    growDiariesTotal = nbRes.total;
  } catch {
    /* optional block */
  }
  const hiddenNote =
    data.viewerReview?.hidden === true
      ? "Your review was removed by moderators."
      : null;

  const totalPages = Math.max(
    1,
    Math.ceil(data.reviews.total / data.reviews.pageSize),
  );

  const reviewListHref = (rp: number) =>
    listPreview
      ? strainPreviewPath(s.slug, listPreview, rp)
      : `/strains/${encodeURIComponent(s.slug)}?reviewsPage=${rp}`;

  const breederHref = s.breeder
    ? listPreview
      ? `/breeders?detail=${encodeURIComponent(s.breeder.slug)}`
      : `/breeders/${encodeURIComponent(s.breeder.slug)}`
    : null;

  const strainsCrumb =
    variant === "page" ? (
      <Link href="/strains" className="text-[#ff6a38] hover:underline">
        Strains
      </Link>
    ) : listPreview ? (
      <Link
        href={strainsListPath(listPreview)}
        scroll={false}
        className="text-[#ff6a38] hover:underline"
      >
        Strains
      </Link>
    ) : (
      <CatalogModalCrumb>Strains</CatalogModalCrumb>
    );

  const shell = (inner: ReactNode) =>
    variant === "page" ? (
      <main className="mx-auto max-w-3xl px-4 py-8">{inner}</main>
    ) : (
      <div className="px-4 py-6">{inner}</div>
    );

  const hasAside =
    Boolean(s.effects?.length) || Boolean(s.effectsNotes?.trim());

  return shell(
    <div className="flex flex-col gap-8 lg:gap-10">
      <nav className="text-sm text-[var(--gn-text-muted)]">
        {strainsCrumb}
        <span className="mx-2">/</span>
        <span className="text-[var(--gn-text)]">{s.name}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-[var(--gn-text)]">{s.name}</h1>
        <StarDisplay avg={s.avgRating} count={s.reviewCount} />
        {s.breeder && breederHref ? (
          <p className="text-sm text-[var(--gn-text-muted)]">
            Breeder:{" "}
            {listPreview ? (
              <Link
                href={breederHref}
                scroll={false}
                className="font-medium text-[#ff6a38] hover:underline"
              >
                {s.breeder.name}
              </Link>
            ) : (
              <CatalogStrainBreederLink
                href={breederHref}
                strainSlug={s.slug}
                breederSlug={s.breeder.slug}
                className="font-medium text-[#ff6a38] hover:underline"
              >
                {s.breeder.name}
              </CatalogStrainBreederLink>
            )}
          </p>
        ) : null}
      </header>

      {hasAside ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-0">
          <div className="min-w-0 space-y-6">
            {s.description?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
                {s.description.trim()}
              </p>
            ) : (
              <p className="text-sm text-[var(--gn-text-muted)]">
                No description yet.
              </p>
            )}
          </div>
          <aside className="min-w-0 space-y-5 lg:border-l lg:border-[var(--gn-divide)] lg:pl-10">
            {s.effects?.length ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                  Tags
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
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
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text-muted)]">
                {s.effectsNotes.trim()}
              </p>
            ) : null}
          </aside>
        </div>
      ) : (
        <>
          {s.description?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
              {s.description.trim()}
            </p>
          ) : null}
        </>
      )}

      <section className="border-t border-[var(--gn-divide)] pt-8 lg:pt-10">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Grow diaries
        </h2>
        <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
          Public notebooks from growers who linked this catalog strain to their
          diary.
        </p>
        {growDiariesTotal === 0 ? (
          <p className="mt-4 text-sm text-[var(--gn-text-muted)]">
            No public grow diaries for this strain yet.
          </p>
        ) : (
          <>
            <ul className="mt-5 space-y-3">
              {growDiariesItems.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/notebooks/${encodeURIComponent(n.id)}`}
                    className="block rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-4 transition hover:border-[var(--gn-text-muted)]"
                  >
                    <p className="font-medium text-[var(--gn-text)]">
                      {n.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                      <span className="text-[var(--gn-text)]">
                        {n.owner.displayName?.trim() || "Grower"}
                      </span>
                      <span className="mx-1.5">·</span>
                      Updated {formatStrainNotebookDate(n.updatedAt)}
                      <span className="mx-1.5">·</span>
                      <span className="capitalize">{n.status}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            {growDiariesTotal > growDiariesItems.length ? (
              <p className="mt-4">
                <Link
                  href={`/notebooks?strainSlug=${encodeURIComponent(s.slug)}`}
                  className="text-sm font-semibold text-[#ff6a38] hover:underline"
                >
                  View all {growDiariesTotal} grow diaries
                </Link>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="border-t border-[var(--gn-divide)] pt-8 lg:pt-10">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Your review
        </h2>
        {hiddenNote ? (
          <p className="mt-2 text-sm text-amber-400">{hiddenNote}</p>
        ) : null}
        <div className="mt-4">
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
            initialSubRatings={
              data.viewerReview && !data.viewerReview.hidden
                ? data.viewerReview.subRatings
                : null
            }
            initialMedia={
              data.viewerReview && !data.viewerReview.hidden
                ? data.viewerReview.media
                : null
            }
            disabled={!user}
            disabledMessage="Sign in to rate and review this strain."
          />
        </div>
      </section>

      <section className="border-t border-[var(--gn-divide)] pt-8 lg:pt-10">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Community reviews ({data.reviews.total})
        </h2>
        <ul className="mt-5 space-y-4 lg:mt-6">
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
              <CatalogSubRatingsSummary subRatings={r.subRatings} />
              {r.body?.trim() ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                  {r.body.trim()}
                </p>
              ) : null}
              <ReviewPhotos media={r.media ?? []} altPrefix="Review photo" />
            </li>
          ))}
        </ul>

        {totalPages > 1 ? (
          <div className="mt-6 flex justify-center gap-4 text-sm lg:mt-8">
            {reviewsPage > 1 ? (
              <Link
                href={reviewListHref(reviewsPage - 1)}
                scroll={false}
                className="text-[#ff6a38] hover:underline"
              >
                Newer reviews
              </Link>
            ) : null}
            {reviewsPage < totalPages ? (
              <Link
                href={reviewListHref(reviewsPage + 1)}
                scroll={false}
                className="text-[#ff6a38] hover:underline"
              >
                Older reviews
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>,
  );
}

function formatStrainNotebookDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
