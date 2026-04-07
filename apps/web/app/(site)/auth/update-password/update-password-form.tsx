"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearPasswordRecoveryPending } from "@/lib/auth-recovery-client";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  useEffect(() => {
    clearPasswordRecoveryPending();
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionOk(!!session);
    });
  }, []);

  const submit = async () => {
    setMessage(null);
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated. Redirecting…");
      router.push("/");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  };

  if (sessionOk === false) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-bold text-[var(--gn-text)]">
          Link expired or invalid
        </h1>
        <p className="mt-3 text-sm text-[var(--gn-text-muted)]">
          Request a new reset link from the sign-in page.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-[#ff4500] hover:underline"
        >
          Back to sign in
        </Link>
      </main>
    );
  }

  if (sessionOk === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <p className="text-[var(--gn-text-muted)]">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
        Signed in from your reset link. Set a new password for your account.
      </p>
      <div className="mt-6 space-y-3">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password (8+ characters)"
          className="gn-input w-full px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm password"
          className="gn-input w-full px-3 py-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="w-full rounded-full bg-[#ff4500] py-2 font-semibold text-white shadow-[0_0_18px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414] disabled:opacity-50"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
        {message ? (
          <p className="text-sm text-[var(--gn-text)]">{message}</p>
        ) : null}
      </div>
      <Link
        href="/login"
        className="mt-8 inline-block text-sm text-[#ff4500] hover:underline"
      >
        ← Sign in
      </Link>
    </main>
  );
}
