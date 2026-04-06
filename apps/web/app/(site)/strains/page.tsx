import type { Metadata } from "next";
import Link from "next/link";
import { StarDisplay } from "@/components/catalog/star-display";
import { apiFetch } from "@/lib/api-public";
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
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const breederSlug = sp.breederSlug?.trim() ?? "";
  const sort = sp.sort === "rating" ? "rating" : "name";
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = 24;
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-text)]">
        Strains
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Cultivars and strains — reference entries and community ratings. Staff curate the catalog.
      </p>

      {breederSlug ? (
        <p className="mt-3 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-3 py-2 text-sm text-[var(--gn-text)]">
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

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/strains" method="get">
        {breederSlug ? (
          <input type="hidden" name="breederSlug" value={breederSlug} />
        ) : null}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
            className="w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)]"
          />
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)]"
          >
            <option value="name">Name</option>
            <option value="rating">Rating</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#ff6a38] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff7d4c]"
        >
          Search
        </button>
      </form>

      <ul className="mt-8 divide-y divide-[var(--gn-divide)] rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
        {data.items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--gn-text-muted)]">
            No strains match yet. Check back as the catalog grows.
          </li>
        ) : (
          data.items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/strains/${encodeURIComponent(s.slug)}`}
                className="block px-4 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--gn-surface-elevated)_70%,transparent)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-[#ff6a38]">
                    {s.name}
                  </h2>
                  <StarDisplay avg={s.avgRating} count={s.reviewCount} />
                </div>
                {s.description?.trim() ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--gn-text-muted)]">
                    {s.description.trim()}
                  </p>
                ) : null}
              </Link>
            </li>
          ))
        )}
      </ul>

      {totalPages > 1 ? (
        <nav className="mt-6 flex items-center justify-center gap-4 text-sm">
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
    </main>
  );
}
