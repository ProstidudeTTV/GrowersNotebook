"use client";

import { useEffect, useState } from "react";
import {
  AppSidebar,
  type SidebarCommunity,
  type SidebarHotPost,
} from "@/components/app-sidebar";
import { AppVersionRefresh } from "@/components/app-version-refresh";
import { SiteHeader } from "@/components/site-header";
import type { PublicSiteConfigPayload } from "@/lib/public-site-config";

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
  initialHotWeekPost,
  authed,
  motdText,
  announcement,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
  initialFollowedCommunities: SidebarCommunity[];
  initialHotWeekPost: SidebarHotPost | null;
  authed: boolean;
  motdText: string | null;
  announcement: PublicSiteConfigPayload["announcement"];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [followed, setFollowed] = useState<SidebarCommunity[]>(
    initialFollowedCommunities,
  );

  useEffect(() => {
    setFollowed(initialFollowedCommunities);
  }, [initialFollowedCommunities]);

  const annStyle =
    announcement?.style === "warning"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : "border-sky-500/35 bg-sky-500/10 text-sky-100";

  return (
    <div className="flex min-h-screen flex-col">
      <AppVersionRefresh />
      {motdText?.trim() ? (
        <p className="border-b border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-1.5 text-center text-xs text-[var(--gn-text-muted)]">
          {motdText.trim()}
        </p>
      ) : null}
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

      {announcement ? (
        <div
          role="status"
          className={`border-b px-4 py-3 text-sm ${annStyle}`}
        >
          {announcement.title?.trim() ? (
            <p className="font-semibold">{announcement.title.trim()}</p>
          ) : null}
          {announcement.body?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap opacity-95">
              {announcement.body.trim()}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <AppSidebar
          followedCommunities={followed}
          hotWeekPost={initialHotWeekPost}
          authed={authed}
          onNavigate={() => setMobileOpen(false)}
          className={
            "fixed bottom-0 left-0 z-[45] max-lg:top-[var(--gn-mobile-drawer-top)] max-lg:h-[calc(100dvh-var(--gn-mobile-drawer-top))] max-lg:max-h-[calc(100dvh-var(--gn-mobile-drawer-top))] w-60 max-w-[85vw] border-r transition-transform duration-200 ease-out lg:static lg:top-auto lg:z-auto lg:h-auto lg:max-h-none lg:w-56 lg:max-w-none lg:border-r lg:transition-none " +
            (mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0")
          }
        />

        <div className="gn-app-canvas min-w-0 min-h-0 flex-1 overflow-x-clip">
          {children}
        </div>
      </div>
      {modal}
    </div>
  );
}
