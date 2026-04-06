import type { Metadata } from "next";
import Link from "next/link";
import { StrainDetailBody } from "@/components/catalog/strain-detail-body";
import { CatalogListPreviewOverlay } from "@/components/catalog/catalog-list-preview-overlay";
import { StarDisplay } from "@/components/catalog/star-display";
import { apiFetch } from "@/lib/api-public";
import {
  strainPreviewPath,
  type StrainsListQuery,
} from "@/lib/catalog-list-urls";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Strains",
  description: `Browse cultivars and strains — reference entries and community ratings on ${SITE_NAME}.`,
  openGraph: {
    title: `Cultivars & strains · ${SITE_NAME}`,
    url: canonicalPath("/strains"),
  },
  alternates: { canonical: canonicalPath("/strains") },
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

export default async function StrainsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    page?: string;
    breederSlug?: string;
    detail?: string;
    reviewsPage?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const breederSlug = sp.breederSlug?.trim() ?? "";
  const sort = sp.sort === "rating" ? "rating" : "name";
  const page = Number(sp.page ?? 1) || 1;
  const detailSlug = sp.detail?.trim() ?? "";
  const overlayReviewsPage = Number(sp.reviewsPage ?? 1) || 1;
  const pageSize = 30;
  const qs = new URLSearchParams({
    sort,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (q) qs.set("q", q);
  if (breederSlug) qs.set("breederSlug", breederSlug);

  let data: ListJson = {
    items: [],
    total: 0,
    page: 1,
    pageSize,
  };
  try {
    data = await apiFetch<ListJson>(`/strains?${qs.toString()}`, {
      timeoutMs: 15_000,
    });
  } catch {
    /* empty */
  }

  const buildLink = (nextPage: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort !== "name") p.set("sort", sort);
    if (breederSlug) p.set("breederSlug", breederSlug);
    p.set("page", String(nextPage));
    return `/strains?${p.toString()}`;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  let filterBreederName: string | null = null;
  if (breederSlug) {
    try {
      const b = await apiFetch<{ breeder: { name: string } }>(
        `/breeders/${encodeURIComponent(breederSlug)}?reviewsPage=1&reviewsPageSize=1`,
        { timeoutMs: 8000 },
      );
      filterBreederName = b.breeder?.name?.trim() || null;
    } catch {
      filterBreederName = null;
    }
  }

  const listPreview: StrainsListQuery = {
    q: q || undefined,
    sort: sort === "rating" ? "rating" : undefined,
    page: page > 1 ? String(page) : undefined,
    breederSlug: breederSlug || undefined,
  };

  return (
    <main className="w-full max-w-none px-3 py-5 sm:px-4 sm:py-6 lg:pl-3 lg:pr-6 xl:pl-4 xl:pr-10 2xl:pl-5 2xl:pr-14">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 lg:max-w-xl">
          <h1 className="text-xl font-bold tracking-tight text-[var(--gn-text)] sm:text-2xl">
            Strains
          </h1>
          <p className="mt-1 text-xs text-[var(--gn-text-muted)] sm:text-sm">
            Cultivars and strains — reference entries and community ratings.
            Staff curate the catalog.
          </p>
        </div>

        <form
          className="flex w-full flex-wrap items-end gap-2 sm:gap-3 lg:max-w-2xl lg:flex-1 lg:justify-end"
          action="/strains"
          method="get"
        >
          {breederSlug ? (
            <input type="hidden" name="breederSlug" value={breederSlug} />
          ) : null}
          <div className="min-w-0 flex-1 basis-[12rem]">
            <label htmlFor="q" className="sr-only">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2.5 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
            />
          </div>
          <div className="shrink-0">
            <label htmlFor="sort" className="sr-only">
              Sort
            </label>
            <select
              id="sort"
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

      {breederSlug ? (
        <p className="mt-4 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-3 py-2 text-sm text-[var(--gn-text)]">
          {filterBreederName ? (
            <>
              Showing strains linked to{" "}
              <Link
                href={`/breeders/${encodeURIComponent(breederSlug)}`}
                className="font-medium text-[#ff6a38] hover:underline"
              >
                {filterBreederName}
              </Link>
              .{" "}
            </>
          ) : (
            <>Filtered by breeder. </>
          )}
          <Link href="/strains" className="text-[#ff6a38] hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}

      <ul className="mt-5 grid list-none grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {data.items.length === 0 ? (
          <li className="col-span-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-10 text-center text-sm text-[var(--gn-text-muted)]">
            No strains match yet. Check back as the catalog grows.
          </li>
        ) : (
          data.items.map((s) => (
            <li key={s.id} className="min-w-0">
              <Link
                href={strainPreviewPath(s.slug, listPreview)}
                scroll={false}
                className="block h-full rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-3 shadow-sm transition hover:border-[color-mix(in_srgb,var(--gn-text-muted)_35%,var(--gn-divide))] hover:bg-[color-mix(in_srgb,var(--gn-surface-elevated)_55%,var(--gn-surface-muted))] sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#ff6a38] sm:text-base">
                    {s.name}
                  </h2>
                  <StarDisplay
                    avg={s.avgRating}
                    count={s.reviewCount}
                    compact
                  />
                </div>
                {s.description?.trim() ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--gn-text-muted)] sm:mt-3 sm:text-sm">
                    {s.description.trim()}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--gn-text-muted)] sm:text-sm">
                    View details…
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
        <Link href="/breeders" className="text-[#ff6a38] hover:underline">
          Breeders
        </Link>
        {" · "}
        <Link href="/catalog/suggest" className="text-[#ff6a38] hover:underline">
          Suggest an entry
        </Link>
      </p>

      {detailSlug ? (
        <CatalogListPreviewOverlay
          fullPageHref={`/strains/${encodeURIComponent(detailSlug)}`}
        >
          <StrainDetailBody
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
