import type { Metadata } from "next";
import Link from "next/link";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export const metadata: Metadata = {
  title: "Search",
  description: `Find growers and posts on ${SITE_NAME}.`,
  robots: { index: false, follow: true },
  alternates: { canonical: canonicalPath("/search") },
};

type ProfileHit = {
  id: string;
  displayName: string | null;
  description: string | null;
  avatarUrl: string | null;
  growerLevel?: string | null;
  isFollowing?: boolean;
};

type PostHit = {
  id: string;
  title: string;
  excerpt: string | null;
  createdAt: string;
  imageUrl?: string | null;
  score?: number | null;
  community: { slug: string; name: string } | null;
  author: { id: string; displayName: string | null };
};

type StrainHit = {
  id: string;
  slug: string;
  name: string | null;
  chemotype?: "indica" | "sativa" | "hybrid" | null;
};

type ListProfiles = {
  items: ProfileHit[];
  total: number;
  page: number;
  pageSize: number;
};

type ListPosts = {
  items: PostHit[];
  total: number;
  page: number;
  pageSize: number;
};

type ListStrains = {
  items: StrainHit[];
  total: number;
  page: number;
  pageSize: number;
};

type FilterType = "all" | "growers" | "posts" | "strains" | "notebooks";

/** Small avatar used in search result rows (40 px). */
function SearchAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  displayName: string | null;
}) {
  const label = (displayName ?? "G").trim();
  const initial = label.charAt(0).toUpperCase() || "?";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--gn-ring)]"
      />
    );
  }
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-sm font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
      aria-hidden
    >
      {initial}
    </span>
  );
}

