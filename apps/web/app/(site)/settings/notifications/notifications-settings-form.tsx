"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";

type PrefKey =
  | "new_comment"
  | "new_follower"
  | "vote_milestone"
  | "direct_message";

type NotificationPreferences = Record<PrefKey, boolean>;

const DEFAULT_PREFS: NotificationPreferences = {
  new_comment: true,
  new_follower: true,
  vote_milestone: true,
  direct_message: true,
};

const TOGGLES: ReadonlyArray<{
  key: PrefKey;
  label: string;
  description: string;
}> = [
  {
    key: "new_comment",
    label: "New comments on your posts",
    description:
      "Get notified when someone replies to a post or notebook you authored.",
  },
  {
    key: "new_follower",
    label: "New followers",
    description: "Get notified when a grower starts following your account.",
  },
  {
    key: "vote_milestone",
    label: "Vote milestones (50, 100, 500 votes)",
    description:
      "Celebrate when a post or notebook crosses popular seed-count thresholds.",
  },
  {
    key: "direct_message",
    label: "Direct messages",
    description: "Get notified when another grower sends you a DM.",
  },
];

function normalize(value: unknown): NotificationPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_PREFS };
  const raw = value as Record<string, unknown>;
  return {
    new_comment: raw.new_comment !== false,
    new_follower: raw.new_follower !== false,
    vote_milestone: raw.vote_milestone !== false,
    direct_message: raw.direct_message !== false,
  };
}

export function NotificationsSettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }
    setUserId(session.user.id);
    try {
      const token = session.access_token;
      const me = await apiFetch<{ notificationPreferences?: unknown }>("/profiles/me", {
        token,
      });
      setPrefs(normalize(me.notificationPreferences));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load notification settings",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const toggle = async (key: PrefKey) => {
    if (!userId || savingKey) return;
    const next: NotificationPreferences = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSavingKey(key);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;
      if (!token) throw new Error("Session expired. Please sign in again.");
      await apiFetch("/profiles/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ notificationPreferences: next }),
      });
      setSavedAt(Date.now());
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedAt(null), 2200);
    } catch (e) {
      setPrefs(prefs);
      setError(e instanceof Error ? e.message : "Could not save preference");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">
        Loading notification settings…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div role="list" className="-my-3">
        {TOGGLES.map((t, idx) => {
          const value = prefs[t.key];
          const isLast = idx === TOGGLES.length - 1;
          return (
            <div
              key={t.key}
              role="listitem"
              className={
                isLast
                  ? "flex items-center justify-between gap-4 py-3"
                  : "flex items-center justify-between gap-4 border-b border-[var(--gn-divide)] py-3"
              }
            >
              <div className="min-w-0">
                <p
                  id={`pref-${t.key}-label`}
                  className="text-sm font-medium text-[var(--gn-text)]"
                >
                  {t.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--gn-text-muted)]">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-labelledby={`pref-${t.key}-label`}
                aria-busy={savingKey === t.key}
                disabled={savingKey !== null}
                onClick={() => void toggle(t.key)}
                className={
                  value
                    ? "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-[var(--gn-accent)] transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gn-ring-focus)]"
                    : "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-[var(--gn-surface-muted)] ring-1 ring-inset ring-[var(--gn-border)] transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gn-ring-focus)]"
                }
              >
                <span
                  className={
                    value
                      ? "inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white shadow-sm transition-transform"
                      : "inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white shadow-sm transition-transform"
                  }
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex min-h-[1.25rem] items-center gap-3 text-xs">
        {error ? (
          <span className="text-red-600 dark:text-red-400">{error}</span>
        ) : savedAt ? (
          <span className="text-[var(--gn-text-muted)]" aria-live="polite">
            Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
