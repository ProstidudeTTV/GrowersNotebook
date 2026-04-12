import type { Metadata } from "next";
import Link from "next/link";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

type NotebookListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  customStrainLabel: string | null;
  owner: {
    id: string;
    displayName: string | null;
    avatarUrl?: string | null;
  };
  strain: { slug: string; name: string | null } | null;
  breeder: { slug: string; name: string } | null;
  score: number;
};

export const metadata: Metadata = {
  title: `Notebooks · ${SITE_NAME}`,
  description: `Public notebooks on ${SITE_NAME}.`,
  alternates: { canonical: canonicalPath("/notebooks") },
};

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

function formatListDate(iso: string): string {
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

function statusPillClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
    case "completed":
      return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
    case "archived":
      return "bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)] ring-[var(--gn-divide)]";
    default:
      return "bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)] ring-[var(--gn-divide)]";
  }
}

function NotebookCardAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  displayName: string | null;
}) {
  const label = (displayName ?? "Grower").trim();
  const initial = label.charAt(0).toUpperCase() || "?";
  const frame =
    "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--gn-surface-elevated)] text-sm font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]";
  if (avatarUrl?.trim()) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl.trim()}
        alt=""
        className={`${frame} object-cover`}
      />
    );
  }
  return (
    <span className={frame} aria-hidden>
      {initial}
    </span>
  );
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
      items: NotebookListItem[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/notebooks?${qs}`, {
      timeoutMs: listTimeout,
    }).catch(() => null),
    apiFetch<{ items: NotebookListItem[] }>(
      "/notebooks?page=1&pageSize=3&sort=hot",
      { timeoutMs: listTimeout },
    ).catch(() => ({ items: [] as NotebookListItem[] })),
    apiFetch<{ items: NotebookListItem[] }>(
      "/notebooks?page=1&pageSize=3",
      { timeoutMs: listTimeout },
    ).catch(() => ({ items: [] as NotebookListItem[] })),
  ]);

  const data =
    listRes ?? { items: [], total: 0, page: 1, pageSize: 24 };
  const hotNotebooks: NotebookListItem[] =
    hotByVotes.items.length > 0 ? hotByVotes.items : hotRecent.items;
  const hotNotebooksSource: "votes" | "recent" =
    hotByVotes.items.length > 0 ? "votes" : "recent";

  const filterBase = {
    status,
    q,
    grower,
    breeder,
    strainSlug: strainSlug || undefined,
  };

  return (
    <main className="mx-auto max-w-[88rem] px-4 py-8">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)_minmax(0,19rem)] lg:items-start lg:gap-8">
        {/* Left: hot notebooks — one boxed card per notebook */}
        <aside className="order-2 space-y-4 border-t border-[var(--gn-border)] pt-10 lg:order-1 lg:border-t-0 lg:border-r lg:border-[var(--gn-border)] lg:pr-6 lg:pt-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
            Hot notebooks
          </h2>
          <p className="text-xs leading-snug text-[var(--gn-text-muted)]">
            {hotNotebooksSource === "votes"
              ? "Top by community votes, then recently updated."
              : "Recently updated—vote ranking unavailable on this build."}
          </p>
          {hotNotebooks.length > 0 ? (
            <div className="space-y-3">
              {hotNotebooks.map((n, i) => {
                const growerName =
                  n.owner.displayName?.trim() || "Grower";
                const href = `/notebooks/${encodeURIComponent(n.id)}`;
                return (
                  <article
                    key={n.id}
                    className="group relative overflow-hidden rounded-xl border border-[var(--gn-border)] bg-gradient-to-br from-[var(--gn-surface-muted)] to-[var(--gn-surface)] p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                  >
                    <Link
                      href={href}
                      className="absolute inset-0 z-10 rounded-xl outline-none ring-[#ff4500] ring-offset-2 ring-offset-[var(--gn-page-mid)] focus-visible:ring-2"
                      aria-label={`Open notebook: ${n.title}`}
                    />
                    <div className="relative z-20 flex gap-2.5 pointer-events-none">
                      <NotebookCardAvatar
                        avatarUrl={n.owner.avatarUrl}
                        displayName={n.owner.displayName}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
                          #{i + 1}
                        </p>
                        <p className="text-sm font-semibold leading-snug text-[var(--gn-text)] transition-colors group-hover:text-[#ff5414] line-clamp-2">
                          {n.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--gn-text-muted)] truncate">
                          {growerName}
                        </p>
                        <p className="mt-1.5 text-xs text-[var(--gn-text-muted)]">
                          Score{" "}
                          <span className="font-medium text-[var(--gn-text)]">
                            {n.score}
                          </span>
                          <span className="mx-1">·</span>
                          <span
                            className={`inline rounded-full px-1.5 py-0.5 capitalize ring-1 ${statusPillClass(n.status)}`}
                          >
                            {n.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--gn-text-muted)]">
              No public notebooks yet.
            </p>
          )}
        </aside>

        {/* Center: directory (unchanged) */}
        <div className="order-1 lg:order-2 min-w-0">
          <h1 className="text-2xl font-bold text-[var(--gn-text)]">
            Notebooks
          </h1>
          <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
            Public notebooks shared by the community.
          </p>
          <Link
            href="/notebooks/new"
            className="mt-6 inline-flex rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,69,0,0.35)] hover:bg-[#ff5414]"
          >
            Set up your notebook
          </Link>

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
                <Link href="/notebooks" className="text-[#ff4500] hover:underline">
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
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
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

          <ul className="mt-8 space-y-4">
            {data.items.map((n) => {
              const growerName =
                n.owner.displayName?.trim() || "Grower";
              const strainLabel =
                n.strain?.name?.trim() ||
                n.customStrainLabel?.trim() ||
                null;
              const notebookHref = `/notebooks/${encodeURIComponent(n.id)}`;
              return (
                <li key={n.id}>
                  <article className="group relative rounded-2xl border border-[var(--gn-border)] bg-gradient-to-br from-[var(--gn-surface-muted)] to-[var(--gn-surface)] p-4 shadow-sm ring-1 ring-black/5 transition hover:border-[var(--gn-text-muted)] dark:ring-white/5">
                    <Link
                      href={notebookHref}
                      className="absolute inset-0 z-10 rounded-2xl outline-none ring-[#ff4500] ring-offset-2 ring-offset-[var(--gn-page-mid)] focus-visible:ring-2"
                      aria-label={`Open notebook: ${n.title}`}
                    />
                    <div className="pointer-events-none relative z-20 flex gap-3 sm:gap-4">
                      <NotebookCardAvatar
                        avatarUrl={n.owner.avatarUrl}
                        displayName={n.owner.displayName}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-base font-semibold text-[var(--gn-text)] transition-colors group-hover:text-[#ff5414]">
                            {n.title}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${statusPillClass(n.status)}`}
                          >
                            {n.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-[var(--gn-text-muted)]">
                          <Link
                            href={`/u/${encodeURIComponent(n.owner.id)}`}
                            className="relative z-30 inline pointer-events-auto font-medium text-[var(--gn-text)] hover:text-[#ff5414] hover:underline"
                          >
                            {growerName}
                          </Link>
                          {strainLabel ? (
                            <>
                              {" · "}
                              {n.strain?.slug ? (
                                <Link
                                  href={`/strains/${encodeURIComponent(n.strain.slug)}`}
                                  className="relative z-30 inline pointer-events-auto hover:text-[#ff5414] hover:underline"
                                >
                                  {strainLabel}
                                </Link>
                              ) : (
                                strainLabel
                              )}
                            </>
                          ) : null}
                          {n.breeder ? (
                            <>
                              {" · "}
                              <Link
                                href={`/breeders/${encodeURIComponent(n.breeder.slug)}`}
                                className="relative z-30 inline pointer-events-auto hover:text-[#ff5414] hover:underline"
                              >
                                {n.breeder.name}
                              </Link>
                            </>
                          ) : null}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--gn-text-muted)]">
                          <span>
                            Score{" "}
                            <span className="font-medium text-[var(--gn-text)]">
                              {n.score}
                            </span>
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span>Updated {formatListDate(n.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
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
                  className="text-[#ff4500] hover:underline"
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
                  className="text-[#ff4500] hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}

          {data.items.length === 0 ? (
            <p className="mt-8 text-sm text-[var(--gn-text-muted)]">
              No notebooks match these filters. Try widening search or{" "}
              <Link href="/notebooks" className="text-[#ff4500] hover:underline">
                clear filters
              </Link>
              .
            </p>
          ) : null}
        </div>

        {/* Right: explainer copy */}
        <aside className="order-3 space-y-6 border-t border-[var(--gn-border)] pt-10 lg:border-t-0 lg:border-l lg:border-[var(--gn-border)] lg:pl-6 lg:pt-0">
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
                  className="text-[#ff4500] hover:underline"
                >
                  Set up your notebook
                </Link>
                .
              </li>
              <li>
                Add title and your first week. Link a cultivar from the{" "}
                <Link href="/strains" className="text-[#ff4500] hover:underline">
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
        </aside>
      </div>
    </main>
  );
}
