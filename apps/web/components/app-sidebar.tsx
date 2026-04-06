"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getRecentCommunities,
  RECENT_COMMUNITIES_EVENT,
  RECENT_COMMUNITIES_STORAGE_KEY,
  type RecentCommunity,
} from "@/lib/recent-communities";
import { formatVoteScore } from "@/lib/grower-display";

export type SidebarCommunity = {
  id: string;
  slug: string;
  name: string;
};

export type SidebarHotPost = {
  id: string;
  title: string;
  score: number;
};

function IconFlame({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.58-.95-3.62-2-5 1.38.85 3.1 2.42 4 4.5 0 0 1-2.33 2-5.5.73 2.58.5 5.5.5 6.5a6 6 0 1 1-11 0c0-1.12.28-2.19.8-3.15a4 4 0 0 0 4.2 6.15Z" />
    </svg>
  );
}

function truncateTitle(title: string, maxChars: number) {
  const t = title.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconMessage({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-[var(--gn-text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CommunityAvatar({ name, slug }: { name: string; slug: string }) {
  const label = name.trim() || slug;
  const initial = label.charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-xs font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
      aria-hidden
    >
      {initial}
    </span>
  );
}

const navItem =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--gn-text)] transition-colors hover:bg-[var(--gn-surface-hover)]";

export function AppSidebar({
  followedCommunities,
  hotWeekPost,
  authed,
  onNavigate,
  className = "",
}: {
  followedCommunities: SidebarCommunity[];
  hotWeekPost: SidebarHotPost | null;
  authed: boolean;
  /** Close mobile drawer after navigation */
  onNavigate?: () => void;
  className?: string;
}) {
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [recentCommunities, setRecentCommunities] = useState<
    RecentCommunity[]
  >([]);

  const afterNav = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  useEffect(() => {
    const sync = () => setRecentCommunities(getRecentCommunities());
    sync();
    window.addEventListener(RECENT_COMMUNITIES_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === RECENT_COMMUNITIES_STORAGE_KEY ||
        e.key === null
      ) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENT_COMMUNITIES_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const sectionHeading =
    "flex w-full items-center justify-between px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]";

  return (
    <aside
      className={`flex flex-col border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] ${className}`}
      aria-label="Site"
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-6 pt-3">
        <Link
          href={authed ? "/following" : "/"}
          className={navItem}
          onClick={afterNav}
        >
          <IconHome className="shrink-0 opacity-90" />
          {authed ? "Your feed" : "Home"}
        </Link>

        {authed ? (
          <Link href="/messages" className={navItem} onClick={afterNav}>
            <IconMessage className="shrink-0 opacity-90" />
            Messages
          </Link>
        ) : null}

        <div className="my-3 border-t border-[var(--gn-divide)]" />

        <Link
          href="/hot"
          className={navItem}
          onClick={afterNav}
        >
          <IconFlame className="shrink-0 text-[#ff4500]" />
          Hot this week
        </Link>
        {hotWeekPost ? (
          <p className="mx-3 -mt-0.5 mb-1 line-clamp-2 text-xs leading-snug text-[var(--gn-text-muted)]">
            <span className="font-medium text-[var(--gn-text)]">#1:</span>{" "}
            {truncateTitle(hotWeekPost.title, 44)} ·{" "}
            {formatVoteScore(hotWeekPost.score)}
          </p>
        ) : (
          <p className="mx-3 -mt-0.5 mb-1 text-xs text-[var(--gn-text-muted)]">
            No posts in the last week yet.
          </p>
        )}

        <div className="my-3 border-t border-[var(--gn-divide)]" />

        <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
          Cultivars &amp; strains
        </p>
        <Link href="/strains" className={navItem} onClick={afterNav}>
          Strains
        </Link>
        <Link href="/breeders" className={navItem} onClick={afterNav}>
          Breeders
        </Link>
        <Link href="/catalog/suggest" className={navItem} onClick={afterNav}>
          Suggest an entry
        </Link>

        <div className="my-3 border-t border-[var(--gn-divide)]" />

        <div className="mt-1">
          <button
            type="button"
            className={sectionHeading}
            onClick={() => setCommunitiesOpen((o) => !o)}
            aria-expanded={communitiesOpen}
          >
            <span>Communities</span>
            <Chevron open={communitiesOpen} />
          </button>
          {communitiesOpen ? (
            <ul className="mt-1 space-y-0.5">
              <li>
                <Link
                  href="/"
                  className={`${navItem} text-[var(--gn-text-muted)]`}
                  onClick={afterNav}
                >
                  <IconUsers className="shrink-0 opacity-90" />
                  Browse communities
                </Link>
              </li>
              {authed && followedCommunities.length === 0 ? (
                <li className="px-3 py-2 text-xs leading-snug text-[var(--gn-text-muted)]">
                  Join communities from the directory. They&apos;ll show up
                  here.
                </li>
              ) : null}
              {!authed ? (
                <li className="px-3 py-2 text-xs leading-snug text-[var(--gn-text-muted)]">
                  <Link
                    href="/login"
                    className="font-medium text-[#ff4500] hover:underline"
                    onClick={afterNav}
                  >
                    Sign in
                  </Link>{" "}
                  to see communities you&apos;ve joined.
                </li>
              ) : null}
              {followedCommunities.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/community/${c.slug}`}
                    className={`${navItem} min-w-0`}
                    title={c.name}
                    onClick={afterNav}
                  >
                    <CommunityAvatar name={c.name} slug={c.slug} />
                    <span className="min-w-0 truncate">{c.name}</span>
                  </Link>
                </li>
              ))}
              {recentCommunities.length > 0 ? (
                <>
                  <li className="mt-3 list-none border-t border-[var(--gn-divide)] pt-3">
                    <h3 className="px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
                      Recent
                    </h3>
                  </li>
                  {recentCommunities.slice(0, 8).map((c) => (
                    <li key={`recent-${c.slug}`}>
                      <Link
                        href={`/community/${c.slug}`}
                        className={`${navItem} min-w-0`}
                        title={c.name}
                        onClick={afterNav}
                      >
                        <CommunityAvatar name={c.name} slug={c.slug} />
                        <span className="min-w-0 truncate">{c.name}</span>
                      </Link>
                    </li>
                  ))}
                </>
              ) : null}
            </ul>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
