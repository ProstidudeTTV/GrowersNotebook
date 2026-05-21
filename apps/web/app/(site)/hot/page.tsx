import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FeedSidebar } from "@/components/feed-sidebar";
import { HotWeekPageLeaderboard } from "@/components/hot-week-page-leaderboard";
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

const RANGE_CONFIG: Record<
  ValidRange,
  { label: string; heading: string; subheading: string }
> = {
  day: {
    label: "Today",
    heading: "Hot today",
    subheading: "Last 24 hours · ranked by Seeds (net upvotes)",
  },
  week: {
    label: "This week",
    heading: "Hot this week",
    subheading: "Last 7 days · ranked by Seeds · ties go to newer posts",
  },
  month: {
    label: "This month",
    heading: "Hot this month",
    subheading: "Last 30 days · ranked by Seeds",
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
        <Link
          href="/community"
          className="font-medium text-[var(--gn-accent)] hover:underline"
        >
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
  const range: ValidRange = isValidRange(sp.range ?? "")
    ? (sp.range as ValidRange)
    : "week";
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
    feed = await apiFetch<FeedResponse>(
      `/posts/hot/${range}?${qs.toString()}`,
      {
        token: token ?? undefined,
      },
    );
  } catch {
    /* API offline */
  }

  const banner = (
    <div className="relative overflow-hidden border-b border-[var(--gn-divide)] bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-hot)_12%,var(--gn-surface-muted))] via-[var(--gn-surface-raised)] to-[var(--gn-surface-muted)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--gn-hot)_18%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--gn-accent)_15%,transparent)] blur-3xl" />
      <div className="relative mx-auto flex max-w-[var(--gn-container-max)] flex-col gap-4 px-[var(--gn-gutter-mobile)] py-8 sm:flex-row sm:items-end sm:justify-between sm:px-[var(--gn-gutter)] sm:py-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--gn-hot)]">
            Trending
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-black tracking-tight text-[var(--gn-text)] sm:text-4xl">
            <span aria-hidden>🔥</span>
            {config.heading}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--gn-text-muted)]">
            {config.subheading}
          </p>
        </div>
        <div className="flex w-fit flex-wrap gap-2 rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] p-1.5 shadow-[var(--gn-shadow-sm)]">
          {(Object.entries(RANGE_CONFIG) as [
            ValidRange,
            (typeof RANGE_CONFIG)[ValidRange],
          ][]).map(([key, { label }]) => (
            <Link
              key={key}
              href={`/hot?range=${key}`}
              className={
                range === key
                  ? "rounded-xl bg-[var(--gn-accent)] px-4 py-2 text-sm font-bold text-[var(--gn-on-accent)] shadow-sm"
                  : "rounded-xl px-4 py-2 text-sm font-medium text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <SitePageShell banner={banner} className="pb-12 pt-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <PostComposerPrompt />
          {feed.items.length === 0 ? (
            <HotEmptyState range={range} signedIn={!!token} />
          ) : (
            <HotWeekPageLeaderboard items={feed.items} />
          )}

          {feed.total > feed.pageSize ? (
            <div className="flex justify-center gap-4 text-sm">
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
        <aside className="w-full shrink-0 lg:w-72">
          <FeedSidebar hideHotPosts />
        </aside>
      </div>
    </SitePageShell>
  );
}
