"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ModerationWarningModal } from "@/components/moderation-warning-modal";
import { apiFetch } from "@/lib/api-public";
import { formatNotifDate } from "@/lib/format-notif-date";
import { openNotificationFromUserGesture } from "@/lib/notification-open";
import { createClient } from "@/lib/supabase/client";
import {
  getNotificationsUnreadSnapshot,
  setNotificationsUnreadCount,
  subscribeNotificationsUnread,
} from "@/lib/notifications-unread-store";

const triggerClass =
  "relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--gn-text-muted)] transition hover:text-[#ff6a38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6a38]";

type NavNotification = {
  id: string;
  title: string;
  body: string;
  kind?: string | null;
  actionUrl?: string | null;
  readAt: string | null;
  createdAt: string;
};

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
  const router = useRouter();
  /** null: checking session; only render the control when true (signed in). */
  const [showNav, setShowNav] = useState<boolean | null>(null);
  const unread = useSyncExternalStore(
    subscribeNotificationsUnread,
    getNotificationsUnreadSnapshot,
    () => 0,
  );
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NavNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [warningModal, setWarningModal] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = "gn-notifications-nav-menu";

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setShowNav(false);
      return;
    }
    const sync = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authed = Boolean(session?.access_token);
      setShowNav(authed);
      if (!authed) {
        setOpen(false);
        setItems([]);
        setNotificationsUnreadCount(0);
      }
    };
    void sync();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });
    return () => subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setItems([]);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{
        items: NavNotification[];
        unreadCount: number;
      }>("/notifications/me?_start=0&_end=5", {
        token: session.access_token,
        timeoutMs: 12_000,
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
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (showNav !== true) return null;

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

  return (
    <>
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        onClick={() => setOpen((o) => !o)}
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
        <span className="hidden sm:inline">Notifications</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Recent notifications"
          className="gn-menu absolute right-0 top-full z-50 mt-1 w-[min(100vw-1.5rem,22rem)] max-w-[22rem] py-1 shadow-[var(--gn-shadow-lg)]"
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-[var(--gn-text-muted)]">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--gn-text-muted)]">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-[min(60vh,20rem)] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--gn-surface-hover)] ${
                      !n.readAt
                        ? "bg-[color-mix(in_srgb,var(--gn-accent)_8%,transparent)]"
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
                        onNavigate: () => setOpen(false),
                      })
                    }
                  >
                    <span className="font-medium text-[var(--gn-text)]">
                      {n.title}
                    </span>
                    <span className="line-clamp-2 text-xs text-[var(--gn-text-muted)]">
                      {n.kind === "moderation_warning"
                        ? "Tap to read the full message from moderators."
                        : n.body}
                    </span>
                    <span className="text-[0.65rem] text-[var(--gn-text-muted)]">
                      {formatNotifDate(n.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-1 border-t border-[var(--gn-divide)] px-2 py-1.5">
            {!loading && items.length > 0 ? (
              <button
                type="button"
                role="menuitem"
                className="rounded-md px-2 py-1.5 text-center text-xs font-medium text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
                onClick={() => void clearAll()}
              >
                Clear all
              </button>
            ) : null}
            <Link
              href="/notifications"
              role="menuitem"
              className="block rounded-md px-2 py-2 text-center text-sm font-semibold text-[#ff4500] hover:bg-[var(--gn-surface-hover)]"
              onClick={() => setOpen(false)}
            >
              Show more
            </Link>
          </div>
        </div>
      ) : null}
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
