import type { Metadata } from "next";
import Link from "next/link";
import { PostFeedList } from "@/components/post-feed-list";
import { apiFetch } from "@/lib/api-public";
import type { FeedPost } from "@/lib/feed-post";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { SITE_NAME, SITE_TAGLINE, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Hot posts this week",
  description: `Trending cannabis home grow posts — ${SITE_TAGLINE}`,
  openGraph: {
    title: `Hot this week · ${SITE_NAME}`,
    description: SITE_TAGLINE,
    url: canonicalPath("/hot"),
  },
  alternates: { canonical: canonicalPath("/hot") },
};

type FeedResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

export default async function HotWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = 20;

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);

  let feed: FeedResponse = {
    items: [],
    total: 0,
    page: 1,
    pageSize,
  };
  try {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    feed = await apiFetch<FeedResponse>(`/posts/hot/week?${qs.toString()}`, {
      token: token ?? undefined,
    });
  } catch {
    /* API offline */
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-text)]">
        Hot this week
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Posts from the last seven days, ranked by net upvotes—the same list as
        in the sidebar. Newer posts break ties when scores match.
      </p>

      {feed.items.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--gn-text-muted)]">
          No posts in the last week yet.
        </p>
      ) : (
        <div className="mt-6">
          <PostFeedList items={feed.items} />
        </div>
      )}

      {feed.total > feed.pageSize ? (
        <div className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              className="text-[#ff4500] hover:underline"
              href={`/hot?page=${page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {page * feed.pageSize < feed.total ? (
            <Link
              className="text-[#ff4500] hover:underline"
              href={`/hot?page=${page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
