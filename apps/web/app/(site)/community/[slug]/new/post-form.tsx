"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { marked } from "marked";
import { toast } from "sonner";
import { PostMediaDropzone } from "@/components/post-media-dropzone";
import { PostEditor } from "@/components/post-editor";
import { apiFetch } from "@/lib/api-public";
import type { PostMediaItem } from "@/lib/feed-post";
import {
  bodyHtmlIsSubmittable,
  emptyTipTapDoc,
  MAX_POST_MEDIA,
  TITLE_MAX_LEN,
} from "@/lib/post-draft-validation";
import { collectYouTubeIdsFromHtml, collectYouTubeIdsFromText } from "@/lib/youtube-embed";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

marked.use({ gfm: true, breaks: true });

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
  const [showTags, setShowTags] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownBody, setMarkdownBody] = useState("");
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
      if (prev.length >= MAX_POST_MEDIA) return prev;
      if (prev.some((m) => m.url === url)) return prev;
      return [...prev, { url, type: kind }];
    });
  }, []);

  const youtubePreviewIds = useMemo(() => {
    if (markdownMode) {
      const ids = new Set<string>();
      for (const id of collectYouTubeIdsFromText(markdownBody)) ids.add(id);
      const html = String(marked.parse(markdownBody, { async: false }));
      for (const id of collectYouTubeIdsFromHtml(html)) ids.add(id);
      return [...ids];
    }
    return collectYouTubeIdsFromHtml(draft?.html ?? "");
  }, [markdownMode, markdownBody, draft?.html]);

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("You must sign in to post.");
        setLoading(false);
        return;
      }

      let bodyHtml: string;
      let bodyJson: Record<string, unknown>;

      const media = attachedMedia;

      if (markdownMode) {
        bodyHtml = String(marked.parse(markdownBody, { async: false }));
        if (!bodyHtmlIsSubmittable(bodyHtml, media.length, markdownBody)) {
          setError("Add body text or upload media (dropzone), or use markdown.");
          setLoading(false);
          return;
        }
        bodyJson = { ...emptyTipTapDoc };
      } else {
        if (!draft || !bodyHtmlIsSubmittable(draft.html, media.length)) {
          setError("Add body text or upload media (dropzone or markdown for embeds).");
          setLoading(false);
          return;
        }
        bodyHtml = draft.html;
        bodyJson = draft.json;
      }

      const post = await apiFetch<{ id: string }>("/posts", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...(communityId ? { communityId } : {}),
          title: title.trim(),
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
      {/* Posting tips */}
      <div className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 text-sm text-[var(--gn-text-muted)]">
        <p className="font-medium text-[var(--gn-text)] mb-1">💡 Good posts include:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>A clear title that describes what you&apos;re sharing</li>
          <li>A photo or video of your grow (growers love to see plants!)</li>
          <li>Details in the body — strain, week, any issues you&apos;re facing</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--gn-text)]">
          Title <span className="text-[var(--gn-accent)]">*</span>
        </label>
        <input
          className="gn-input mt-1 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX_LEN}
          placeholder="e.g. Week 6 update — Northern Lights looking bushy!"
          autoComplete="off"
        />
        <div className="mt-1 flex justify-between text-xs text-[var(--gn-text-muted)]">
          <span>Make it descriptive — people decide to click based on this.</span>
          <span className={title.length > TITLE_MAX_LEN * 0.9 ? "text-amber-600" : ""}>
            {title.length}/{TITLE_MAX_LEN}
          </span>
        </div>
      </div>

      <div>
        <PostMediaDropzone
          disabled={loading}
          onMediaReady={onMediaReady}
          onError={setError}
        />
        {attachedMedia.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {attachedMedia.map((m, idx) => (
              <li
                key={`${m.url}-${idx}`}
                className="relative overflow-hidden rounded-lg ring-1 ring-[var(--gn-ring)]"
              >
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt=""
                    className="h-24 w-24 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center bg-[var(--gn-surface-elevated)] text-xs font-medium text-[var(--gn-text-muted)]">
                    Video
                  </div>
                )}
                <button
                  type="button"
                  disabled={loading}
                  aria-label="Remove attachment"
                  className="absolute right-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-xs text-white hover:bg-black/75 disabled:opacity-50"
                  onClick={() =>
                    setAttachedMedia((list) => list.filter((_, i) => i !== idx))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {attachedMedia.length >= MAX_POST_MEDIA ? (
          <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
            Maximum {MAX_POST_MEDIA} attachments per post.
          </p>
        ) : null}
      </div>

      <div>
        <span className="block text-sm font-medium text-[var(--gn-text)]">
          Body <span className="font-normal text-[var(--gn-text-muted)]">(optional if you add media)</span>
        </span>
        <div className="mt-1">
          {markdownMode ? (
            <textarea
              className="gn-input w-full min-h-[220px] font-mono text-sm leading-relaxed"
              value={markdownBody}
              onChange={(e) => setMarkdownBody(e.target.value)}
              placeholder="Body text (optional)"
              disabled={loading}
            />
          ) : (
            <PostEditor
              onChange={setDraftStable}
              disabled={loading}
              toolbarEnd={
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setError(null);
                    setMarkdownMode(true);
                  }}
                  className="text-xs font-medium text-[var(--gn-accent)] hover:underline disabled:opacity-50"
                >
                  Switch to Markdown
                </button>
              }
            />
          )}
          {markdownMode ? (
            <div className="mt-2 text-right">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError(null);
                  setMarkdownMode(false);
                }}
                className="text-xs font-medium text-[var(--gn-accent)] hover:underline disabled:opacity-50"
              >
                Switch to rich text
              </button>
            </div>
          ) : null}
        </div>
        {youtubePreviewIds.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--gn-text-muted)]">
              YouTube preview
            </p>
            {youtubePreviewIds.map((id) => (
              <div key={id} className="gn-youtube-embed max-w-full shadow-sm">
                <iframe
                  className="gn-youtube-iframe"
                  src={`https://www.youtube-nocookie.com/embed/${id}`}
                  title="YouTube video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

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
          className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,69,0,0.45)] disabled:opacity-50"
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
