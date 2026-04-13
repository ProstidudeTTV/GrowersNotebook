"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/safe-internal-path";
import {
  clearPasswordRecoveryPending,
  setPasswordRecoveryPending,
} from "@/lib/auth-recovery-client";
import { getSiteOriginForAuth } from "@/lib/site-origin-client";

function parseUrlError(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeInternalPath(search.get("next"));
  const urlError = parseUrlError(search.get("error"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mailingListOptIn, setMailingListOptIn] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [message, setMessage] = useState<string | null>(urlError);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    const origin = getSiteOriginForAuth();
    try {
      if (mode === "signup") {
        const u = username.trim();
        if (!u) {
          setMessage("Choose a display name (username).");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
              display_name: u.slice(0, 120),
              mailing_list_opt_in: mailingListOptIn,
            },
          },
        });
        if (error) throw error;
        setMessage("Check your email to confirm, then sign in.");
      } else if (mode === "forgot") {
        if (!email.trim()) {
          setMessage("Enter your email address.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/auth/request-password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const payload: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof (payload as { error: unknown }).error === "string"
              ? (payload as { error: string }).error
              : "Could not send reset email.";
          throw new Error(msg);
        }
        setMessage(
          "If an account exists for that email, we sent a reset link. Check your inbox and spam folder.",
        );
        setPasswordRecoveryPending(email.trim());
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        clearPasswordRecoveryPending();
        router.push(next);
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-[var(--gn-text)]">
        {mode === "forgot" ? "Reset password" : "Sign in"}
      </h1>
      {mode === "forgot" ? (
        <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
          We&apos;ll email you a link to choose a new password.
        </p>
      ) : null}
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode === "signup" ? (
          <>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Display name"
              className="gn-input w-full px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--gn-text-muted)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={mailingListOptIn}
                onChange={(e) => setMailingListOptIn(e.target.checked)}
              />
              <span>
                Email me occasional updates and announcements (you can change
                this later in your profile).
              </span>
            </label>
          </>
        ) : null}
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          className="gn-input w-full px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "forgot" ? (
          <input
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            placeholder="Password"
            className="gn-input w-full px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        ) : null}
        {mode === "signin" ? (
          <div className="text-right text-sm">
            <button
              type="button"
              className="font-medium text-[#ff4500] hover:underline"
              onClick={() => {
                setMessage(null);
                setMode("forgot");
              }}
            >
              Forgot password?
            </button>
          </div>
        ) : null}
        {mode !== "forgot" ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setMode("signin");
              }}
              className={
                mode === "signin"
                  ? "font-semibold text-[#ff4500]"
                  : "text-[var(--gn-text-muted)]"
              }
            >
              Sign in
            </button>
            <span className="text-[var(--gn-text-muted)]">|</span>
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setMode("signup");
              }}
              className={
                mode === "signup"
                  ? "font-semibold text-[#ff4500]"
                  : "text-[var(--gn-text-muted)]"
              }
            >
              Create account
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-sm text-[#ff4500] hover:underline"
            onClick={() => {
              setMessage(null);
              setMode("signin");
            }}
          >
            ← Back to sign in
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#ff4500] py-2 font-semibold text-white shadow-[0_0_18px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414] hover:shadow-[0_0_28px_rgba(255,69,0,0.45)] disabled:opacity-50"
        >
          {loading
            ? "Working…"
            : mode === "signup"
              ? "Sign up"
              : mode === "forgot"
                ? "Send reset link"
                : "Continue"}
        </button>
        {message ? (
          <p className="text-sm text-[var(--gn-text)]">{message}</p>
        ) : null}
      </form>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-[#ff4500] hover:underline"
      >
        ← Home
      </Link>
    </main>
  );
}
