"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

const pill =
  "inline-flex items-center justify-center rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--gn-text)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_28%,var(--gn-ring))] hover:shadow-[var(--gn-shadow-sm)] disabled:opacity-50";

export function FollowCommunityButton({
  communityId,
  slug,
}: {
  communityId: string;
  slug: string;
}) {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setViewerId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!viewerId) {
      setFollowing(false);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void (async () => {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const c = await apiFetch<{ viewerFollowing?: boolean }>(
          `/communities/${slug}`,
          { token },
        );
        if (!cancelled) {
          setFollowing(c.viewerFollowing ?? false);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, viewerId]);

  const toggle = useCallback(async () => {
    if (!viewerId || busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in required");
      if (next) {
        await apiFetch(`/follows/communities/${communityId}`, {
          method: "POST",
          token,
          body: "{}",
        });
      } else {
        await apiFetch(`/follows/communities/${communityId}`, {
          method: "DELETE",
          token,
        });
      }
      const sync = await apiFetch<{ viewerFollowing?: boolean }>(
        `/communities/${slug}`,
        { token },
      );
      setFollowing(sync.viewerFollowing ?? false);
      router.refresh();
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }, [communityId, viewerId, busy, following, router, slug]);

  if (!ready) {
    return (
      <span className={`${pill} opacity-50`} aria-hidden>
        …
      </span>
    );
  }

  if (!viewerId) {
    return (
      <Link href="/login" className={pill}>
        Join
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={pill}
      disabled={busy}
      onClick={() => void toggle()}
    >
      {following ? "Joined" : "Join"}
    </button>
  );
}

export function FollowUserButton({
  userId,
  following,
  viewerId,
  onFollowingChange,
  onFollowComplete,
}: {
  userId: string;
  following: boolean;
  viewerId: string | null;
  onFollowingChange: (following: boolean) => void;
  /** Re-fetch post so `following` stays aligned with the API (avoids realtime race). */
  onFollowComplete?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (!viewerId || busy) return;
    setBusy(true);
    const next = !following;
    onFollowingChange(next);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in required");
      if (next) {
        await apiFetch(`/follows/users/${userId}`, {
          method: "POST",
          token,
          body: "{}",
        });
      } else {
        await apiFetch(`/follows/users/${userId}`, {
          method: "DELETE",
          token,
        });
      }
      await onFollowComplete?.();
    } catch {
      onFollowingChange(!next);
    } finally {
      setBusy(false);
    }
  }, [
    userId,
    viewerId,
    busy,
    following,
    onFollowingChange,
    onFollowComplete,
  ]);

  if (viewerId === userId) return null;

  if (!viewerId) {
    return (
      <Link href="/login" className={pill}>
        Follow
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={pill}
      disabled={busy}
      onClick={() => void toggle()}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
