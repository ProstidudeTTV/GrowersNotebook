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
          className="font-medium text-[#ff4500] hover:underline"
        >
          Sign in
        </Link>{" "}
        to view notifications.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">Loading…</p>
    );
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--gn-text-muted)]">
          {unread > 0
            ? `${unread} unread`
            : "You’re all caught up."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {items.length > 0 ? (
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
              className="text-sm font-semibold text-[#ff4500] hover:underline"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-4 py-8 text-center text-sm text-[var(--gn-text-muted)]">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--gn-divide)] rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface)]">
          {items.map((n) => (
            <li key={n.id} className="flex">
              <button
                type="button"
                className={`flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left transition hover:bg-[var(--gn-surface-hover)] ${
                  !n.readAt
                    ? "bg-[color-mix(in_srgb,var(--gn-accent)_6%,transparent)]"
                    : ""
                }`}
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
                <span className="font-medium text-[var(--gn-text)]">
                  {n.title}
                </span>
                <span className="text-sm leading-snug text-[var(--gn-text-muted)]">
                  {n.kind === "moderation_warning"
                    ? "Tap to read the full message from moderators."
                    : n.body}
                </span>
                <span className="text-[0.65rem] text-[var(--gn-text-muted)]">
                  {formatNotifDate(n.createdAt)}
                </span>
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
          ))}
        </ul>
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
