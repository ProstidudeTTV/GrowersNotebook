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
};

type PostHit = {
  id: string;
  title: string;
  excerpt: string | null;
  createdAt: string;
  community: { slug: string; name: string } | null;
  author: { id: string; displayName: string | null };
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = 15;

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);

  const qs = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
  });

  let profiles: ListProfiles = {
    items: [],
    total: 0,
    page: 1,
    pageSize,
  };
  let posts: ListPosts = {
    items: [],
    total: 0,
    page: 1,
    pageSize,
  };

  if (q.length >= 2) {
    try {
      const [pRes, postRes] = await Promise.all([
        apiFetch<ListProfiles>(`/profiles/search?${qs}`, {
          token: token ?? undefined,
          timeoutMs: 15_000,
        }),
        apiFetch<ListPosts>(`/posts/search?${qs}`, {
          token: token ?? undefined,
          timeoutMs: 15_000,
        }),
      ]);
      profiles = pRes;
      posts = postRes;
    } catch {
      /* empty */
    }
  }

  const buildPageLink = (next: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (next > 1) p.set("page", String(next));
    return `/search?${p.toString()}`;
  };

  const profilePages = Math.max(1, Math.ceil(profiles.total / pageSize));
  const postPages = Math.max(1, Math.ceil(posts.total / pageSize));
  const showPager = profilePages > 1 || postPages > 1;
  const maxPage = Math.max(profilePages, postPages);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">Search</h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Growers (public profiles) and posts matching your words.
      </p>

      {q.length > 0 && q.length < 2 ? (
        <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Enter at least 2 characters.
        </p>
      ) : null}

      {q.length >= 2 ? (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-[var(--gn-text)]">
              Growers
              <span className="ml-2 text-sm font-normal text-[var(--gn-text-muted)]">
                ({profiles.total})
              </span>
            </h2>
            {profiles.items.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
                No public profiles matched.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {profiles.items.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/u/${p.id}`}
                      className="block rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 transition hover:bg-[var(--gn-surface-elevated)]"
                    >
                      <span className="font-medium text-[#ff6a38]">
                        {p.displayName?.trim() || "Grower"}
                      </span>
                      {p.description?.trim() ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--gn-text-muted)]">
                          {p.description.trim()}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-[var(--gn-text)]">
              Posts
              <span className="ml-2 text-sm font-normal text-[var(--gn-text-muted)]">
                ({posts.total})
              </span>
            </h2>
            {posts.items.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
                No posts matched.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {posts.items.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/p/${post.id}`}
                      className="block rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 transition hover:bg-[var(--gn-surface-elevated)]"
                    >
                      <span className="font-medium text-[#ff6a38]">
                        {post.title}
                      </span>
                      <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                        {post.author.displayName?.trim() || "Grower"}
                        {post.community ? (
                          <>
                            {" "}
                            ·{" "}
                            <span className="text-[var(--gn-text)]">
                              c/{post.community.slug}
                            </span>
                          </>
                        ) : null}
                        {" · "}
                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      {post.excerpt?.trim() ? (
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--gn-text-muted)]">
                          {post.excerpt.trim()}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {showPager && page < maxPage ? (
            <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link
                  href={buildPageLink(page - 1)}
                  className="text-[#ff6a38] hover:underline"
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
                  href={buildPageLink(page + 1)}
                  className="text-[#ff6a38] hover:underline"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <p className="mt-6 text-sm text-[var(--gn-text-muted)]">
          Use the search field in the header to find growers and posts.
        </p>
      )}
    </main>
  );
}
