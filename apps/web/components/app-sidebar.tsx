"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getRecentCommunities,
  RECENT_COMMUNITIES_EVENT,
  RECENT_COMMUNITIES_STORAGE_KEY,
  type RecentCommunity,
} from "@/lib/recent-communities";
import { CommunityIcon } from "@/components/community-icon";
import { formatVoteScore } from "@/lib/grower-display";
import { createClient } from "@/lib/supabase/client";

export type SidebarCommunity = {
  id: string;
  slug: string;
  name: string;
  iconKey?: string | null;
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
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.58-.95-3.62-2-5 1.38.85 3.1 2.42 4 4.5 0 0 1-2.33 2-5.5.73 2.58.5 5.5.5 6.5a6 6 0 1 1-11 0c0-1.12.28-2.19.8-3.15a4 4 0 0 0 4.2 6.15Z" />
    </svg>
  );
}

function truncateTitle(title: string | null | undefined, maxChars: number) {
  const t = String(title ?? "").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

function IconHome({ className }: { className?: string }) {
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
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconMessage({ className }: { className?: string }) {
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
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

function IconNotebookNav({ className }: { className?: string }) {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSeedling({ className }: { className?: string }) {
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
      <path d="M12 22V12" />
      <path d="M5 12c0-3.87 3.13-7 7-7s7 3.13 7 7H5Z" />
    </svg>
  );
}

function IconLogOut({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
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

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const navItem =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--gn-text)] transition-colors hover:bg-[var(--gn-surface-hover)] active:scale-[0.98]";

const sectionLabel =
  "px-3 pb-1 pt-3 text-[0.6rem] font-bold uppercase tracking-widest text-[var(--gn-text-muted)]";

export function AppSidebar({
  followedCommunities,
  hotWeekPosts,
  authed,
  onNavigate,
  className = "",
}: {
  followedCommunities: SidebarCommunity[];
  hotWeekPosts: SidebarHotPost[];
  authed: boolean;
  /** Close mobile drawer after navigation */
  onNavigate?: () => void;
  className?: string;
}) {
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const afterNav = useCallback(() => {
    onNavigate?.();
  }, [onNavigate]);

  useEffect(() => {
    const sync = () => setRecentCommunities(getRecentCommunities());
    sync();
    window.addEventListener(RECENT_COMMUNITIES_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_COMMUNITIES_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENT_COMMUNITIES_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!authed) return;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      const meta = session.user.user_metadata as Record<string, string> | undefined;
      setUserDisplayName(
        meta?.display_name?.trim() ||
        meta?.full_name?.trim() ||
        session.user.email?.split("@")[0] ||
        "Grower",
      );
      setUserAvatarUrl(meta?.avatar_url ?? null);
    });
  }, [authed]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  return (
    <aside
      className={`flex min-h-0 flex-col border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] ${className}`}
      aria-label="Site"
    >
      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-[var(--gn-divide)] px-4 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--gn-accent)] text-white">
          <IconSeedling />
        </span>
        <span className="text-base font-bold leading-tight text-[var(--gn-text)]">
          Growers<br />
          <span className="text-[var(--gn-accent)]">Notebook</span>
        </span>
      </div>

      {/* ── Create Post ─────────────────────────────────────────────── */}
      {authed ? (
        <div className="px-3 pt-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gn-accent)] px-4 py-2.5 text-sm font-bold text-white shadow transition hover:brightness-110 active:scale-[0.98]"
            onClick={afterNav}
            title="Pick a community to post in"
          >
            <IconPlus />
            Create Post
          </Link>
        </div>
      ) : null}

      {/* ── Scrollable nav ──────────────────────────────────────────── */}
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pb-3 pt-2">

        {/* Primary nav */}
        <Link
          href={authed ? "/following" : "/"}
          className={navItem}
          onClick={afterNav}
        >
          <IconHome className="shrink-0 text-[var(--gn-accent)]" />
          {authed ? "Your feed" : "Home"}
        </Link>

        {authed ? (
          <Link href="/messages" className={navItem} onClick={afterNav}>
            <IconMessage className="shrink-0 opacity-75" />
            Messages
          </Link>
        ) : null}

        <div className="my-2 border-t border-[var(--gn-divide)]" />

        {/* Explore section */}
        <p className={sectionLabel}>Explore</p>

        <Link href="/hot" className={navItem} onClick={afterNav}>
          <IconFlame className="shrink-0 text-orange-500" />
          Hot this week
        </Link>

        {hotWeekPosts.length > 0 ? (
          <ul className="mx-1 mb-1 space-y-0.5">
            {hotWeekPosts.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/p/${p.id}`}
                  onClick={afterNav}
                  className="block rounded-lg px-3 py-1.5 text-left text-xs leading-snug text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
                >
                  <span className="font-semibold text-[var(--gn-text)]">#{i + 1}</span>{" "}
                  {truncateTitle(p.title, 40)}{" "}
                  <span className="opacity-60">· {formatVoteScore(p.score)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-3 mb-1 text-xs text-[var(--gn-text-muted)]">
            No posts yet this week.
          </p>
        )}

        <Link
          href="/notebooks?status=active"
          className={navItem}
          onClick={afterNav}
        >
          <IconNotebookNav className="shrink-0 opacity-75" />
          Notebooks
        </Link>

        <Link href="/strains" className={navItem} onClick={afterNav}>
          <IconSeedling className="shrink-0 text-emerald-500" />
          Strains
        </Link>

        <Link href="/breeders" className={navItem} onClick={afterNav}>
          <IconUsers className="shrink-0 opacity-75" />
          Breeders
        </Link>

        <Link href="/catalog/suggest" className={navItem} onClick={afterNav}>
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-base leading-none">
            ➕
          </span>
          Suggest a strain
        </Link>

        <div className="my-2 border-t border-[var(--gn-divide)]" />

        {/* Communities section */}
        <div>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[var(--gn-surface-hover)]"
            onClick={() => setCommunitiesOpen((o) => !o)}
            aria-expanded={communitiesOpen}
          >
            <span className={`${sectionLabel} !px-0 !pb-0 !pt-0`}>
              {authed ? "Your Communities" : "Communities"}
            </span>
            <Chevron open={communitiesOpen} />
          </button>

          {communitiesOpen ? (
            <ul className="mt-0.5 space-y-0.5">
              <li>
                <Link
                  href="/"
                  className={`${navItem} text-[var(--gn-text-muted)]`}
                  onClick={afterNav}
                >
                  <IconUsers className="shrink-0 opacity-60" />
                  Browse communities
                </Link>
              </li>

              {authed && followedCommunities.length === 0 ? (
                <li className="px-3 py-2 text-xs leading-snug text-[var(--gn-text-muted)]">
                  Join communities from the directory. They&apos;ll appear here.
                </li>
              ) : null}

              {!authed ? (
                <li className="px-3 py-2 text-xs leading-snug text-[var(--gn-text-muted)]">
                  <Link
                    href="/login"
                    className="font-semibold text-[var(--gn-accent)] hover:underline"
                    onClick={afterNav}
                  >
                    Sign in
                  </Link>{" "}
                  to see your communities.
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
                    <CommunityIcon
                      iconKey={c.iconKey}
                      nameFallback={c.name}
                      slugFallback={c.slug}
                    />
                    <span className="min-w-0 truncate">{c.name}</span>
                  </Link>
                </li>
              ))}

              {recentCommunities.length > 0 ? (
                <>
                  <li className="mt-2 list-none border-t border-[var(--gn-divide)] pt-2">
                    <p className={`${sectionLabel} !pt-0`}>Recent</p>
                  </li>
                  {recentCommunities.slice(0, 8).map((c) => (
                    <li key={`recent-${c.slug}`}>
                      <Link
                        href={`/community/${c.slug}`}
                        className={`${navItem} min-w-0`}
                        title={c.name}
                        onClick={afterNav}
                      >
                        <CommunityIcon
                          iconKey={c.iconKey}
                          nameFallback={c.name}
                          slugFallback={c.slug}
                        />
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

      {/* ── User footer ─────────────────────────────────────────────── */}
      {authed ? (
        <div className="shrink-0 border-t border-[var(--gn-divide)] px-3 py-2">
          <div className="flex items-center gap-2.5">
            <Link
              href={userId ? `/u/${userId}` : "/settings/profile"}
              onClick={afterNav}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-[var(--gn-surface-hover)]"
            >
              <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--gn-surface-raised)] ring-2 ring-[var(--gn-divide)]">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userAvatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--gn-text-muted)]">
                    {(userDisplayName ?? "G").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--gn-text)]">
                  {userDisplayName ?? "Grower"}
                </span>
                <span className="block text-[0.65rem] text-[var(--gn-text-muted)]">View profile</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
              title="Sign out"
              aria-label="Sign out"
            >
              <IconLogOut />
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-[var(--gn-divide)] px-3 py-3">
          <Link
            href="/login"
            onClick={afterNav}
            className="flex w-full items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
          >
            Sign in
          </Link>
        </div>
      )}
    </aside>
  );
}
