"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ModerationWarningModal } from "@/components/moderation-warning-modal";
import { apiFetch } from "@/lib/api-public";
import { formatNotifDate } from "@/lib/format-notif-date";
import { openNotificationFromUserGesture } from "@/lib/notification-open";
import { createClient } from "@/lib/supabase/client";
import { setNotificationsUnreadCount } from "@/lib/notifications-unread-store";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind?: string | null;
  actionUrl?: string | null;
  readAt: string | null;
  createdAt: string;
};

type Bucket = "Today" | "Yesterday" | "Earlier";
const BUCKETS: Bucket[] = ["Today", "Yesterday", "Earlier"];

function getBucket(dateStr: string): Bucket {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const notifDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (notifDay >= today) return "Today";
  if (notifDay >= yesterday) return "Yesterday";
  return "Earlier";
}

function getTypeIcon(kind?: string | null): {
  icon: string;
  colorClass: string;
} {
  switch (kind) {
    case "comment":
    case "reply":
      return {
        icon: "💬",
        colorClass:
          "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
      };
    case "follow":
      return {
        icon: "👤",
        colorClass:
          "bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
      };
    case "vote":
    case "upvote":
      return {
        icon: "▲",
        colorClass:
          "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      };
    case "mention":
      return {
        icon: "@",
        colorClass:
          "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      };
    case "moderation_warning":
      return {
        icon: "⚠",
        colorClass:
          "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300",
      };
    default:
      return {
        icon: "🔔",
        colorClass:
          "bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)]",
      };
  }
}

export function NotificationsPanel() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [warningModal, setWarningModal] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const load = useCallback(async () => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setSignedIn(false);
      setLoading(false);
      setNotificationsUnreadCount(0);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSignedIn(false);
      setLoading(false);
      setNotificationsUnreadCount(0);
      return;
    }
    setSignedIn(true);
    setLoading(true);
    try {
      const res = await apiFetch<{
        items: NotificationItem[];
        unreadCount: number;
      }>("/notifications/me?_start=0&_end=100", {
        token: session.access_token,
        timeoutMs: 15_000,
      });
      setItems(res.items);
      setNotificationsUnreadCount(res.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (nId: string) => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await apiFetch(`/notifications/me/${nId}/read`, {
        method: "PATCH",
        token: session.access_token,
      });
      const readAt = new Date().toISOString();
      setItems((prev) => {
        const next = prev.map((n) =>
          n.id === nId ? { ...n, readAt } : n,
        );
        setNotificationsUnreadCount(next.filter((x) => !x.readAt).length);
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const dismissOne = async (nId: string) => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await apiFetch(`/notifications/me/${nId}`, {
        method: "DELETE",
        token: session.access_token,
      });
      setItems((prev) => {
        const next = prev.filter((n) => n.id !== nId);
        setNotificationsUnreadCount(next.filter((x) => !x.readAt).length);
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const clearAll = async () => {
    if (
      !window.confirm(
        "Delete all notifications? This cannot be undone.",
      )
    ) {
      return;
    }
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await apiFetch("/notifications/me", {
        method: "DELETE",
        token: session.access_token,
      });
      setItems([]);
      setNotificationsUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await apiFetch("/notifications/me/read-all", {
        method: "PATCH",
        token: session.access_token,
      });
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? now })),
      );
      setNotificationsUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  if (signedIn === false) {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">
        <Link
          href="/login"
          className="font-medium text-[var(--gn-accent)] hover:underline"
        >
          Sign in
        </Link>{" "}
        to view notifications.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--gn-surface-muted)]" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3.5 w-3/4 rounded bg-[var(--gn-surface-muted)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--gn-surface-muted)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const unread = items.filter((n) => !n.readAt).length;

  const grouped = items.reduce<Record<Bucket, NotificationItem[]>>(
    (acc, n) => {
      acc[getBucket(n.createdAt)].push(n);
      return acc;
    },
    { Today: [], Yesterday: [], Earlier: [] },
  );

  const hasAnyItems = items.length > 0;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--gn-text-muted)]">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {hasAnyItems ? (
              <button
                type="button"
                className="text-sm font-semibold text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] hover:underline"
                onClick={() => void clearAll()}
              >
                Clear all
              </button>
            ) : null}
            {unread > 0 ? (
              <button
                type="button"
                className="text-sm font-semibold text-[var(--gn-accent)] hover:underline"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
        </div>

        {!hasAnyItems ? (
          <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-10 text-center">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm font-medium text-[var(--gn-text)]">Nothing here yet</p>
            <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
              You&apos;ll get notified when someone comments, votes, or follows you.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {BUCKETS.map((bucket) => {
              const bucketItems = grouped[bucket];
              if (bucketItems.length === 0) return null;
              return (
                <div key={bucket}>
                  <div className="sticky top-0 z-10 bg-[var(--gn-surface-muted)]/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-muted)] py-2 px-1">
                    {bucket}
                  </div>
                  <ul className="divide-y divide-[var(--gn-divide)] rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface)]">
                    {bucketItems.map((n) => {
                      const { icon, colorClass } = getTypeIcon(n.kind);
                      const isUnread = !n.readAt;
                      return (
                        <li
                          key={n.id}
                          className={`flex ${isUnread ? "border-l-2 border-[var(--gn-accent)]" : "border-l-2 border-transparent"}`}
                        >
                          <button
                            type="button"
                            className={`flex min-w-0 flex-1 flex-row items-start gap-3 py-3 text-left transition hover:bg-[var(--gn-surface-hover)] ${isUnread ? "pl-3 pr-4 bg-[var(--gn-surface-raised)]" : "pl-4 pr-4 bg-transparent"}`}
                            onClick={() =>
                              openNotificationFromUserGesture({
                                n,
                                title: n.title,
                                body: n.body,
                                markRead,
                                setModerationModal: setWarningModal,
                                router,
                              })
                            }
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${colorClass}`}
                            >
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-[var(--gn-text)] leading-snug">
                                  {n.title}
                                </span>
                                <span className="text-xs text-[var(--gn-text-muted)] shrink-0 pt-0.5">
                                  {formatNotifDate(n.createdAt)}
                                </span>
                              </div>
                              <span className="text-sm leading-snug text-[var(--gn-text-muted)]">
                                {n.kind === "moderation_warning"
                                  ? "Tap to read the full message from moderators."
                                  : n.body}
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="shrink-0 self-stretch border-l border-[var(--gn-divide)] px-3 text-xs font-medium text-[var(--gn-text-muted)] transition hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
                            aria-label={`Dismiss notification: ${n.title}`}
                            onClick={() => void dismissOne(n.id)}
                          >
                            Dismiss
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ModerationWarningModal
        open={warningModal !== null}
        title={warningModal?.title ?? ""}
        body={warningModal?.body ?? ""}
        onClose={() => setWarningModal(null)}
      />
    </>
  );
}
