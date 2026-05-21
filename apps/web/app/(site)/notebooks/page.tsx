import type { Metadata } from "next";
import Link from "next/link";
import {
  NotebookDirectoryCard,
  type NotebookDirectoryItem,
} from "@/components/notebook-directory-card";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Notebooks · ${SITE_NAME}`,
  description: `Public notebooks on ${SITE_NAME}.`,
  alternates: { canonical: canonicalPath("/notebooks") },
};

/** Filters use `searchParams` — must not be statically prerendered. */
export const dynamic = "force-dynamic";

function buildListQuery(opts: {
  page: number;
  pageSize: number;
  status?: string;
  q?: string;
  grower?: string;
  breeder?: string;
  strainSlug?: string;
}): string {
  const p = new URLSearchParams();
  p.set("page", String(opts.page));
  p.set("pageSize", String(opts.pageSize));
  if (
    opts.status === "active" ||
    opts.status === "completed" ||
    opts.status === "archived"
  ) {
    p.set("status", opts.status);
  }
  if (opts.q?.trim()) p.set("q", opts.q.trim());
  if (opts.grower?.trim()) p.set("grower", opts.grower.trim());
  if (opts.breeder?.trim()) p.set("breeder", opts.breeder.trim());
  if (opts.strainSlug?.trim()) p.set("strainSlug", opts.strainSlug.trim());
  return p.toString();
}

export default async function NotebooksDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
    grower?: string;
    breeder?: string;
    strainSlug?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const statusRaw = sp.status?.trim() ?? "";
  const status =
    statusRaw === "active" ||
    statusRaw === "completed" ||
    statusRaw === "archived"
      ? statusRaw
      : "";
  const q = sp.q ?? "";
  const grower = sp.grower ?? "";
  const breeder = sp.breeder ?? "";
  const strainSlug = sp.strainSlug?.trim() ?? "";
  const qs = buildListQuery({
    page,
    pageSize: 24,
    status,
    q,
    grower,
    breeder,
    strainSlug: strainSlug || undefined,
  });
  const listTimeout = 12_000;
  const [listRes, hotByVotes, hotRecent] = await Promise.all([
    apiFetch<{
      items: NotebookDirectoryItem[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/notebooks?${qs}`, {
      timeoutMs: listTimeout,
    }).catch(() => null),
    apiFetch<{ items: NotebookDirectoryItem[] }>(
      "/notebooks?page=1&pageSize=3&sort=hot",
      { timeoutMs: listTimeout },
    ).catch(() => ({ items: [] as NotebookDirectoryItem[] })),
    apiFetch<{ items: NotebookDirectoryItem[] }>(
      "/notebooks?page=1&pageSize=3",
      { timeoutMs: listTimeout },
    ).catch(() => ({ items: [] as NotebookDirectoryItem[] })),
  ]);

  const data =
    listRes ?? { items: [], total: 0, page: 1, pageSize: 24 };
  const hotVoteItems = Array.isArray(hotByVotes.items) ? hotByVotes.items : [];
  const hotRecentItems = Array.isArray(hotRecent.items) ? hotRecent.items : [];
  const hotNotebooks: NotebookDirectoryItem[] =
    hotVoteItems.length > 0 ? hotVoteItems : hotRecentItems;
  const hotNotebooksSource: "votes" | "recent" =
    hotVoteItems.length > 0 ? "votes" : "recent";
  const listedIds = new Set(data.items.map((n) => n.id));
  const hotSidebarNotebooks = hotNotebooks.filter((n) => !listedIds.has(n.id));

  const filterBase = {
    status,
    q,
    grower,
    breeder,
    strainSlug: strainSlug || undefined,
  };

  return (
    <main className="mx-auto max-w-[88rem] px-4 py-8">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-8">
        {/* Main: directory */}
        <div className="order-1 min-w-0">
          {/* Hero header */}
          <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-page-top))] via-[color-mix(in_srgb,var(--gn-accent)_18%,var(--gn-surface-elevated))] to-[var(--gn-surface-elevated)] p-6 sm:p-8">
            <div className="relative z-10">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--gn-accent)_20%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--gn-accent)]">
                📓 Notebooks
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--gn-text)] sm:text-4xl">
                Notebooks
              </h1>
              <p className="mt-2 max-w-lg text-sm text-[var(--gn-text-muted)]">
                Public notebooks shared by the community — from seed to harvest.
              </p>
              <Link
                href="/notebooks/new"
                className="mt-4 inline-flex rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-bold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110"
              >
                Start your notebook →
              </Link>
            </div>
            <div className="pointer-events-none absolute right-4 top-4 select-none text-8xl opacity-10">
              📓
            </div>
          </div>

          <form
            method="get"
            className="mt-8 flex flex-col gap-4 rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4"
          >
            {strainSlug ? (
              <input type="hidden" name="strainSlug" value={strainSlug} />
            ) : null}
            {strainSlug ? (
              <p className="text-sm text-[var(--gn-text-muted)]">
                Showing notebooks linked to catalog strain{" "}
                <span className="font-mono text-[var(--gn-text)]">
                  {strainSlug}
                </span>
                .{" "}
                <Link href="/notebooks" className="text-[var(--gn-accent)] hover:underline">
                  Clear strain filter
                </Link>
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-[var(--gn-text)]">
                  Search
                </span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Title or strain…"
                  className="gn-input mt-1 w-full"
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[var(--gn-text)]">
                  Grower
                </span>
                <input
                  name="grower"
                  defaultValue={grower}
                  placeholder="Display name…"
                  className="gn-input mt-1 w-full"
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[var(--gn-text)]">
                  Breeder
                </span>
                <input
                  name="breeder"
                  defaultValue={breeder}
                  placeholder="Name or slug…"
                  className="gn-input mt-1 w-full"
                  autoComplete="off"
                />
              </label>
              <label className="block w-full text-sm sm:col-span-2 sm:w-48">
                <span className="font-medium text-[var(--gn-text)]">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={status}
                  className="gn-input mt-1 w-full sm:max-w-xs"
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
              >
                Apply filters
              </button>
              <Link
                href="/notebooks"
                className="inline-flex items-center rounded-full border border-[var(--gn-divide)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
              >
                Clear
              </Link>
            </div>
          </form>

          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-2">
            {data.items.map((n) => (
              <li key={n.id} className="min-h-0">
                <NotebookDirectoryCard n={n} />
              </li>
            ))}
          </ul>

          {data.total > data.pageSize ? (
            <div className="mt-6 flex gap-4 text-sm">
              {data.page > 1 ? (
                <Link
                  href={`/notebooks?${buildListQuery({
                    page: data.page - 1,
                    pageSize: data.pageSize,
                    ...filterBase,
                  })}`}
                  className="text-[var(--gn-accent)] hover:underline"
                >
                  Previous
                </Link>
              ) : null}
              {data.page * data.pageSize < data.total ? (
                <Link
                  href={`/notebooks?${buildListQuery({
                    page: data.page + 1,
                    pageSize: data.pageSize,
                    ...filterBase,
                  })}`}
                  className="text-[var(--gn-accent)] hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}

          {listRes === null ? (
            <p className="mt-8 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 text-sm text-[var(--gn-text-muted)]">
              Could not load notebooks right now. Refresh the page or try again
              in a moment.
            </p>
          ) : null}

          {listRes !== null && data.items.length === 0 ? (
            <p className="mt-8 text-sm text-[var(--gn-text-muted)]">
              {status
                ? `No ${status} notebooks match these filters.`
                : "No notebooks match these filters."}{" "}
              Try widening search or{" "}
              <Link href="/notebooks" className="text-[var(--gn-accent)] hover:underline">
                clear filters
              </Link>
              .
            </p>
          ) : null}
        </div>

        {/* Right sidebar: hot notebooks + explainer */}
        <aside className="order-2 min-w-0 space-y-6 border-t border-[var(--gn-border)] pt-10 lg:sticky lg:top-20 lg:self-start lg:border-t-0 lg:pt-0">
          {/* Hot notebooks */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
              Hot notebooks
            </h2>
            <p className="text-xs leading-snug text-[var(--gn-text-muted)]">
              {hotNotebooksSource === "votes"
                ? "Top by community votes, then recently updated."
                : "Recently updated—vote ranking unavailable on this build."}
            </p>
            {hotSidebarNotebooks.length > 0 ? (
              <ul className="grid gap-3">
                {hotSidebarNotebooks.map((n) => (
                  <li key={n.id}>
                    <NotebookDirectoryCard n={n} />
                  </li>
                ))}
              </ul>
            ) : hotNotebooks.length > 0 ? (
              <p className="text-sm text-[var(--gn-text-muted)]">
                Hot picks are already in your results.
              </p>
            ) : (
              <p className="text-sm text-[var(--gn-text-muted)]">
                No public notebooks yet.
              </p>
            )}
          </div>

          {/* Explainer */}
          <div className="space-y-4 border-t border-[var(--gn-border)] pt-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                What are notebooks?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text)]">
                Notebooks are structured logs: one plant (or run), weekly
                checkpoints, environment and feeding notes, and a timeline you
                (and the community) can follow from seed to harvest.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                How to start
              </h2>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--gn-text)]">
                <li>
                  Sign in, then open{" "}
                  <Link
                    href="/notebooks/new"
                    className="text-[var(--gn-accent)] hover:underline"
                  >
                    Set up your notebook
                  </Link>
                  .
                </li>
                <li>
                  Add title and your first week. Link a cultivar from the{" "}
                  <Link href="/strains" className="text-[var(--gn-accent)] hover:underline">
                    Strains
                  </Link>{" "}
                  catalog (or a custom label) under{" "}
                  <strong className="font-medium text-[var(--gn-text)]">
                    Details
                  </strong>{" "}
                  on your notebook.
                </li>
                <li>
                  Keep logging weeks—readers can filter by grower, breeder, and
                  status from this directory.
                </li>
              </ol>
            </div>
            <div className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 text-sm text-[var(--gn-text-muted)]">
              Profiles must be public with notebooks shared for a diary to appear
              here. You can change that anytime in account settings.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
