"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { setNotificationsUnreadCount } from "@/lib/notifications-unread-store";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--gn-text-muted)]">
          {unread > 0
            ? `${unread} unread`
            : "You’re all caught up."}
        </p>
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
      {items.length === 0 ? (
        <p className="rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-4 py-8 text-center text-sm text-[var(--gn-text-muted)]">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--gn-divide)] rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface)]">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-[var(--gn-surface-hover)] ${
                  !n.readAt
                    ? "bg-[color-mix(in_srgb,var(--gn-accent)_6%,transparent)]"
                    : ""
                }`}
                onClick={() => {
                  if (!n.readAt) void markRead(n.id);
                }}
              >
                <span className="font-medium text-[var(--gn-text)]">
                  {n.title}
                </span>
                <span className="text-sm leading-snug text-[var(--gn-text-muted)]">
                  {n.body}
                </span>
                <span className="text-[0.65rem] text-[var(--gn-text-muted)]">
                  {formatNotifDate(n.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatNotifDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
