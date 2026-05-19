import type { Metadata } from "next";
import Link from "next/link";
import { FeedPostCardList } from "@/components/feed-post-card-list";
import { FeedSidebar } from "@/components/feed-sidebar";
import { PostComposerPrompt } from "@/components/post-composer-prompt";
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

const MOCK_PREVIEW_CARDS = [
  {
    gradient: "from-teal-900 to-cyan-800",
    emoji: "🌿",
    title: "Week 6 — Trichomes Coming In",
    author: "u/trichome_tracker",
    community: "r/Organics",
    score: 94,
  },
  {
    gradient: "from-violet-800 to-purple-600",
    emoji: "🏆",
    title: "First DWC Harvest Done!",
    author: "u/hydro_hero",
    community: "r/Hydroponics",
    score: 127,
  },
  {
    gradient: "from-amber-700 to-yellow-600",
    emoji: "☀️",
    title: "Outdoor Monster Crop Season",
    author: "u/sun_grower",
    community: "r/Outdoor",
    score: 61,
  },
];

function isValidRange(value: string): value is ValidRange {
  return value === "day" || value === "week" || value === "month";
}

function HotEmptyState({ range }: { range: ValidRange }) {
  const windowLabel =
    range === "day" ? "today" : range === "week" ? "this week" : "this month";

  return (
    <div className="rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] overflow-hidden">
      {/* Top message */}
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/10 text-4xl mb-4">
          🌱
        </div>
        <h3 className="text-xl font-bold text-[var(--gn-text)] mb-2">
          No posts yet {windowLabel}
        </h3>
        <p className="text-sm text-[var(--gn-text-muted)] max-w-sm mb-6">
          Be the first to start a discussion. Share your grow, ask a question, or post your latest
          harvest photos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/community"
            className="inline-flex items-center justify-center rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--gn-text)] transition hover:border-[var(--gn-accent)]/30 hover:bg-[var(--gn-surface-muted)]"
          >
            Browse Communities
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-bold text-[var(--gn-on-accent)] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--gn-accent)_40%,transparent)] transition hover:brightness-110"
          >
            Share Your Grow →
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 px-6 pb-4">
        <div className="h-px flex-1 bg-[var(--gn-divide)]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
          What growers are sharing
        </span>
        <div className="h-px flex-1 bg-[var(--gn-divide)]" />
      </div>

      {/* Mock preview cards */}
      <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-3">
        {MOCK_PREVIEW_CARDS.map((card, i) => (
          <Link
            key={i}
            href="/community"
            className="group overflow-hidden rounded-xl border border-[var(--gn-divide)] transition-all duration-200 hover:border-[var(--gn-accent)]/30 hover:shadow-lg hover:translate-y-[-1px]"
          >
            {/* Gradient with emoji */}
            <div
              className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${card.gradient} text-4xl`}
            >
              {card.emoji}
              {/* Score badge */}
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                <span className="text-[var(--gn-accent)]">↑</span>
                {card.score}
              </div>
            </div>
            {/* Text */}
            <div className="bg-[var(--gn-surface-elevated)] p-3">
              <p className="line-clamp-1 text-xs font-semibold text-[var(--gn-text)]">
                {card.title}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--gn-text-muted)] truncate">
                {card.author} ·{" "}
                <span className="text-[var(--gn-accent)]/80">{card.community}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
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

  return (
    <main className="mx-auto w-full max-w-[var(--gn-container-max)] px-4 pt-6 pb-12">
      <h1 className="text-3xl font-black tracking-tight text-[var(--gn-text)]">
        {config.heading}
      </h1>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--gn-text-muted)]">{config.subheading}</p>

      {/* Time-range tab pills */}
      <div className="flex gap-2 mt-5 mb-6 p-1 rounded-full bg-[var(--gn-surface-raised)] border border-[var(--gn-divide)] w-fit">
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
            <HotEmptyState range={range} />
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
