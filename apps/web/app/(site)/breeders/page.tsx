import type { Metadata } from "next";
import Link from "next/link";
import { BreederDetailBody } from "@/components/catalog/breeder-detail-body";
import { BreedersCatalogToolbar } from "@/components/catalog/breeders-catalog-toolbar";
import { CatalogListPreviewOverlay } from "@/components/catalog/catalog-list-preview-overlay";
import { StarDisplay } from "@/components/catalog/star-display";
import { apiFetch } from "@/lib/api-public";
import {
  breederPreviewPath,
  type BreedersListQuery,
} from "@/lib/catalog-list-urls";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Breeders",
  description: `Browse breeders and community ratings on ${SITE_NAME}.`,
  openGraph: {
    title: `Breeders · ${SITE_NAME}`,
    url: canonicalPath("/breeders"),
  },
  alternates: { canonical: canonicalPath("/breeders") },
};

type ListJson = {
  items: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    avgRating: string | null;
    reviewCount: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export default async function BreedersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    page?: string;
    country?: string;
    minRating?: string;
    minReviews?: string;
    detail?: string;
    reviewsPage?: string;
    strainReviewsPage?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const country = sp.country?.trim() ?? "";
  const minRatingRaw = sp.minRating?.trim() ?? "";
  const minReviewsRaw = sp.minReviews?.trim() ?? "";
  const sort = sp.sort === "rating" ? "rating" : "name";
  const page = Number(sp.page ?? 1) || 1;
  const detailSlug = sp.detail?.trim() ?? "";
  const overlayReviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const overlayStrainReviewsPage = Number(sp.strainReviewsPage ?? 1) || 1;
  const pageSize = 30;
  const qs = new URLSearchParams({
    sort,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (q) qs.set("q", q);
  if (country) qs.set("country", country);
  const minRatingN = Number(minRatingRaw);
  if (minRatingRaw && minRatingN >= 1 && minRatingN <= 5) {
    qs.set("minRating", minRatingRaw);
  }
  const minReviewsN = Number(minReviewsRaw);
  if (minReviewsRaw && minReviewsN >= 1) {
    qs.set("minReviews", minReviewsRaw);
  }

  let data: ListJson = {
    items: [],
    total: 0,
    page: 1,
    pageSize,
  };
  try {
    data = await apiFetch<ListJson>(`/breeders?${qs.toString()}`, {
      timeoutMs: 15_000,
    });
  } catch {
    /* empty */
  }

  const buildLink = (nextPage: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort !== "name") p.set("sort", sort);
    if (country) p.set("country", country);
    if (minRatingRaw && minRatingN >= 1 && minRatingN <= 5) {
      p.set("minRating", minRatingRaw);
    }
    if (minReviewsRaw && minReviewsN >= 1) {
      p.set("minReviews", minReviewsRaw);
    }
    p.set("page", String(nextPage));
    return `/breeders?${p.toString()}`;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const listPreview: BreedersListQuery = {
    q: q || undefined,
    sort: sort === "rating" ? "rating" : undefined,
    page: page > 1 ? String(page) : undefined,
    country: country || undefined,
    minRating:
      minRatingRaw && minRatingN >= 1 && minRatingN <= 5
        ? minRatingRaw
        : undefined,
    minReviews:
      minReviewsRaw && minReviewsN >= 1 ? minReviewsRaw : undefined,
  };

  return (
    <main className="w-full max-w-none px-3 py-5 sm:px-4 sm:py-6 lg:pl-3 lg:pr-6 xl:pl-4 xl:pr-10 2xl:pl-5 2xl:pr-14">
      {/* Hero header */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-[color-mix(in_srgb,var(--gn-hot)_40%,var(--gn-surface-elevated))] to-[var(--gn-surface-elevated)] p-6 sm:p-8">
        <div className="relative z-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-amber-300">
            🏆 Breeder Catalog
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Top Breeders
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
            {data.total > 0
              ? `${data.total} breeders in the directory`
              : "Explore genetics from the world's best seed companies."}
          </p>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 select-none text-8xl opacity-10">
          🏆
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0" />
        <BreedersCatalogToolbar />
      </div>

      <ul className="mt-5 grid list-none grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {data.items.length === 0 ? (
          <li className="col-span-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-10 text-center text-sm text-[var(--gn-text-muted)]">
            No breeders match yet. Check back as the directory grows.
          </li>
        ) : (
          data.items.map((b) => (
            <li key={b.id} className="min-w-0">
              <Link
                href={breederPreviewPath(b.slug, listPreview)}
                scroll={false}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] shadow-sm transition-all hover:scale-[1.02] hover:border-[color-mix(in_srgb,var(--gn-text-muted)_35%,var(--gn-divide))] hover:bg-[color-mix(in_srgb,var(--gn-surface-elevated)_55%,var(--gn-surface-muted))] hover:shadow-md"
              >
                {/* Amber accent strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-500/80 to-yellow-700/40" />
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-lg">
                    🏆
                  </div>
                  <h2 className="min-w-0 text-sm font-bold leading-snug text-[var(--gn-text)] group-hover:text-[var(--gn-accent)] sm:text-base">
                    {b.name}
                  </h2>
                  <div className="mt-1.5">
                    <StarDisplay
                      avg={b.avgRating}
                      count={b.reviewCount}
                      compact
                    />
                  </div>
                  {b.description?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--gn-text-muted)]">
                      {b.description.trim()}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                      View profile…
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      {totalPages > 1 ? (
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm sm:mt-6 sm:gap-4">
          {page > 1 ? (
            <Link
              href={buildLink(page - 1)}
              className="text-[var(--gn-accent)] hover:underline"
            >
              Previous
            </Link>
          ) : (
            <span className="text-[var(--gn-text-muted)]">Previous</span>
          )}
          <span className="text-[var(--gn-text-muted)]">
            Page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildLink(page + 1)}
              className="text-[var(--gn-accent)] hover:underline"
            >
              Next
            </Link>
          ) : (
            <span className="text-[var(--gn-text-muted)]">Next</span>
          )}
        </nav>
      ) : null}

      <p className="mt-8 text-center text-sm text-[var(--gn-text-muted)]">
        <Link href="/strains" className="text-[var(--gn-accent)] hover:underline">
          Strains
        </Link>
        {" · "}
        <Link href="/catalog/suggest" className="text-[var(--gn-accent)] hover:underline">
          Suggest an entry
        </Link>
      </p>

      {detailSlug ? (
        <CatalogListPreviewOverlay
          fullPageHref={`/breeders/${encodeURIComponent(detailSlug)}`}
        >
          <BreederDetailBody
            slug={detailSlug}
            reviewsPage={overlayReviewsPage}
            strainReviewsPage={overlayStrainReviewsPage}
            variant="modal"
            listPreview={listPreview}
          />
        </CatalogListPreviewOverlay>
      ) : null}
    </main>
  );
}
