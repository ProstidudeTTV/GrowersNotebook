"use client";

import { useSyncExternalStore } from "react";
import {
  getMessagesUnreadSnapshot,
  subscribeMessagesUnread,
} from "@/lib/messages-unread-store";

/** Unread dot for sidebar Messages nav (place on `NavIcon` wrapper). */
export function MessagesUnreadDot() {
  const { anyUnread } = useSyncExternalStore(
    subscribeMessagesUnread,
    getMessagesUnreadSnapshot,
    getMessagesUnreadSnapshot,
  );
  if (!anyUnread) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--gn-accent)] ring-2 ring-[var(--gn-surface-raised)]"
      aria-hidden
    />
  );
}
