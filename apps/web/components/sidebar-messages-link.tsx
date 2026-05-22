"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import {
  getMessagesUnreadSnapshot,
  subscribeMessagesUnread,
} from "@/lib/messages-unread-store";

function IconMessage({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="17"
      height="17"
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

export function SidebarMessagesLink({
  className,
  onNavigate,
  children,
}: {
  className: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const { anyUnread } = useSyncExternalStore(
    subscribeMessagesUnread,
    getMessagesUnreadSnapshot,
    getMessagesUnreadSnapshot,
  );

  return (
    <Link href="/messages" className={className} onClick={onNavigate}>
      <span className="relative inline-flex shrink-0">
        <IconMessage />
        {anyUnread ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--gn-accent)] ring-2 ring-[var(--gn-surface-raised)]"
            aria-hidden
          />
        ) : null}
      </span>
      {children}
    </Link>
  );
}
