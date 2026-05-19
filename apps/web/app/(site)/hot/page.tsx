import type { Metadata } from "next";
import Link from "next/link";
import { FeedPostCardList } from "@/components/feed-post-card-list";
import { FeedSidebar } from "@/components/feed-sidebar";
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

type ValidRange = "day" | "week" | "month";

const RANGE_CONFIG: Record<ValidRange, { label: string; heading: string; subheading: string }> = {
  day: {
    label: "Today",
    heading: "Hot today",
    subheading: "Posts from the last 24 hours, ranked by net upvotes.",
  },
  week: {
    label: "This Week",
    heading: "Hot this week",
    subheading:
      "Posts from the last seven days, ranked by net upvotes—the same list as in the sidebar. Newer posts break ties when scores match.",
  },
  month: {
    label: "This Month",
    heading: "Hot this month",
    subheading: "Posts from the last 30 days, ranked by net upvotes.",
  },
};

function isValidRange(value: string): value is ValidRange {
  return value === "day" || value === "week" || value === "month";
}

export default async function HotWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = 20;
  const range: ValidRange = isValidRange(sp.range ?? "") ? (sp.range as ValidRange) : "week";
  const config = RANGE_CONFIG[range];

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
    feed = await apiFetch<FeedResponse>(`/posts/hot/${range}?${qs.toString()}`, {
      token: token ?? undefined,
    });
  } catch {
    /* API offline */
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-text)]">
        {config.heading}
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">{config.subheading}</p>

      {/* Time-range tab pills */}
      <div className="flex gap-2 mt-4 mb-5">
        {(Object.entries(RANGE_CONFIG) as [ValidRange, (typeof RANGE_CONFIG)[ValidRange]][]).map(
          ([key, { label }]) => (
            <Link
              key={key}
              href={`/hot?range=${key}`}
              className={
                range === key
                  ? "bg-[var(--gn-accent)] text-white rounded-full px-4 py-1.5 text-sm font-medium"
                  : "text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] rounded-full px-4 py-1.5 text-sm"
              }
            >
              {label}
            </Link>
          ),
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {feed.items.length === 0 ? (
            <div className="text-center py-10 gn-panel rounded-2xl">
              <div className="text-4xl mb-3">🌿</div>
              <h3 className="text-lg font-semibold text-[var(--gn-text)] mb-2">
                No hot posts yet
              </h3>
              <p className="text-sm text-[var(--gn-text-muted)] mb-5">
                Be the first to start a discussion in a community.
              </p>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 bg-[var(--gn-accent)] text-white rounded-full px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Browse Communities
              </Link>
            </div>
          ) : (
            <FeedPostCardList items={feed.items} showRanks />
          )}

          {feed.total > feed.pageSize ? (
            <div className="mt-6 flex justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link
                  className="text-[var(--gn-accent)] hover:underline"
                  href={`/hot?range=${range}&page=${page - 1}`}
                >
                  Previous
                </Link>
              ) : null}
              {page * feed.pageSize < feed.total ? (
                <Link
                  className="text-[var(--gn-accent)] hover:underline"
                  href={`/hot?range=${range}&page=${page + 1}`}
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="w-full shrink-0 lg:w-72">
          <FeedSidebar hideHotPosts />
        </div>
      </div>
    </main>
  );
}
