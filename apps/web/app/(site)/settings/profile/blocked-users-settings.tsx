"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type BlockedRow = {
  userId: string;
  displayName: string | null;
  createdAt: string;
};

export function BlockedUsersSettings() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BlockedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ items: BlockedRow[] }>("/blocks/me", {
        token,
      });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load blocked users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) return;
      await apiFetch(`/blocks/${userId}`, { method: "DELETE", token });
      setItems((prev) => prev.filter((x) => x.userId !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unblock failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">Loading blocked users…</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--gn-text-muted)]">
        Blocked growers won&apos;t appear in your feeds, comments, messages, or
        search. They can&apos;t message you, and you won&apos;t see each
        other&apos;s profiles.
      </p>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--gn-text-muted)]">
          You haven&apos;t blocked anyone.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--gn-divide)] rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface)]">
          {items.map((row) => (
            <li
              key={row.userId}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium text-[var(--gn-text)]">
                {row.displayName?.trim() || "Grower"}
              </span>
              <button
                type="button"
                disabled={busyId === row.userId}
                className="shrink-0 rounded-full border border-[var(--gn-border)] px-3 py-1 text-xs font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                onClick={() => void unblock(row.userId)}
              >
                {busyId === row.userId ? "…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
