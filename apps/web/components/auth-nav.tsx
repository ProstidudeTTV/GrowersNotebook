"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ModerationWarningModal } from "@/components/moderation-warning-modal";
import { apiFetch } from "@/lib/api-public";
import { DEFAULT_GROWER_RANK, formatSeeds } from "@/lib/grower-display";
import { clearPasswordRecoveryPending } from "@/lib/auth-recovery-client";
import { setNotificationsUnreadCount } from "@/lib/notifications-unread-store";
import { createClient } from "@/lib/supabase/client";

type Me = {
  displayName: string | null;
  avatarUrl: string | null;
  growerLevel: string;
  seeds: number;
  unreadNotificationCount?: number;
};

type NavNotification = {
  id: string;
  title: string;
  body: string;
  kind?: string | null;
  readAt: string | null;
  createdAt: string;
};

function displayNameFromUserMetadata(session: Session | null): string | null {
  const meta = session?.user?.user_metadata;
  if (!meta || typeof meta !== "object") return null;
  const d = (meta as { display_name?: unknown }).display_name;
  return typeof d === "string" && d.trim() ? d.trim() : null;
}

function usernameFromSession(
  me: Me | null,
  email: string | null,
  metadataDisplayName: string | null,
): string {
  const fromProfile = me?.displayName?.trim();
  if (fromProfile) return fromProfile;
  const fromMeta = metadataDisplayName?.trim();
  if (fromMeta) return fromMeta;
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
    return email;
  }
  return "Grower";
}

function UserAvatarChip({
  avatarUrl,
  label,
}: {
  avatarUrl: string | null | undefined;
  label: string;
}) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--gn-surface-muted)] ring-2 ring-[var(--gn-border)]"
      data-user-avatar
      aria-hidden
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          {initial}
        </span>
      )}
    </span>
  );
}

