"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  clearPasswordRecoveryPending,
  readPasswordRecoveryPending,
} from "@/lib/auth-recovery-client";
import { createClient } from "@/lib/supabase/client";

/**
 * PKCE can land on `/` or `/auth/complete` when the server cannot infer recovery (e.g. `amr`
 * is only `otp`). The forgot-password tab stores an email-scoped hint in `localStorage`,
 * which **is** visible from the tab that opens the email link — unlike a cookie set from
 * the API response in some edge cases.
 */
export function RecoverySessionRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/" && pathname !== "/auth/complete") return;

    const rawHash = window.location.hash;
    if (
      rawHash.length > 1 &&
      rawHash.includes("access_token") &&
      rawHash.includes("type=recovery")
    ) {
      return;
    }

    const pending = readPasswordRecoveryPending();
    if (!pending) return;
    if (pending.until <= Date.now()) {
      clearPasswordRecoveryPending();
      return;
    }

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.email) return;
      if (session.user.email.toLowerCase() !== pending.email) return;
      const origin = window.location.origin;
      window.location.replace(`${origin}/auth/update-password`);
    });
  }, [pathname]);

  return null;
}
