"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { CommunityIcon } from "@/components/community-icon";
import { PostComposer } from "@/components/post-composer";
import { apiFetch } from "@/lib/api-public";
import type { PostMediaItem } from "@/lib/feed-post";
import {
  bodyHtmlIsSubmittable,
  emptyTipTapDoc,
} from "@/lib/post-draft-validation";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export function NewPostForm({
  communityId,
  communitySlug,
  communityName,
  communityIconKey,
  cancelHref,
  backHref,
  backLabel,
  headline,
  subheadline,
}: {
  /** Omit for a profile post. */
  communityId?: string;
  communitySlug?: string;
  communityName?: string;
  communityIconKey?: string | null;
  cancelHref: string;
  backHref: string;
  backLabel: string;
  headline: string;
  subheadline?: string;
}) {
  const router = useRouter();
  const { displayName, avatarUrl, email } = useAuth();
  const [title, setTitle] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<PostMediaItem[]>([]);
  const [draft, setDraft] = useState<{
    json: Record<string, unknown>;
    html: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const profileLabel =
    displayName?.trim() || email?.split("@")[0]?.trim() || "Grower";
  const initial = profileLabel.charAt(0).toUpperCase();

  const destinationLabel = communityName
    ? communityName.trim() || communitySlug
    : "Your profile";

  const setDraftStable = useCallback(
    (p: { json: Record<string, unknown>; html: string }) => {
      setDraft(p);
    },
    [],
  );

  const onMediaReady = useCallback((url: string, kind: "image" | "video") => {
    setError(null);
    setAttachedMedia((prev) => {
      if (prev.some((m) => m.url === url)) return prev;
      return [...prev, { url, type: kind }];
    });
  }, []);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("You must sign in to post.");
        return;
      }

      const media = attachedMedia;
      const bodyHtml = draft?.html ?? "";
      const bodyJson = draft?.json ?? { ...emptyTipTapDoc };

      if (!bodyHtmlIsSubmittable(bodyHtml, media.length)) {
        setError("Add a caption or upload at least one photo or video.");
        return;
      }

      const post = await apiFetch<{ id: string }>("/posts", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...(communityId ? { communityId } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
          bodyJson,
          bodyHtml,
          ...(media.length ? { media } : {}),
        }),
      });
      toast.success("Post published!");
      router.push(`/p/${post.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--gn-accent)] hover:underline"
        >
          <span aria-hidden>←</span> {backLabel}
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--gn-text)] sm:text-3xl">
          {headline}
        </h1>
        {subheadline ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--gn-text-muted)]">
            {subheadline}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-md)]">
        <header className="flex items-center gap-3 border-b border-[var(--gn-divide)] px-4 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gn-accent)] text-sm font-bold text-[var(--gn-on-accent)] ring-2 ring-[var(--gn-accent)]/30">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
                sizes="44px"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--gn-text)]">
              {profileLabel}
            </p>
            <p className="truncate text-xs text-[var(--gn-text-muted)]">
              Posting to{" "}
              <span className="font-semibold text-[var(--gn-accent)]">
                {communityName?.trim() || communitySlug || destinationLabel}
              </span>
            </p>
          </div>
          {communitySlug && communityName ? (
            <CommunityIcon
              iconKey={communityIconKey}
              nameFallback={communityName}
              slugFallback={communitySlug}
              frameClassName="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--gn-surface-elevated)] text-lg ring-1 ring-[var(--gn-ring)]"
            />
          ) : null}
        </header>

        <div className="p-4 sm:p-6">
          <PostComposer
            title={title}
            onTitleChange={setTitle}
            titleOptional
            media={attachedMedia}
            onMediaChange={setAttachedMedia}
            onMediaReady={onMediaReady}
            onDraftChange={setDraftStable}
            initialJson={draft?.json}
            editorKey={editorKey}
            disabled={loading}
            onError={setError}
            showTips
          />

          {error ? (
            <p
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gn-divide)] bg-[var(--gn-surface-muted)]/50 px-4 py-4 sm:px-6">
          <p className="text-xs text-[var(--gn-text-muted)]">
            Draft stays in this tab until you publish.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={cancelHref}
              className="rounded-full border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-5 py-2.5 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="rounded-full bg-[var(--gn-accent)] px-6 py-2.5 text-sm font-bold text-[var(--gn-on-accent)] shadow-[0_2px_12px_-3px_var(--gn-accent)] transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Publishing…" : "Post"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
