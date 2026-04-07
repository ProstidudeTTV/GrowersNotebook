"use client";

import { useEffect } from "react";
import { clearPasswordRecoveryPending } from "@/lib/auth-recovery-client";
import { createClient } from "@/lib/supabase/client";

/**
 * Implicit flow puts tokens in the **hash** — only the browser can read them.
 * Strip the hash immediately (survives React Strict Mode double-mount), `setSession`,
 * clear the forgot-password hint cookie, then hard-navigate to `/auth/update-password`
 * so App Router cannot briefly show the logged-in home page instead.
 */
export function AuthHashRecoveryHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.location.hash;
    if (!raw || raw.length < 2) return;

    const params = new URLSearchParams(raw.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (!access_token?.trim() || !refresh_token?.trim()) return;
    if (type !== "recovery") return;

    const origin = window.location.origin;
    const pathAndQuery = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", pathAndQuery);

    const supabase = createClient();
    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(async ({ error }) => {
        if (error) {
          window.location.replace(`${origin}/login?error=auth`);
          return;
        }
        clearPasswordRecoveryPending();
        try {
          await fetch("/api/auth/clear-recovery-flow-cookie", {
            method: "POST",
          });
        } catch {
          /* non-fatal */
        }
        window.location.replace(`${origin}/auth/update-password`);
      });
  }, []);

  return null;
}