export function AuthNav() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorMode, setColorMode] = useState<"dark" | "light">("dark");
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [metadataDisplayName, setMetadataDisplayName] = useState<string | null>(
    null,
  );
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [warningModal, setWarningModal] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const profileFetchSeq = useRef(0);

  const applySession = useCallback(async (session: Session | null) => {
    const seq = ++profileFetchSeq.current;
    setMetadataDisplayName(displayNameFromUserMetadata(session));
    setEmail(session?.user?.email ?? null);
    setSessionUserId(session?.user?.id ?? null);
    if (!session?.access_token) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await apiFetch<Me>("/profiles/me", {
        token: session.access_token,
        timeoutMs: 12_000,
      });
      if (seq !== profileFetchSeq.current) return;
      setMe(profile);
    } catch {
      if (seq !== profileFetchSeq.current) return;
      setMe(null);
    } finally {
      if (seq === profileFetchSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = createClient();
      ({
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        void applySession(session);
      }));
      void supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          void applySession(session ?? null);
        });
    } catch {
      setLoading(false);
      return;
    }
    return () => subscription?.unsubscribe();
  }, [applySession]);

  /** Live unread badge + list freshness when the API inserts a notification row. */
  useEffect(() => {
    if (!sessionUserId) return;
    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`gn-user-notifications:${sessionUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${sessionUserId}`,
          },
          () => {
            setMe((m) =>
              m
                ? {
                    ...m,
                    unreadNotificationCount:
                      (m.unreadNotificationCount ?? 0) + 1,
                  }
                : m,
            );
          },
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      return;
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!email) {
      setNotificationsUnreadCount(0);
      return;
    }
    setNotificationsUnreadCount(me?.unreadNotificationCount ?? 0);
  }, [email, me?.unreadNotificationCount]);

  useEffect(() => {
    const root = document.documentElement;
    setColorMode(root.classList.contains("dark") ? "dark" : "light");
  }, []);

  const applyColorMode = useCallback((mode: "dark" | "light") => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("gn-theme", mode);
    } catch {
      /* private mode */
    }
    setColorMode(mode);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen || !email) return;
    const loadNotifs = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      setNotifLoading(true);
      try {
        const res = await apiFetch<{
          items: NavNotification[];
          unreadCount: number;
        }>("/notifications/me?_start=0&_end=20", {
          token: session.access_token,
        });
        setNotifications(res.items);
        setMe((m) =>
          m ? { ...m, unreadNotificationCount: res.unreadCount } : m,
        );
      } catch {
        setNotifications([]);
      } finally {
        setNotifLoading(false);
      }
    };
    void loadNotifs();
  }, [menuOpen, email]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const signOut = async () => {
    setMenuOpen(false);
    clearPasswordRecoveryPending();
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
    setMe(null);
    router.refresh();
  };

  const username = useMemo(
    () => usernameFromSession(me, email, metadataDisplayName),
    [me, email, metadataDisplayName],
  );

  const unreadBadge = me?.unreadNotificationCount ?? 0;

  const markNotificationRead = async (nId: string) => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await apiFetch(`/notifications/me/${nId}/read`, {
        method: "PATCH",
        token: session.access_token,
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === nId
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
      );
      setMe((m) =>
        m
          ? {
              ...m,
              unreadNotificationCount: Math.max(
                0,
                (m.unreadNotificationCount ?? 0) - 1,
              ),
            }
          : m,
      );
    } catch {
      /* ignore */
    }
  };

  const markAllNotificationsRead = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await apiFetch("/notifications/me/read-all", {
        method: "PATCH",
        token: session.access_token,
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setMe((m) => (m ? { ...m, unreadNotificationCount: 0 } : m));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <span className="text-xs text-[var(--gn-text-muted)]" aria-hidden>
        …
      </span>
    );
  }

  if (email) {
    const menuId = "auth-nav-user-menu";
    return (
      <>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          id="auth-nav-user-trigger"
          className="flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 text-left transition hover:border-[color-mix(in_srgb,var(--gn-accent)_22%,var(--gn-ring))] hover:shadow-[var(--gn-shadow-sm)] sm:max-w-xs sm:pr-3 aria-expanded:border-[color-mix(in_srgb,var(--gn-accent)_28%,var(--gn-ring))] aria-expanded:shadow-[var(--gn-shadow-sm)]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="relative inline-flex shrink-0">
            <UserAvatarChip avatarUrl={me?.avatarUrl} label={username} />
            {unreadBadge > 0 ? (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#ff4500] ring-2 ring-[var(--gn-menu-bg)]"
                aria-label={`${unreadBadge} unread notifications`}
              />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-[var(--gn-text)]">
              {username}
            </span>
            <span className="truncate text-xs text-[var(--gn-text-muted)]">
              {me?.growerLevel?.trim() || DEFAULT_GROWER_RANK} ·{" "}
              {formatSeeds(me?.seeds)}
            </span>
          </span>
          <span
            className={`ml-0.5 hidden text-[var(--gn-text-muted)] transition sm:inline ${menuOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </span>
        </button>

        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-labelledby="auth-nav-user-trigger"
            className="gn-menu absolute right-0 top-full z-50 mt-1 min-w-[11rem] py-1"
          >
            <div
              className="border-b border-[var(--gn-divide)] px-3 py-2"
              role="presentation"
            >
              <p className="truncate text-xs font-medium text-[var(--gn-text)]">
                {username}
              </p>
              <p className="truncate text-xs text-[var(--gn-text-muted)]">
                {email}
              </p>
            </div>
            {sessionUserId ? (
              <Link
                href={`/u/${sessionUserId}`}
                role="menuitem"
                className="block px-3 py-2 text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                onClick={() => setMenuOpen(false)}
              >
                Your profile
              </Link>
            ) : null}
            <Link
              href="/settings/profile"
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
              onClick={() => setMenuOpen(false)}
            >
              Profile &amp; privacy
            </Link>
            <div
              className="max-h-64 overflow-y-auto border-t border-[var(--gn-divide)] py-2"
              role="group"
              aria-label="Notifications"
            >
              <div className="flex items-center justify-between px-3 pb-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--gn-text-muted)]">
                  Notifications
                </p>
                {unreadBadge > 0 ? (
                  <button
                    type="button"
                    className="text-[10px] font-semibold text-[#ff4500] hover:underline"
                    onClick={() => void markAllNotificationsRead()}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              {notifLoading ? (
                <p className="px-3 text-xs text-[var(--gn-text-muted)]">
                  Loading…
                </p>
              ) : notifications.length === 0 ? (
                <p className="px-3 text-xs text-[var(--gn-text-muted)]">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--gn-surface-hover)] ${
                      !n.readAt ? "bg-[color-mix(in_srgb,var(--gn-accent)_8%,transparent)]" : ""
                    }`}
                    onClick={() => {
                      if (n.kind === "moderation_warning") {
                        setWarningModal({ title: n.title, body: n.body });
                        if (!n.readAt) void markNotificationRead(n.id);
                        return;
                      }
                      if (!n.readAt) void markNotificationRead(n.id);
                    }}
                  >
                    <span className="font-medium text-[var(--gn-text)]">
                      {n.title}
                    </span>
                    <span className="line-clamp-3 text-xs text-[var(--gn-text-muted)]">
                      {n.kind === "moderation_warning"
                        ? "Tap to read the full message from moderators."
                        : n.body}
                    </span>
                  </button>
                ))
              )}
              <Link
                href="/notifications"
                role="menuitem"
                className="block px-3 py-2 text-xs font-semibold text-[#ff4500] hover:bg-[var(--gn-surface-hover)]"
                onClick={() => setMenuOpen(false)}
              >
                All notifications →
              </Link>
            </div>
            <div className="px-2 py-1.5" role="group" aria-label="Theme">
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--gn-text-muted)]">
                Appearance
              </p>
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] ${
                  colorMode === "dark" ? "bg-[var(--gn-surface-hover)]" : ""
                }`}
                onClick={() => applyColorMode("dark")}
              >
                Dark
                {colorMode === "dark" ? (
                  <span className="text-[var(--gn-accent)]" aria-hidden>
                    ✓
                  </span>
                ) : (
                  <span className="w-3" aria-hidden />
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] ${
                  colorMode === "light" ? "bg-[var(--gn-surface-hover)]" : ""
                }`}
                onClick={() => applyColorMode("light")}
              >
                Light
                {colorMode === "light" ? (
                  <span className="text-[var(--gn-accent)]" aria-hidden>
                    ✓
                  </span>
                ) : (
                  <span className="w-3" aria-hidden />
                )}
              </button>
            </div>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
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

  return (
    <Link
      href="/login"
      className="rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 font-medium text-[var(--gn-text)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-border))] hover:shadow-[var(--gn-shadow-sm)]"
    >
      Sign in
    </Link>
  );
}
