import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import { HotWeekSidebarPanel } from "@/components/hot-week-sidebar-panel";
import { apiFetch } from "@/lib/api-public";
import { fetchGrowersOnlineCount } from "@/lib/growers-online";
import { createClient } from "@/lib/supabase/server";

type Community = {
  id: string;
  slug: string;
  name: string;
  iconKey?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  memberCount?: number | null;
};

async function fetchHotPosts() {
  try {
    const res = await apiFetch<{
      items: import("@/components/hot-week-sidebar-panel").HotWeekPost[];
    }>("/posts/hot/week?pageSize=5");
    return res.items ?? [];
  } catch {
    return [];
  }
}

async function fetchCommunities(): Promise<Community[]> {
  try {
    const res = await apiFetch<Community[]>("/communities");
    return Array.isArray(res) ? res.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export async function FeedSidebar({
  growersOnline: growersOnlineProp,
  hideHotPosts = false,
}: {
  growersOnline?: number;
  hideHotPosts?: boolean;
}) {
  const supabase = await createClient();
  const growersOnline =
    growersOnlineProp ??
    (await fetchGrowersOnlineCount(supabase));
  const [hotPosts, communities] = await Promise.all([
    hideHotPosts ? Promise.resolve([]) : fetchHotPosts(),
    fetchCommunities(),
  ]);

  const spotlightCommunity = communities[0] ?? null;
  const moreCommunities = communities.slice(1);

  return (
    <aside className="flex flex-col gap-5">

      {/* Growing right now */}
      <div className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gn-accent)] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--gn-accent)]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--gn-text)]">
              {growersOnline > 0 ? (
                <>
                  {growersOnline.toLocaleString()} growers active now
                </>
              ) : (
                "No growers active right now"
              )}
            </p>
            <p className="text-xs leading-relaxed text-[var(--gn-text-muted)]">
              {growersOnline > 0
                ? "Active in the last 15 minutes on Growers Notebook."
                : "Counts update when signed-in growers browse, post, or comment."}
            </p>
          </div>
        </div>
      </div>

      {!hideHotPosts ? <HotWeekSidebarPanel posts={hotPosts} /> : null}

      {/* Community spotlight */}
      {spotlightCommunity ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--gn-accent)]/25 bg-[var(--gn-surface-muted)]">
          <div className="border-b border-[var(--gn-divide)] px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--gn-accent)]">
              Community Spotlight
            </p>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <CommunityIcon
                iconKey={spotlightCommunity.iconKey}
                iconUrl={spotlightCommunity.iconUrl}
                nameFallback={spotlightCommunity.name}
                slugFallback={spotlightCommunity.slug}
                frameClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ring-1 ring-[var(--gn-ring)]"
              />
              <div className="min-w-0">
                <Link
                  href={`/community/${spotlightCommunity.slug}`}
                  className="block truncate text-sm font-bold text-[var(--gn-text)] hover:text-[var(--gn-accent)] hover:underline"
                >
                  {spotlightCommunity.name}
                </Link>
                {spotlightCommunity.memberCount != null &&
                spotlightCommunity.memberCount > 0 ? (
                  <p className="text-xs text-[var(--gn-text-muted)]">
                    {spotlightCommunity.memberCount.toLocaleString()} members
                  </p>
                ) : null}
              </div>
            </div>
            <Link
              href={`/community/${spotlightCommunity.slug}`}
              className="mt-3 flex w-full items-center justify-center rounded-full border border-[var(--gn-accent)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--gn-accent)] transition hover:bg-[var(--gn-accent)]/10"
            >
              Visit community →
            </Link>
          </div>
        </div>
      ) : null}

      {/* More communities */}
      {moreCommunities.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
          <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
              🌱 Communities
            </h2>
            <Link
              href="/community"
              className="text-xs text-[var(--gn-accent)] hover:underline"
            >
              All
            </Link>
          </div>
          <div className="px-3 py-2 space-y-1">
            {moreCommunities.map((c) => (
              <Link
                key={c.id}
                href={`/community/${c.slug}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--gn-surface-hover)]"
              >
                <CommunityIcon
                  iconKey={c.iconKey}
                  iconUrl={c.iconUrl}
                  nameFallback={c.name}
                  slugFallback={c.slug}
                  frameClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ring-[var(--gn-ring)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--gn-text)]">
                    {c.name}
                  </p>
                  {c.memberCount != null && c.memberCount > 0 ? (
                    <p className="text-xs text-[var(--gn-text-muted)]">
                      {c.memberCount.toLocaleString()} members
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Communities fallback (no spotlight) */}
      {!spotlightCommunity && communities.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
          <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
              🌱 Communities
            </h2>
            <Link
              href="/community"
              className="text-xs text-[var(--gn-accent)] hover:underline"
            >
              All
            </Link>
          </div>
          <div className="px-3 py-2 space-y-1">
            {communities.map((c) => (
              <Link
                key={c.id}
                href={`/community/${c.slug}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--gn-surface-hover)]"
              >
                <CommunityIcon
                  iconKey={c.iconKey}
                  iconUrl={c.iconUrl}
                  nameFallback={c.name}
                  slugFallback={c.slug}
                  frameClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ring-[var(--gn-ring)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--gn-text)]">
                    {c.name}
                  </p>
                  {c.memberCount != null && c.memberCount > 0 ? (
                    <p className="text-xs text-[var(--gn-text-muted)]">
                      {c.memberCount.toLocaleString()} members
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Start a Notebook CTA */}
      <div className="rounded-2xl border border-[var(--gn-accent)]/20 bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-accent)_22%,var(--gn-surface-muted))] to-[var(--gn-surface-muted)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-[var(--gn-accent)]"
            aria-hidden
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          <p className="text-sm font-bold text-[var(--gn-text)]">
            Start a Notebook
          </p>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          Log weekly progress, photos, and metrics. Share your grow with the
          community.
        </p>
        <Link
          href="/notebooks/new"
          className="flex w-full items-center justify-center rounded-full bg-[var(--gn-accent)] px-4 py-2 text-xs font-bold text-[var(--gn-on-accent)] transition hover:brightness-110"
        >
          🌱 Start a notebook
        </Link>
      </div>
    </aside>
  );
}
