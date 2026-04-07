"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { uploadProfileAvatar } from "@/lib/upload-profile-avatar";
import { setPasswordRecoveryPending } from "@/lib/auth-recovery-client";

type MeProfile = {
  id: string;
  displayName: string | null;
  description: string | null;
  avatarUrl: string | null;
  profilePublic: boolean;
  showGrowerStatsPublic: boolean;
};

export function ProfileSettingsForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profilePublic, setProfilePublic] = useState(true);
  const [showGrowerStatsPublic, setShowGrowerStatsPublic] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) {
      router.replace("/login");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUserId(session?.user?.id ?? null);
    setAccountEmail(session?.user?.email?.trim() || null);
    try {
      const me = await apiFetch<MeProfile>("/profiles/me", { token });
      setDisplayName(me.displayName?.trim() ?? "");
      setDescription(me.description?.trim() ?? "");
      setAvatarUrl(me.avatarUrl?.trim() ?? "");
      setProfilePublic(me.profilePublic !== false);
      setShowGrowerStatsPublic(me.showGrowerStatsPublic !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        router.replace("/login");
        return;
      }
      await apiFetch("/profiles/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          description: description.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          profilePublic,
          showGrowerStatsPublic,
        }),
      });
      router.refresh();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!accountEmail) return;
    setResetMessage(null);
    setResetSending(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail }),
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
      setPasswordRecoveryPending(accountEmail);
      setResetMessage(
        "If an account exists for that email, we sent a reset link. Check your inbox and spam folder.",
      );
    } catch (e) {
      setResetMessage(
        e instanceof Error ? e.message : "Could not send reset email.",
      );
    } finally {
      setResetSending(false);
    }
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setError(null);
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        router.replace("/login");
        return;
      }
      const result = await uploadProfileAvatar(supabase, userId, file);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await apiFetch("/profiles/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ avatarUrl: result.publicUrl }),
      });
      setAvatarUrl(result.publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">Loading settings…</p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {userId ? (
        <p className="text-sm text-[var(--gn-text-muted)]">
          <Link
            href={`/u/${userId}`}
            className="text-[#ff4500] hover:underline"
          >
            View your profile
          </Link>
        </p>
      ) : null}

      <div className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--gn-text)]">
          Profile picture
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--gn-surface-muted)] ring-2 ring-[var(--gn-border)]">
            {avatarUrl.trim() ? (
              <img
                src={avatarUrl.trim()}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-[var(--gn-text-muted)]">
                {(displayName.trim().charAt(0) || "G").toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(ev) => void onAvatarFile(ev)}
              aria-label="Upload profile picture from device"
            />
            <button
              type="button"
              disabled={avatarUploading || !userId}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
            >
              {avatarUploading ? "Uploading…" : "Upload from device"}
            </button>
            <p className="text-xs text-[var(--gn-text-muted)]">
              JPEG, PNG, WebP, or GIF · up to 2 MB · saved as a small JPEG
            </p>
          </div>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--gn-text)]">
          Display name
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="gn-input w-full"
          autoComplete="nickname"
          placeholder="How your name appears on posts"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--gn-text)]">
          About you
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          className="gn-input w-full resize-y leading-relaxed"
          placeholder="A short intro visitors see on your profile"
        />
        <span className="mt-1 block text-xs text-[var(--gn-text-muted)]">
          {description.length} / 2000
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--gn-text)]">
          Or image URL
        </span>
        <input
          type="url"
          inputMode="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          maxLength={2048}
          className="gn-input w-full"
          placeholder="https://…"
        />
        <span className="mt-1 block text-xs text-[var(--gn-text-muted)]">
          Optional. Use a direct HTTPS image link, or leave empty and save to
          show initials.
        </span>
      </label>

      <div className="space-y-3 border-t border-[var(--gn-divide)] pt-6">
        <p className="text-sm font-medium text-[var(--gn-text)]">
          Account & sign-in
        </p>
        <p className="text-xs text-[var(--gn-text-muted)]">
          Signed in as{" "}
          <span className="font-medium text-[var(--gn-text)]">
            {accountEmail ?? "—"}
          </span>
          {accountEmail ? "." : " (email not available for this sign-in method)."}
        </p>
        {accountEmail ? (
          <div className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-3 sm:px-4">
            <p className="text-sm text-[var(--gn-text)]">Password</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--gn-text-muted)]">
              We&apos;ll email a secure link to choose a new password. The link
              expires after a short time.
            </p>
            <button
              type="button"
              disabled={resetSending}
              onClick={() => void requestPasswordReset()}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
            >
              {resetSending ? "Sending…" : "Email me a reset link"}
            </button>
            {resetMessage ? (
              <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                {resetMessage}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-[var(--gn-divide)] pt-6">
        <p className="text-sm font-medium text-[var(--gn-text)]">Privacy</p>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-0.5 hover:bg-[var(--gn-surface-hover)]">
          <input
            type="checkbox"
            checked={profilePublic}
            onChange={(e) => setProfilePublic(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--gn-border)]"
          />
          <span>
            <span className="block text-sm text-[var(--gn-text)]">
              Public profile
            </span>
            <span className="mt-0.5 block text-xs text-[var(--gn-text-muted)]">
              When off, only you can open your profile page and post or comment
              history. Others will see a not-found page.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-0.5 hover:bg-[var(--gn-surface-hover)]">
          <input
            type="checkbox"
            checked={showGrowerStatsPublic}
            onChange={(e) => setShowGrowerStatsPublic(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--gn-border)]"
          />
          <span>
            <span className="block text-sm text-[var(--gn-text)]">
              Show grower rank and seeds publicly
            </span>
            <span className="mt-0.5 block text-xs text-[var(--gn-text-muted)]">
              When off, visitors still see your name and avatar but not vote
              score or tier.
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || avatarUploading}
          onClick={() => void save()}
          className="inline-flex items-center justify-center rounded-full bg-[#ff4500] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] px-5 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