const chemotypePill: Record<string, string> = {
  indica: "bg-purple-900/40 text-purple-300 border-purple-700/40",
  sativa: "bg-orange-900/40 text-orange-300 border-orange-700/40",
  hybrid: "bg-teal-900/40 text-teal-300 border-teal-700/40",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = 15;
  const rawType = sp.type ?? "all";
  const activeType: FilterType =
    rawType === "growers" ||
    rawType === "posts" ||
    rawType === "strains" ||
    rawType === "notebooks"
      ? rawType
      : "all";

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);

  const qs = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
  });

  let profiles: ListProfiles = { items: [], total: 0, page: 1, pageSize };
  let posts: ListPosts = { items: [], total: 0, page: 1, pageSize };
  let strains: ListStrains = { items: [], total: 0, page: 1, pageSize };

  const showGrowers = activeType === "all" || activeType === "growers";
  const showPosts = activeType === "all" || activeType === "posts";
  const showStrains = activeType === "all" || activeType === "strains";

  if (q.length >= 2) {
    try {
      const fetches: Promise<unknown>[] = [];
      if (showGrowers)
        fetches.push(
          apiFetch<ListProfiles>(`/profiles/search?${qs}`, {
            token: token ?? undefined,
            timeoutMs: 15_000,
          }).then((r) => {
            profiles = r;
          }),
        );
      if (showPosts)
        fetches.push(
          apiFetch<ListPosts>(`/posts/search?${qs}`, {
            token: token ?? undefined,
            timeoutMs: 15_000,
          }).then((r) => {
            posts = r;
          }),
        );
      if (showStrains) {
        const strainQs = new URLSearchParams({ q, pageSize: String(pageSize) });
        fetches.push(
          apiFetch<ListStrains>(`/strains?${strainQs}`, {
            token: token ?? undefined,
            timeoutMs: 15_000,
          }).then((r) => {
            strains = r;
          }),
        );
      }
      await Promise.all(fetches);
    } catch {
      /* empty */
    }
  }

  const buildLink = (params: {
    type?: FilterType;
    page?: number;
  }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const t = params.type ?? activeType;
    if (t !== "all") p.set("type", t);
    if (params.page != null && params.page > 1)
      p.set("page", String(params.page));
    const s = p.toString();
    return `/search${s ? `?${s}` : ""}`;
  };

  const profilePages = Math.max(1, Math.ceil(profiles.total / pageSize));
  const postPages = Math.max(1, Math.ceil(posts.total / pageSize));
  const maxPage = Math.max(profilePages, postPages);
  const showPager = maxPage > 1;

  const filterTabs: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Growers", value: "growers" },
    { label: "Posts", value: "posts" },
    { label: "Strains", value: "strains" },
    { label: "Notebooks", value: "notebooks" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* G3.1 — On-page search input */}
      <form action="/search" method="GET" className="mb-6">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gn-text-muted)]">
            🔍
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search growers, posts, strains..."
            className="gn-input w-full rounded-full py-3 pl-11 pr-4 text-base"
            autoFocus={!q}
          />
        </div>
      </form>

      {/* G3.2 — Category filter tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildLink({ type: tab.value, page: 1 })}
            className={
              activeType === tab.value
                ? "rounded-full bg-[var(--gn-accent)] px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full px-4 py-1.5 text-sm text-[var(--gn-text-muted)] hover:text-[var(--gn-text)]"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Short-query warning */}
      {q.length > 0 && q.length < 2 ? (
        <p className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Enter at least 2 characters.
        </p>
      ) : null}

      {/* G3.5 — Empty / zero-query state */}
      {q.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-[var(--gn-text)] mb-2">
            Find your people
          </h3>
          <p className="text-sm text-[var(--gn-text-muted)]">
            Search for growers, posts, strains, and notebooks.
          </p>
        </div>
      ) : q.length >= 2 ? (
        <>
          {/* Notebooks tab — coming soon */}
          {activeType === "notebooks" ? (
            <div className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-6 py-10 text-center">
              <p className="text-2xl mb-3">📓</p>
              <p className="font-semibold text-[var(--gn-text)]">
                Notebook search coming soon
              </p>
              <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                You can browse notebooks from a grower&apos;s profile page.
              </p>
            </div>
          ) : null}

          {/* G3.3 — Growers section */}
          {showGrowers ? (
            <section className={activeType === "all" ? "mb-10" : undefined}>
              <h2 className="mb-4 text-lg font-semibold text-[var(--gn-text)]">
                Growers
                <span className="ml-2 text-sm font-normal text-[var(--gn-text-muted)]">
                  ({profiles.total})
                </span>
              </h2>
              {profiles.items.length === 0 ? (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  No public profiles matched.
                </p>
              ) : (
                <ul className="space-y-3">
                  {profiles.items.map((p) => (
                    <li key={p.id}>
                      <div className="gn-card flex items-center gap-3 p-3">
                        <Link
                          href={`/u/${p.id}`}
                          className="shrink-0"
                          tabIndex={-1}
                          aria-hidden
                        >
                          <SearchAvatar
                            avatarUrl={p.avatarUrl}
                            displayName={p.displayName}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/u/${p.id}`}
                              className="font-semibold text-[var(--gn-accent)] hover:underline"
                            >
                              {p.displayName?.trim() || "Grower"}
                            </Link>
                            {p.growerLevel?.trim() ? (
                              <span className="inline-flex items-center rounded-full border border-[var(--gn-accent)]/30 bg-[var(--gn-accent)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--gn-accent)]">
                                {p.growerLevel.trim()}
                              </span>
                            ) : null}
                          </div>
                          {p.description?.trim() ? (
                            <p className="mt-0.5 line-clamp-1 text-sm text-[var(--gn-text-muted)]">
                              {p.description.trim()}
                            </p>
                          ) : null}
                        </div>
                        <Link
                          href={`/u/${p.id}`}
                          className="ml-auto shrink-0 rounded-full border border-[var(--gn-accent)] px-3 py-1 text-xs text-[var(--gn-accent)] transition-colors hover:bg-[var(--gn-accent)] hover:text-white"
                        >
                          {p.isFollowing ? "Following" : "Follow"}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* G3.4 — Posts section */}
          {showPosts ? (
            <section className={activeType === "all" ? "mb-10" : undefined}>
              <h2 className="mb-4 text-lg font-semibold text-[var(--gn-text)]">
                Posts
                <span className="ml-2 text-sm font-normal text-[var(--gn-text-muted)]">
                  ({posts.total})
                </span>
              </h2>
              {posts.items.length === 0 ? (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  No posts matched.
                </p>
              ) : (
                <ul className="space-y-3">
                  {posts.items.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/p/${post.id}`}
                        className="gn-card flex items-start gap-3 p-3 transition hover:shadow-[var(--gn-shadow-md)]"
                      >
                        {post.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug text-[var(--gn-text)]">
                            {post.title}
                          </p>
                          {post.excerpt?.trim() ? (
                            <p className="mt-1 line-clamp-2 text-sm text-[var(--gn-text-muted)]">
                              {post.excerpt.trim()}
                            </p>
                          ) : null}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--gn-text-muted)]">
                            {post.community ? (
                              <span className="font-medium text-[var(--gn-text)]">
                                c/{post.community.slug}
                              </span>
                            ) : null}
                            <span>
                              {post.author.displayName?.trim() || "Grower"}
                            </span>
                            {post.score != null ? (
                              <>
                                <span aria-hidden>·</span>
                                <span>{post.score} pts</span>
                              </>
                            ) : null}
                            <span aria-hidden>·</span>
                            <span>
                              {new Date(post.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* Strains section */}
          {showStrains ? (
            <section className={activeType === "all" ? "mb-10" : undefined}>
              <h2 className="mb-4 text-lg font-semibold text-[var(--gn-text)]">
                Strains
                <span className="ml-2 text-sm font-normal text-[var(--gn-text-muted)]">
                  ({strains.total})
                </span>
              </h2>
              {strains.items.length === 0 ? (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  No strains matched.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {strains.items.map((s) => (
                    <Link
                      key={s.id}
                      href={`/strains/${s.slug}`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition hover:shadow-[var(--gn-shadow-sm)] ${
                        s.chemotype && chemotypePill[s.chemotype]
                          ? chemotypePill[s.chemotype]
                          : "border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] text-[var(--gn-text)]"
                      }`}
                    >
                      {s.name ?? s.slug}
                      {s.chemotype ? (
                        <span className="opacity-70 text-xs capitalize">
                          {s.chemotype}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {/* Pagination */}
          {showPager && (activeType === "all" || activeType === "growers" || activeType === "posts") ? (
            <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link
                  href={buildLink({ page: page - 1 })}
                  className="text-[var(--gn-accent)] hover:underline"
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-[var(--gn-text-muted)]">
                Page {page}
                {maxPage > 1 ? ` / ${maxPage}` : ""}
              </span>
              {page < maxPage ? (
                <Link
                  href={buildLink({ page: page + 1 })}
                  className="text-[var(--gn-accent)] hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
