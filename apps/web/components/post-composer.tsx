"use client";

import { useCallback, useState } from "react";
import { PostComposerMediaStage } from "@/components/post-composer-media-stage";
import { PostEditor } from "@/components/post-editor";
import type { PostMediaItem } from "@/lib/feed-post";
import { TITLE_MAX_LEN } from "@/lib/post-draft-validation";
import { collectYouTubeIdsFromHtml } from "@/lib/youtube-embed";

export function PostComposer({
  title,
  onTitleChange,
  titleOptional = true,
  media,
  onMediaChange,
  onMediaReady,
  initialJson,
  editorKey,
  onDraftChange,
  disabled = false,
  onError,
  showTips = false,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  titleOptional?: boolean;
  media: PostMediaItem[];
  onMediaChange: (items: PostMediaItem[]) => void;
  onMediaReady: (url: string, kind: "image" | "video") => void;
  initialJson?: Record<string, unknown> | null;
  editorKey?: number;
  onDraftChange: (draft: { json: Record<string, unknown>; html: string }) => void;
  disabled?: boolean;
  onError?: (message: string | null) => void;
  showTips?: boolean;
}) {
  const [captionHtml, setCaptionHtml] = useState("");

  const setDraftStable = useCallback(
    (p: { json: Record<string, unknown>; html: string }) => {
      setCaptionHtml(p.html);
      onDraftChange(p);
    },
    [onDraftChange],
  );

  const youtubePreviewIds = collectYouTubeIdsFromHtml(captionHtml);

  return (
    <div className="space-y-6">
      <PostComposerMediaStage
        media={media}
        onMediaChange={onMediaChange}
        onMediaReady={onMediaReady}
        disabled={disabled}
        onError={onError}
      />

      <section className="space-y-2">
        <label className="block text-sm font-bold text-[var(--gn-text)]">
          Title{" "}
          {titleOptional ? (
            <span className="font-normal text-[var(--gn-text-muted)]">
              (optional)
            </span>
          ) : (
            <span className="text-[var(--gn-accent)]">*</span>
          )}
        </label>
        <input
          className="gn-input w-full text-base"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={TITLE_MAX_LEN}
          placeholder="Week 6 — first pistils on Northern Lights auto"
          autoComplete="off"
          disabled={disabled}
          aria-label="Post title"
        />
        <div className="flex justify-between text-xs text-[var(--gn-text-muted)]">
          <span>Helps people scan the feed — skip if the photo says it all.</span>
          <span
            className={
              title.length > TITLE_MAX_LEN * 0.9 ? "text-amber-600" : ""
            }
          >
            {title.length}/{TITLE_MAX_LEN}
          </span>
        </div>
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-bold text-[var(--gn-text)]">
          Caption{" "}
          <span className="font-normal text-[var(--gn-text-muted)]">
            (strain, week, medium, issues)
          </span>
        </label>
        <div className="overflow-hidden rounded-xl ring-1 ring-[var(--gn-ring)] focus-within:ring-2 focus-within:ring-[var(--gn-ring-focus)]">
          <PostEditor
            key={editorKey}
            embedded={Boolean(initialJson)}
            initialJson={initialJson ?? null}
            onChange={setDraftStable}
            disabled={disabled}
          />
        </div>
        {youtubePreviewIds.length > 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--gn-text-muted)]">
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
      </section>

      {showTips ? (
        <p className="rounded-xl bg-[var(--gn-surface-muted)] px-4 py-3 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          <span className="font-semibold text-[var(--gn-text)]">Tip:</span> Grow
          posts with photos get the most love. Mention strain, week, and what you
          changed (lights, nutrients, training).
        </p>
      ) : null}
    </div>
  );
}
