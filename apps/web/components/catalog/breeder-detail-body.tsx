import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogModalCrumb } from "@/components/catalog/catalog-modal-crumb";
import { CatalogReviewForm } from "@/components/catalog/catalog-review-form";
import { StarDisplay } from "@/components/catalog/star-display";
import { apiFetch } from "@/lib/api-public";
import type { BreedersListQuery } from "@/lib/catalog-list-urls";
import {
  breederPreviewPath,
  breedersListPath,
} from "@/lib/catalog-list-urls";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export type BreederDetailJson = {
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

export async function BreederDetailBody({
  slug,
  reviewsPage,
  variant,
  listPreview,
}: {
  slug: string;
  reviewsPage: number;
  variant: "page" | "modal";
  listPreview?: BreedersListQuery;
}) {
  const safe = slug?.trim();
  if (!safe) notFound();

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let data: BreederDetailJson;
  try {
    const qs = new URLSearchParams({
      reviewsPage: String(reviewsPage),
      reviewsPageSize: "15",
    });
    data = await apiFetch<BreederDetailJson>(
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

  const reviewListHref = (rp: number) =>
    listPreview
      ? breederPreviewPath(b.slug, listPreview, rp)
      : `/breeders/${encodeURIComponent(b.slug)}?reviewsPage=${rp}`;

  const strainsFromBreederHref = `/strains?breederSlug=${encodeURIComponent(b.slug)}`;

  const breedersCrumb =
    variant === "page" ? (
      <Link href="/breeders" className="text-[#ff6a38] hover:underline">
        Breeders
      </Link>
    ) : listPreview ? (
      <Link
        href={breedersListPath(listPreview)}
        scroll={false}
        className="text-[#ff6a38] hover:underline"
      >
        Breeders
      </Link>
    ) : (
      <CatalogModalCrumb>Breeders</CatalogModalCrumb>
    );

  const shell = (inner: ReactNode) =>
    variant === "page" ? (
      <main className="mx-auto max-w-3xl px-4 py-8">{inner}</main>
    ) : (
      <div className="px-4 py-6">{inner}</div>
    );

  return shell(
    <div className="flex flex-col gap-8 lg:gap-10">
      <nav className="text-sm text-[var(--gn-text-muted)]">
        {breedersCrumb}
        <span className="mx-2">/</span>
        <span className="text-[var(--gn-text)]">{b.name}</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-[var(--gn-text)]">{b.name}</h1>
        <StarDisplay avg={b.avgRating} count={b.reviewCount} />
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-0">
        <div className="min-w-0 space-y-6">
          {b.description?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
              {b.description.trim()}
            </p>
          ) : (
            <p className="text-sm text-[var(--gn-text-muted)]">
              No description yet.
            </p>
          )}
        </div>
        <aside className="min-w-0 space-y-5 lg:border-l lg:border-[var(--gn-divide)] lg:pl-10">
          {b.country?.trim() ? (
            <p className="text-sm text-[var(--gn-text-muted)]">
              <span className="font-medium text-[var(--gn-text)]">Region</span>
              <span className="mt-1 block">{b.country.trim()}</span>
            </p>
          ) : null}
          {b.website?.trim() ? (
            <p className="text-sm">
              <a
                href={
                  b.website.startsWith("http")
                    ? b.website
                    : `https://${b.website}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-[#ff6a38] hover:underline"
              >
                Website
              </a>
            </p>
          ) : null}
          <p className="text-sm">
            <Link
              href={strainsFromBreederHref}
              scroll={false}
              className="font-medium text-[#ff6a38] hover:underline"
            >
              Strains from this breeder
            </Link>
          </p>
        </aside>
      </div>

      <section className="border-t border-[var(--gn-divide)] pt-8 lg:pt-10">
        <h2 className="text-lg font-semibold text-[var(--gn-text)]">
          Your review
        </h2>
        {hiddenNote ? (
          <p className="mt-2 text-sm text-amber-400">{hiddenNote}</p>
        ) : null}
        <div className="mt-4">
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
              {r.body?.trim() ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                  {r.body.trim()}
                </p>
              ) : null}
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
