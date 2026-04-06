"use client";

import { useEffect, useState } from "react";
import {
  AppSidebar,
  type SidebarCommunity,
  type SidebarHotPost,
} from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

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
  initialFollowedCommunities,
  initialHotWeekPost,
  authed,
}: {
  children: React.ReactNode;
  initialFollowedCommunities: SidebarCommunity[];
  initialHotWeekPost: SidebarHotPost | null;
  authed: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [followed, setFollowed] = useState<SidebarCommunity[]>(
    initialFollowedCommunities,
  );

  useEffect(() => {
    setFollowed(initialFollowedCommunities);
  }, [initialFollowedCommunities]);

  return (
    <div className="flex min-h-screen flex-col">
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
            "fixed bottom-0 left-0 top-14 z-50 w-60 max-w-[85vw] border-r transition-transform duration-200 ease-out lg:static lg:top-auto lg:z-auto lg:w-56 lg:max-w-none lg:border-r lg:transition-none " +
            (mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0")
          }
        />

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
