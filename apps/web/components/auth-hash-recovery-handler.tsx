"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Password recovery sometimes returns tokens in the URL **hash** (implicit flow), e.g.
 * `https://growersnotebook.com/#access_token=...&refresh_token=...&type=recovery`.
 * The server never sees the fragment, so middleware and `/auth/callback` cannot run PKCE.
 * Parse the hash here, persist the session, then send the user to `/auth/update-password`.
 */
export function AuthHashRecoveryHandler() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;

    const raw = typeof window !== "undefined" ? window.location.hash : "";
    if (!raw || raw.length < 2) return;

    const params = new URLSearchParams(raw.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (!access_token?.trim() || !refresh_token?.trim()) return;
    if (type !== "recovery") return;

    ran.current = true;

    const supabase = createClient();
    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        const pathAndQuery = `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, "", pathAndQuery);

        if (error) {
          router.replace("/login?error=auth");
          return;
        }
        router.replace("/auth/update-password");
        router.refresh();
      });
  }, [router]);

  return null;
}
