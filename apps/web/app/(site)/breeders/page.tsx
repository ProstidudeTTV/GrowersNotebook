import type { Metadata } from "next";
import Link from "next/link";
import { BreederDetailBody } from "@/components/catalog/breeder-detail-body";
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
    detail?: string;
    reviewsPage?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const sort = sp.sort === "rating" ? "rating" : "name";
  const page = Number(sp.page ?? 1) || 1;
  const detailSlug = sp.detail?.trim() ?? "";
  const overlayReviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const pageSize = 48;
  const qs = new URLSearchParams({
    sort,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (q) qs.set("q", q);

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
    p.set("page", String(nextPage));
    return `/breeders?${p.toString()}`;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const listPreview: BreedersListQuery = {
    q: q || undefined,
    sort: sort === "rating" ? "rating" : undefined,
    page: page > 1 ? String(page) : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-[90rem] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 xl:px-8 2xl:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 lg:max-w-xl">
          <h1 className="text-xl font-bold tracking-tight text-[var(--gn-text)] sm:text-2xl">
            Breeders
          </h1>
          <p className="mt-1 text-xs text-[var(--gn-text-muted)] sm:text-sm">
            Strain breeders with community ratings. Curated by staff.
          </p>
        </div>

        <form
          className="flex w-full flex-wrap items-end gap-2 sm:gap-3 lg:max-w-2xl lg:flex-1 lg:justify-end"
          action="/breeders"
          method="get"
        >
          <div className="min-w-0 flex-1 basis-[12rem]">
            <label htmlFor="bq" className="sr-only">
              Search
            </label>
            <input
              id="bq"
              name="q"
              defaultValue={q}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2.5 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
            />
          </div>
          <div className="shrink-0">
            <label htmlFor="bsort" className="sr-only">
              Sort
            </label>
            <select
              id="bsort"
              name="sort"
              defaultValue={sort}
              className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
            >
              <option value="name">Name</option>
              <option value="rating">Rating</option>
            </select>
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-[#ff6a38] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#ff7d4c] sm:px-4 sm:py-2"
          >
            Search
          </button>
        </form>
      </div>

      <ul className="mt-5 grid list-none grid-cols-2 gap-2 sm:mt-6 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                className="block h-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-2.5 shadow-sm transition hover:border-[color-mix(in_srgb,var(--gn-text-muted)_35%,var(--gn-divide))] hover:bg-[color-mix(in_srgb,var(--gn-surface-elevated)_55%,var(--gn-surface-muted))] sm:p-3"
              >
                <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                  <h2 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#ff6a38] sm:text-[0.9375rem]">
                    {b.name}
                  </h2>
                  <StarDisplay
                    avg={b.avgRating}
                    count={b.reviewCount}
                    compact
                  />
                </div>
                {b.description?.trim() ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--gn-text-muted)] sm:mt-2 sm:text-sm">
                    {b.description.trim()}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-[var(--gn-text-muted)] sm:text-sm">
                    View profile…
                  </p>
                )}
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
              className="text-[#ff6a38] hover:underline"
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
              className="text-[#ff6a38] hover:underline"
            >
              Next
            </Link>
          ) : (
            <span className="text-[var(--gn-text-muted)]">Next</span>
          )}
        </nav>
      ) : null}

      <p className="mt-8 text-center text-sm text-[var(--gn-text-muted)]">
        <Link href="/strains" className="text-[#ff6a38] hover:underline">
          Strains
        </Link>
        {" · "}
        <Link href="/catalog/suggest" className="text-[#ff6a38] hover:underline">
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
            variant="modal"
            listPreview={listPreview}
          />
        </CatalogListPreviewOverlay>
      ) : null}
    </main>
  );
}
