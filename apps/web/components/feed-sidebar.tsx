import Link from "next/link";
import { apiFetch } from "@/lib/api-public";

type HotPost = {
  id: string;
  title: string;
  score?: number | null;
  media?: { url: string; type: string }[] | null;
  author?: { displayName?: string | null } | null;
  community?: { slug?: string | null; name?: string | null } | null;
};

type Community = {
  id: string;
  slug: string;
  name: string;
  iconKey?: string | null;
  memberCount?: number | null;
};

async function fetchHotPosts(): Promise<HotPost[]> {
  try {
    const res = await apiFetch<{ items: HotPost[] }>(
      "/posts/hot/week?pageSize=5",
    );
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
  growersOnline = 0,
  hideHotPosts = false,
}: {
  growersOnline?: number;
  hideHotPosts?: boolean;
}) {
  const [hotPosts, communities] = await Promise.all([
    hideHotPosts ? Promise.resolve([]) : fetchHotPosts(),
    fetchCommunities(),
  ]);

  const spotlightCommunity = communities[0] ?? null;
  const moreCommunities = communities.slice(1);

  return (
    <aside className="flex flex-col gap-5">

      {/* Growing right now */}
      <div className="overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--gn-text)]">
              {growersOnline > 0 ? growersOnline.toLocaleString() : "—"}{" "}
              growers growing right now
            </p>
            <p className="text-xs text-[var(--gn-text-muted)]">
              Share your grow with the community
            </p>
          </div>
        </div>
      </div>

      {/* Hot this week */}
      {!hideHotPosts && hotPosts.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
          <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
              🔥 Hot this week
            </h2>
            <Link
              href="/hot"
              className="text-xs text-[var(--gn-accent)] hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="divide-y divide-[var(--gn-divide)]">
            {hotPosts.map((p, i) => {
              const thumb = p.media?.find((m) => m.type === "image");
              return (
                <li key={p.id}>
                  <Link
                    href={`/p/${p.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--gn-surface-hover)]"
                  >
                    <span className="mt-1 w-4 shrink-0 text-center text-xs font-bold text-[var(--gn-text-muted)]">
                      {i + 1}
                    </span>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb.url}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--gn-surface-elevated)] text-2xl">
                        🌿
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--gn-text)]">
                        {p.title}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--gn-text-muted)]">
                        {p.community?.name ?? "Community"}
                        {p.score != null ? ` · ${p.score} pts` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Community spotlight */}
      {spotlightCommunity ? (
        <div className="overflow-hidden rounded-xl border border-[var(--gn-accent)]/25 bg-[var(--gn-surface-muted)]">
          <div className="border-b border-[var(--gn-divide)] px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--gn-accent)]">
              Community Spotlight
            </p>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gn-surface-elevated)] text-lg font-bold text-[var(--gn-text)]">
                {spotlightCommunity.name.charAt(0).toUpperCase()}
              </span>
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
        <div className="overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
          <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
              🌱 Communities
            </h2>
            <Link
              href="/community"
              className="text-xs text-[var(--gn-accent)] hover:underline"
            >
              All
            </Link>
          </div>
          <ul className="divide-y divide-[var(--gn-divide)]">
            {moreCommunities.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/community/${c.slug}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--gn-surface-hover)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gn-surface-elevated)] text-sm font-bold text-[var(--gn-text)]">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--gn-text)]">
                      {c.name}
                    </p>
                    {c.memberCount != null && c.memberCount > 0 ? (
                      <p className="text-[10px] text-[var(--gn-text-muted)]">
                        {c.memberCount.toLocaleString()} members
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Communities fallback (no spotlight) */}
      {!spotlightCommunity && communities.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]">
          <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
              🌱 Communities
            </h2>
            <Link
              href="/community"
              className="text-xs text-[var(--gn-accent)] hover:underline"
            >
              All
            </Link>
          </div>
          <ul className="divide-y divide-[var(--gn-divide)]">
            {communities.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/community/${c.slug}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--gn-surface-hover)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gn-surface-elevated)] text-sm font-bold text-[var(--gn-text)]">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--gn-text)]">
                      {c.name}
                    </p>
                    {c.memberCount != null && c.memberCount > 0 ? (
                      <p className="text-[10px] text-[var(--gn-text-muted)]">
                        {c.memberCount.toLocaleString()} members
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Start growing CTA */}
      <div className="overflow-hidden rounded-xl border border-emerald-600/30 bg-gradient-to-br from-emerald-950/60 via-emerald-900/30 to-emerald-800/10 p-5">
        <div className="mb-2 text-3xl">📓</div>
        <p className="mb-1 text-sm font-bold text-[var(--gn-text)]">
          Start your grow journal
        </p>
        <p className="mb-4 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          Log weekly progress, photos, and metrics. Share your grow with the
          community.
        </p>
        <Link
          href="/notebooks/new"
          className="flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-neutral-950 transition hover:bg-emerald-400"
        >
          🌱 Start a notebook
        </Link>
      </div>
    </aside>
  );
}
