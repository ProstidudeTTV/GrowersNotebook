"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { SiteBrand } from "@/components/site-brand";

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

function truncateTitle(title: string | null | undefined, maxChars: number) {
  const t = String(title ?? "").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

/* ─── Nav Icons ──────────────────────────────────────────────────────────── */
function IconFlame({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.58-.95-3.62-2-5 1.38.85 3.1 2.42 4 4.5 0 0 1-2.33 2-5.5.73 2.58.5 5.5.5 6.5a6 6 0 1 1-11 0c0-1.12.28-2.19.8-3.15a4 4 0 0 0 4.2 6.15Z" />
    </svg>
  );
}
function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}
function IconNotebook({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /><path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}
function IconLeaf({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconDna({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 15c6.667-6 13.333 0 20-6" /><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" /><path d="M15 2c-1.798 2-2.518 4-2.807 6" /><path d="m17 6-2.5-2.5" /><path d="m14 8-1-1" /><path d="m7 18 2.5 2.5" /><path d="m3.5 14.5.5.5" /><path d="m20 9 .5.5" /><path d="m6.5 12.5 1 1" /><path d="m16.5 10.5 1 1" /><path d="m10 16 1.5 1.5" />
    </svg>
  );
}
function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconLogOut({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34L5.33 5A10 10 0 0 0 3.34 7l-1.59 1.66a10 10 0 0 0 .01 6.68l1.59 1.66A10 10 0 0 0 5 18.99l1.66 1.59a10 10 0 0 0 6.68.01l1.66-1.59A10 10 0 0 0 20.66 17l1.59-1.66a10 10 0 0 0-.01-6.68L20.66 7A10 10 0 0 0 19.07 4.93Z" />
    </svg>
  );
}
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 text-[var(--gn-text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ─── Nav item primitives ────────────────────────────────────────────────── */
const navItem =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--gn-text)] transition-all duration-150 hover:bg-[var(--gn-surface-hover)] active:scale-[0.98]";

const sectionLabel =
  "px-3 pt-4 pb-1 text-[0.6rem] font-bold uppercase tracking-widest text-[var(--gn-text-muted)]";

/* ─── Colored icon chip ──────────────────────────────────────────────────── */
function NavIcon({
  children,
  color = "text-[var(--gn-text-muted)]",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color}`}>
      {children}
    </span>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
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
  onNavigate?: () => void;
  className?: string;
}) {
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [recentCommunities, setRecentCommunities] = useState<RecentCommunity[]>([]);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const pathname = usePathname();
  const afterNav = useCallback(() => { onNavigate?.(); }, [onNavigate]);

  const isNavActive = useCallback(
    (href: string) => {
      if (href === "/following") {
        return pathname === "/" || pathname === "/following";
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const navClass = useCallback(
    (href: string, extra = "") => {
      const active = isNavActive(href);
      return [
        navItem,
        active
          ? "bg-[var(--gn-surface-hover)] font-semibold text-[var(--gn-accent)]"
          : "",
        extra,
      ]
        .filter(Boolean)
        .join(" ");
    },
    [isNavActive],
  );

  const navAriaCurrent = (href: string) =>
    isNavActive(href) ? ("page" as const) : undefined;

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
        meta?.display_name?.trim() || meta?.full_name?.trim() || session.user.email?.split("@")[0] || "Grower",
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
      className={`flex min-h-0 flex-col ${className}`}
      style={{ background: "var(--gn-sidebar-bg, var(--gn-surface-muted))" }}
      aria-label="Site navigation"
    >
      {/* ── Brand ────────────────────────────────────────────────────── */}
      <Link
        href={authed ? "/following" : "/"}
        onClick={afterNav}
        className="group flex items-center border-b border-[var(--gn-divide)] px-3 py-3 transition-opacity hover:opacity-90"
      >
        <SiteBrand size="md" className="w-full" />
      </Link>

      {/* ── Create Post CTA ──────────────────────────────────────────── */}
      {authed ? (
        <div className="px-3 pt-3">
          <Link
            href="/new-post"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gn-accent)] px-4 py-2 text-sm font-bold text-[var(--gn-on-accent)] shadow-[0_2px_12px_-3px_var(--gn-accent)] transition-all hover:brightness-110 active:scale-[0.97]"
            onClick={afterNav}
            title="Create a new post"
            aria-current={navAriaCurrent("/new-post")}
          >
            <IconPlus />
            New Post
          </Link>
        </div>
      ) : null}

      {/* ── Scrollable nav ──────────────────────────────────────────── */}
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pb-3">

        {/* Primary — Feed & Messages */}
        <div className="mt-2 space-y-0.5">
          <Link
            href={authed ? "/following" : "/"}
            className={navClass(authed ? "/following" : "/")}
            onClick={afterNav}
            aria-current={navAriaCurrent(authed ? "/following" : "/")}
          >
            <NavIcon color="bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]">
              <IconHome />
            </NavIcon>
            {authed ? "Your Feed" : "Home"}
          </Link>

          {authed ? (
            <Link
              href="/messages"
              className={navClass("/messages")}
              onClick={afterNav}
              aria-current={navAriaCurrent("/messages")}
            >
              <NavIcon color="bg-sky-500/15 text-sky-500 dark:text-sky-400">
                <IconMessage />
              </NavIcon>
              Messages
            </Link>
          ) : null}
        </div>

        <div className="mx-3 mt-3 border-t border-[var(--gn-divide)]" />

        {/* Explore */}
        <p className={sectionLabel}>Explore</p>
        <div className="space-y-0.5">
          <Link
            href="/hot"
            className={navClass("/hot")}
            onClick={afterNav}
            aria-current={navAriaCurrent("/hot")}
          >
            <NavIcon color="bg-orange-500/15 text-orange-500">
              <IconFlame />
            </NavIcon>
            Hot This Week
          </Link>

          {/* Top posts preview */}
          {hotWeekPosts.length > 0 ? (
            <ul className="ml-10 mb-1 space-y-0.5">
              {hotWeekPosts.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/p/${p.id}`}
                    onClick={afterNav}
                    className="block rounded-lg px-2 py-1 text-left text-[11px] leading-snug text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
                  >
                    <span className="font-semibold text-[var(--gn-accent)]">#{i + 1}</span>{" "}
                    {truncateTitle(p.title, 36)}{" "}
                    <span className="opacity-50">· {formatVoteScore(p.score)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            href="/community"
            className={navClass("/community")}
            onClick={afterNav}
            aria-current={navAriaCurrent("/community")}
          >
            <NavIcon color="bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]">
              <IconUsers />
            </NavIcon>
            Communities
          </Link>

          <Link href="/notebooks?status=active" className={navItem} onClick={afterNav}>
            <NavIcon color="bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]">
              <IconNotebook />
            </NavIcon>
            Notebooks
          </Link>

          <Link href="/strains" className={navItem} onClick={afterNav}>
            <NavIcon color="bg-lime-500/15 text-lime-600 dark:text-lime-400">
              <IconLeaf />
            </NavIcon>
            Strains
          </Link>

          <Link href="/breeders" className={navItem} onClick={afterNav}>
            <NavIcon color="bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <IconDna />
            </NavIcon>
            Breeders
          </Link>

          <Link href="/catalog/suggest" className={navItem} onClick={afterNav}>
            <NavIcon color="bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)]">
              <IconPlus />
            </NavIcon>
            Suggest a Strain
          </Link>
        </div>

        <div className="mx-3 mt-3 border-t border-[var(--gn-divide)]" />

        {/* Communities */}
        <div className="mt-0.5">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[var(--gn-surface-hover)]"
            onClick={() => setCommunitiesOpen((o) => !o)}
            aria-expanded={communitiesOpen}
          >
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
              {authed ? "Your Communities" : "Communities"}
            </span>
            <Chevron open={communitiesOpen} />
          </button>

          {communitiesOpen ? (
            <ul className="mt-0.5 space-y-0.5">
              <li>
                <Link
                  href="/community"
                  className={navClass("/community", "text-[var(--gn-text-muted)]")}
                  onClick={afterNav}
                  aria-current={navAriaCurrent("/community")}
                >
                  <NavIcon color="bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)]">
                    <IconUsers />
                  </NavIcon>
                  Browse All
                </Link>
              </li>

              {authed && followedCommunities.length === 0 ? (
                <li className="px-3 py-2 text-[11px] leading-snug text-[var(--gn-text-muted)]">
                  Join communities to see them here.
                </li>
              ) : null}

              {!authed ? (
                <li className="px-3 py-2 text-[11px] leading-snug text-[var(--gn-text-muted)]">
                  <Link href="/login" className="font-semibold text-[var(--gn-accent)] hover:underline" onClick={afterNav}>
                    Sign in
                  </Link>{" "}
                  to see your communities.
                </li>
              ) : null}

              {followedCommunities.map((c) => (
                <li key={c.id}>
                  <Link href={`/community/${c.slug}`} className={`${navItem} min-w-0`} title={c.name} onClick={afterNav}>
                    <CommunityIcon
                      iconKey={c.iconKey}
                      nameFallback={c.name}
                      slugFallback={c.slug}
                      frameClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
                    />
                    <span className="min-w-0 truncate text-sm">{c.name}</span>
                  </Link>
                </li>
              ))}

              {recentCommunities.length > 0 ? (
                <>
                  <li className="mt-1.5 list-none border-t border-[var(--gn-divide)] pt-1.5">
                    <p className="px-3 pb-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
                      Recent
                    </p>
                  </li>
                  {recentCommunities.slice(0, 6).map((c) => (
                    <li key={`recent-${c.slug}`}>
                      <Link href={`/community/${c.slug}`} className={`${navItem} min-w-0`} title={c.name} onClick={afterNav}>
                        <CommunityIcon
                          iconKey={c.iconKey}
                          nameFallback={c.name}
                          slugFallback={c.slug}
                          frameClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
                        />
                        <span className="min-w-0 truncate text-sm">{c.name}</span>
                      </Link>
                    </li>
                  ))}
                </>
              ) : null}
            </ul>
          ) : null}
        </div>
      </nav>

      {/* ── User footer ──────────────────────────────────────────────── */}
      {authed ? (
        <div className="shrink-0 border-t border-[var(--gn-divide)] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Link
              href={userId ? `/u/${userId}` : "/settings/profile"}
              onClick={afterNav}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-[var(--gn-surface-hover)]"
            >
              <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--gn-accent)]/30">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[var(--gn-accent)]/20 text-sm font-bold text-[var(--gn-accent)]">
                    {(userDisplayName ?? "G").charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[var(--gn-text)]">
                  {userDisplayName ?? "Grower"}
                </span>
                <span className="block text-[0.6rem] text-[var(--gn-text-muted)]">View profile</span>
              </span>
            </Link>
            <Link
              href="/settings/profile"
              onClick={afterNav}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
              title="Settings"
              aria-label="Settings"
            >
              <IconSettings />
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
            className="flex w-full items-center justify-center rounded-xl border border-[var(--gn-accent)]/30 bg-[var(--gn-accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--gn-accent)] transition hover:bg-[var(--gn-accent)]/15"
          >
            Sign in to grow with us
          </Link>
        </div>
      )}
    </aside>
  );
}
