import Link from "next/link";
import type { SidebarHotPost } from "@/components/app-sidebar";
import { formatVoteScore } from "@/lib/grower-display";

function truncateTitle(title: string | null | undefined, maxChars: number) {
  const t = String(title ?? "").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

function IconLeaf({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 18 2c1 2 2 4.5 2 8a9 9 0 1 1-9 10Z" />
      <path d="M11.5 13.5c2.5-2.5 5-3 7-3" />
    </svg>
  );
}

export function CommunityWarmRail({
  hotWeekPosts,
  authed,
}: {
  hotWeekPosts: SidebarHotPost[];
  authed: boolean;
}) {
  return (
    <aside
      className="hidden w-72 shrink-0 xl:block"
      aria-label="Community highlights"
    >
      <div
        className="sticky space-y-4 px-4 py-6"
        style={{ top: "var(--gn-rail-sticky-top)" }}
      >
        <section className="gn-warm-rail-card">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--gn-forest)_12%,var(--gn-surface-muted))] text-[var(--gn-forest)] dark:text-emerald-400">
              <IconLeaf />
            </span>
            <h2 className="text-sm font-semibold text-[var(--gn-text)]">
              Community pulse
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--gn-text-muted)]">
            Live grower counts are on the way. Meanwhile, jump into what&apos;s
            happening:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <Link
                href={authed ? "/following" : "/login"}
                className="block rounded-2xl px-2.5 py-1.5 font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-forest)] dark:hover:text-emerald-400"
              >
                {authed ? "Your feed" : "Sign in for your feed"}
              </Link>
            </li>
            <li>
              <Link
                href="/hot"
                className="block rounded-2xl px-2.5 py-1.5 font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[#ff6a38]"
              >
                Hot this week
              </Link>
            </li>
            <li>
              <Link
                href="/strains"
                className="block rounded-2xl px-2.5 py-1.5 font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-amber)]"
              >
                Trending strains
              </Link>
            </li>
          </ul>
        </section>

        <section className="gn-warm-rail-card">
          <h2 className="text-sm font-semibold text-[var(--gn-text)]">
            Trending discussions
          </h2>
          {hotWeekPosts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {hotWeekPosts.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/p/${p.id}`}
                    className="block rounded-2xl px-2 py-1.5 text-xs leading-snug transition hover:bg-[var(--gn-surface-hover)]"
                  >
                    <span className="font-semibold text-[var(--gn-forest)] dark:text-emerald-400">
                      #{i + 1}
                    </span>{" "}
                    <span className="text-[var(--gn-text)]">
                      {truncateTitle(p.title, 48)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--gn-text-muted)]">
                      {formatVoteScore(p.score)} votes
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
              No posts in the last week yet — be the first to share a grow
              update.
            </p>
          )}
          <Link
            href="/hot"
            className="mt-3 inline-block text-xs font-medium text-[#ff6a38] hover:underline"
          >
            See all hot posts →
          </Link>
        </section>

        <section className="gn-warm-rail-card">
          <h2 className="text-sm font-semibold text-[var(--gn-text)]">
            Grower notebooks
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--gn-text-muted)]">
            Track runs, feeding, and environment like a backyard journal—not a
            spreadsheet.
          </p>
          <Link
            href="/notebooks?status=active"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--gn-forest)] transition hover:underline dark:text-emerald-400"
          >
            Open notebooks →
          </Link>
        </section>
      </div>
    </aside>
  );
}
