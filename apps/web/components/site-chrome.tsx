"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppSidebar,
  type SidebarCommunity,
  type SidebarHotPost,
} from "@/components/app-sidebar";
import { AppVersionRefresh } from "@/components/app-version-refresh";
import { MailingListPrompt } from "@/components/mailing-list-prompt";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { clientApiJson } from "@/lib/client-api";
import type { PublicSiteConfigPayload } from "@/lib/public-site-config";
import { isViewportLockedPath } from "@/lib/viewport-scroll";

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function SiteChrome({
  children,
  modal,
  initialFollowedCommunities,
  initialHotWeekPosts,
  motdText,
  announcement,
  mailingListNudgeRecommended,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
  initialFollowedCommunities: SidebarCommunity[];
  initialHotWeekPosts: SidebarHotPost[];
  motdText: string | null;
  announcement: PublicSiteConfigPayload["announcement"];
  mailingListNudgeRecommended: boolean;
}) {
  const { userId } = useAuth();
  const authed = Boolean(userId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [followed, setFollowed] = useState<SidebarCommunity[]>(
    initialFollowedCommunities,
  );
  const [ann, setAnn] = useState(announcement);
  const pathname = usePathname();
  const viewportLocked = isViewportLockedPath(pathname);
  const hideFooter = viewportLocked;

  useEffect(() => {
    setFollowed(initialFollowedCommunities);
  }, [initialFollowedCommunities]);

  useEffect(() => {
    setAnn(announcement);
  }, [announcement]);

  /** Refresh banner from API so admin-published announcements show without a full redeploy. */
  useEffect(() => {
    let cancelled = false;
    void clientApiJson<{ announcement?: PublicSiteConfigPayload["announcement"] }>(
      "/site/public-config",
    )
      .then((j) => {
        if (cancelled || !j) return;
        setAnn(j.announcement ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const annStyle =
    ann?.style === "warning"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : "border-sky-500/35 bg-sky-500/10 text-sky-100";

  /** Mobile drawer `--gn-mobile-drawer-top` assumes header only; extend when MOTD / banner sit under header. */
  const mobileTopExtraRem =
    (motdText?.trim() ? 2 : 0) + (ann ? 3.5 : 0);
  const stickyTopRem = 3.5 + mobileTopExtraRem;

  return (
    <div
      className="gn-site-chrome flex h-dvh max-h-dvh flex-col overflow-hidden"
      style={
        {
          ["--gn-sidebar-sticky-top" as string]: `${stickyTopRem}rem`,
          ...(mobileTopExtraRem > 0
            ? {
                ["--gn-mobile-drawer-top" as string]: `calc(${7.75 + mobileTopExtraRem}rem + env(safe-area-inset-top, 0px))`,
              }
            : {}),
        }
      }
    >
      <AppVersionRefresh />
      <SiteHeader
        leading={
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </button>
        }
      />

      {motdText?.trim() ? (
        <p className="border-b border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-1.5 text-center text-xs text-[var(--gn-text-muted)]">
          {motdText.trim()}
        </p>
      ) : null}

      {ann ? (
        <div
          role="status"
          className={`border-b px-4 py-3 text-center text-sm ${annStyle}`}
        >
          {ann.title?.trim() ? (
            <p className="font-semibold">{ann.title.trim()}</p>
          ) : null}
          {ann.body?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap opacity-95">
              {ann.body.trim()}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="relative z-0 flex min-h-0 flex-1 items-stretch">
        <button
          type="button"
          className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-200 ease-out lg:hidden ${
            mobileOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          aria-label="Close menu"
          aria-hidden={!mobileOpen}
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
        />

        <AppSidebar
          followedCommunities={followed}
          hotWeekPosts={initialHotWeekPosts}
          authed={authed}
          onNavigate={() => setMobileOpen(false)}
          className={
            "fixed bottom-0 left-0 z-[45] max-lg:top-[var(--gn-mobile-drawer-top)] max-lg:h-[calc(100dvh-var(--gn-mobile-drawer-top))] max-lg:max-h-[calc(100dvh-var(--gn-mobile-drawer-top))] w-[var(--gn-rail-width)] max-w-[85vw] shrink-0 border-r transition-transform duration-200 ease-out lg:sticky lg:top-[var(--gn-sidebar-sticky-top)] lg:z-auto lg:h-[calc(100dvh-var(--gn-sidebar-sticky-top))] lg:max-h-[calc(100dvh-var(--gn-sidebar-sticky-top))] lg:max-w-none lg:overflow-hidden lg:border-r lg:transition-none " +
            (mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0")
          }
        />

        <div
          className={`gn-app-canvas flex min-h-0 min-w-0 flex-1 flex-col ${
            viewportLocked
              ? "overflow-hidden"
              : "overflow-y-auto overflow-x-hidden overscroll-contain"
          }`}
        >
          {viewportLocked ? (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          ) : (
            children
          )}
          {hideFooter ? null : <SiteFooter />}
        </div>
      </div>
      {modal}
      <MailingListPrompt
        authed={authed}
        nudgeRecommended={mailingListNudgeRecommended}
      />
    </div>
  );
}
