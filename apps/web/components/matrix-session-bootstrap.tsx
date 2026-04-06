"use client";

import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

/**
 * Ensures the current Supabase user has a Homeserver account on each browser session.
 * Actual Matrix login still happens from the Messages UI.
 */
export function MatrixSessionBootstrap() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function ensureAccount(accessToken: string, supabaseUserId: string) {
      const key = `gn-matrix-ensure:${supabaseUserId}`;
      if (sessionStorage.getItem(key)) return;
      try {
        await apiFetch("/matrix/ensure-account", {
          method: "POST",
          body: JSON.stringify({}),
          token: accessToken,
        });
        if (!cancelled) sessionStorage.setItem(key, "1");
      } catch {
        /* non-fatal; user can open Messages to retry */
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token && session.user?.id) {
        void ensureAccount(session.access_token, session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && session.user?.id) {
        void ensureAccount(session.access_token, session.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
