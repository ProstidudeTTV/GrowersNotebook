import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FeedPostCardList } from "@/components/feed-post-card-list";
import { FeedSidebar } from "@/components/feed-sidebar";
import { PostComposerPrompt } from "@/components/post-composer-prompt";
import { SitePageShell } from "@/components/site-page-shell";
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

function HotEmptyState({
  range,
  signedIn,
}: {
  range: ValidRange;
  signedIn: boolean;
}) {
  const windowLabel =
    range === "day" ? "today" : range === "week" ? "this week" : "this month";

  return (
    <div className="space-y-4">
      <EmptyState
        icon="🌱"
        title={`No posts yet ${windowLabel}`}
        description="Be the first to start a discussion — share your grow, ask a question, or post harvest photos."
        action={
          signedIn
            ? { label: "Create a post", href: "/new-post" }
            : { label: "Sign in to post", href: "/login" }
        }
      />
      <p className="text-center text-sm text-[var(--gn-text-muted)]">
        <Link href="/community" className="font-medium text-[var(--gn-accent)] hover:underline">
          Browse communities
        </Link>{" "}
        to find growers to follow.
      </p>
    </div>
  );
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

  const banner = (
    <div className="border-b border-[var(--gn-divide)] bg-gradient-to-r from-[var(--gn-surface-raised)] via-[var(--gn-surface-elevated)] to-[var(--gn-surface-raised)] px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-[var(--gn-container-max)] px-[var(--gn-gutter-mobile)] sm:px-[var(--gn-gutter)]">
        <h1 className="text-3xl font-black tracking-tight text-[var(--gn-text)]">
          {config.heading}
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--gn-text-muted)]">
          {config.subheading}
        </p>
      </div>
    </div>
  );

  return (
    <SitePageShell banner={banner} className="pb-12 pt-6">
      <div className="mb-6 flex w-fit gap-2 rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-1">
        {(Object.entries(RANGE_CONFIG) as [ValidRange, (typeof RANGE_CONFIG)[ValidRange]][]).map(
          ([key, { label }]) => (
            <Link
              key={key}
              href={`/hot?range=${key}`}
              className={
                range === key
                  ? "bg-[var(--gn-accent)] text-[var(--gn-on-accent)] rounded-full px-5 py-1.5 text-sm font-bold shadow-sm transition-all"
                  : "text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] hover:bg-[var(--gn-surface-elevated)] rounded-full px-5 py-1.5 text-sm font-medium transition-all"
              }
            >
              {label}
            </Link>
          ),
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PostComposerPrompt />
          {feed.items.length === 0 ? (
            <HotEmptyState range={range} signedIn={!!token} />
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
    </SitePageShell>
  );
}
