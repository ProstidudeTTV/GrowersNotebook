"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getMessagesUnreadSnapshot,
  subscribeMessagesUnread,
} from "@/lib/messages-unread-store";

const linkClass =
  "relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[#ff6a38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6a38]";

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

export function MessagesNavLink() {
  const { anyUnread } = useSyncExternalStore(
    subscribeMessagesUnread,
    getMessagesUnreadSnapshot,
    getMessagesUnreadSnapshot,
  );

  return (
    <Link
      href="/messages"
      className={linkClass}
      aria-label={anyUnread ? "Messages (unread)" : "Messages"}
    >
      <span className="relative inline-flex shrink-0">
        <IconMessage className="h-[1.125rem] w-[1.125rem]" />
        {anyUnread ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#ff6a38] ring-2 ring-[var(--gn-surface)]"
            aria-hidden
          />
        ) : null}
      </span>
      <span className="hidden sm:inline">Messages</span>
    </Link>
  );
}
