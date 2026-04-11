"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getNotificationsUnreadSnapshot,
  subscribeNotificationsUnread,
} from "@/lib/notifications-unread-store";

const linkClass =
  "relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[#ff6a38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6a38]";

function IconBell({ className }: { className?: string }) {
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function NotificationsNavLink() {
  const unread = useSyncExternalStore(
    subscribeNotificationsUnread,
    getNotificationsUnreadSnapshot,
    () => 0,
  );

  return (
    <Link
      href="/notifications"
      className={linkClass}
      aria-label={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
    >
      <span className="relative inline-flex shrink-0">
        <IconBell className="h-[1.125rem] w-[1.125rem]" />
        {unread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#ff4500] ring-2 ring-[var(--gn-surface)]"
            aria-hidden
          />
        ) : null}
      </span>
      Notifications
    </Link>
  );
}
