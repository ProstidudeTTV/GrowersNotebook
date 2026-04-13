"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";

const SESSION_DISMISS_KEY = "gn_mailing_list_prompt_dismissed";

type Me = { mailingListOptIn?: boolean };

/**
 * Shown after bulk email issues (API sets mailingListNudgeRecommended).
 * Dismiss hides until this tab/session ends (sessionStorage). Opt-in persists on the profile.
 */
export function MailingListPrompt({
  authed,
  nudgeRecommended,
}: {
  authed: boolean;
  nudgeRecommended: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authed || !nudgeRecommended) {
      setVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      /* private mode */
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const me = await apiFetch<Me>("/profiles/me", {
          token: session.access_token,
        });
        if (cancelled) return;
        if (me.mailingListOptIn) {
          setVisible(false);
          return;
        }
        setVisible(true);
      } catch {
        if (!cancelled) setVisible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, nudgeRecommended]);

  async function optIn() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await apiFetch("/profiles/me", {
        method: "PATCH",
        token: session.access_token,
        body: JSON.stringify({ mailingListOptIn: true }),
      });
      setVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preference");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="gn-mailing-prompt-title"
      className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-4 shadow-lg"
    >
      <p id="gn-mailing-prompt-title" className="font-semibold text-[var(--gn-text)]">
        Stay in the loop?
      </p>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        We had trouble reaching everyone by email. Want occasional updates and
        announcements by email?
      </p>
      {error ? (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--gn-divide)] px-3 py-1.5 text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
          onClick={dismiss}
        >
          Not now
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-[#ff6a38] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#ff7d4c] disabled:opacity-50"
          onClick={() => void optIn()}
        >
          {busy ? "Saving…" : "Yes, email me"}
        </button>
      </div>
    </div>
  );
}
