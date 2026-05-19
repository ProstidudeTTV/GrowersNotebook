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

  return (
    <aside className="flex flex-col gap-4">
      {/* Growers online pill */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm text-[var(--gn-text)]">
          <strong>{growersOnline > 0 ? growersOnline.toLocaleString() : "—"}</strong>
          <span className="text-[var(--gn-text-muted)]"> growers online</span>
        </span>
      </div>

      {/* Hot this week */}
      {!hideHotPosts && hotPosts.length > 0 ? (
        <div className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--gn-divide)]">
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
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--gn-surface-hover)] transition-colors"
                  >
                    <span className="mt-0.5 text-xs font-bold text-[var(--gn-text-muted)] w-4 shrink-0 text-center">
                      {i + 1}
                    </span>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb.url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--gn-surface-elevated)] text-lg">
                        🌿
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--gn-text)]">
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--gn-text-muted)]">
                        {p.community?.name ?? "Community"} ·{" "}
                        {p.score != null ? `${p.score} pts` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Communities */}
      {communities.length > 0 ? (
        <div className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--gn-divide)]">
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
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--gn-surface-hover)] transition-colors"
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
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <div className="text-2xl mb-2">📓</div>
        <p className="text-sm font-semibold text-[var(--gn-text)] mb-1">
          Track your grow
        </p>
        <p className="text-xs text-[var(--gn-text-muted)] mb-3">
          Log weekly progress, photos, and metrics in a public grow journal.
        </p>
        <Link
          href="/notebooks/new"
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 transition-colors"
        >
          Start a notebook
        </Link>
      </div>
    </aside>
  );
}
