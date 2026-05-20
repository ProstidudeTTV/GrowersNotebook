"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
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
  cancelHref,
}: {
  /** Omit for a profile post. */
  communityId?: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<PostMediaItem[]>([]);
  const [draft, setDraft] = useState<{
    json: Record<string, unknown>;
    html: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="space-y-5">
      <PostComposer
        title={title}
        onTitleChange={setTitle}
        titleOptional
        media={attachedMedia}
        onMediaChange={setAttachedMedia}
        onMediaReady={onMediaReady}
        onDraftChange={setDraftStable}
        disabled={loading}
        onError={setError}
        showTips
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Publishing…" : "Publish"}
        </button>
        <Link
          href={cancelHref}
          className="rounded-full border-2 border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-5 py-2 text-sm font-medium text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-hover)]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
