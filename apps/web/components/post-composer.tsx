"use client";

import { useCallback, useState } from "react";
import { PostEditor } from "@/components/post-editor";
import { PostMediaDropzone } from "@/components/post-media-dropzone";
import type { PostMediaItem } from "@/lib/feed-post";
import { MAX_POST_MEDIA, TITLE_MAX_LEN } from "@/lib/post-draft-validation";
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

  const removeMedia = (idx: number) => {
    onMediaChange(media.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      {showTips ? (
        <div className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 text-sm text-[var(--gn-text-muted)]">
          <p className="mb-1 font-medium text-[var(--gn-text)]">
            Good posts include:
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-xs">
            <li>A photo or video of your grow</li>
            <li>Details in the caption — strain, week, issues you face</li>
            <li>An optional title when it helps people click</li>
          </ul>
        </div>
      ) : null}

      <section>
        <span className="block text-sm font-medium text-[var(--gn-text)]">
          Photos &amp; video
        </span>
        <p className="mt-0.5 text-xs text-[var(--gn-text-muted)]">
          Add media first — it shows at the top of your post.
        </p>
        <div className="mt-2">
          <PostMediaDropzone
            disabled={disabled}
            onMediaReady={onMediaReady}
            onError={(msg) => onError?.(msg)}
          />
          {media.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {media.map((m, idx) => (
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
                    disabled={disabled}
                    aria-label="Remove attachment"
                    className="absolute right-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-xs text-white hover:bg-black/75 disabled:opacity-50"
                    onClick={() => removeMedia(idx)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {media.length >= MAX_POST_MEDIA ? (
            <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
              Maximum {MAX_POST_MEDIA} attachments per post.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium text-[var(--gn-text)]">
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
          className="gn-input mt-1 w-full"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={TITLE_MAX_LEN}
          placeholder="e.g. Week 6 update — Northern Lights looking bushy!"
          autoComplete="off"
          disabled={disabled}
          aria-label="Post title"
        />
        <div className="mt-1 flex justify-between text-xs text-[var(--gn-text-muted)]">
          <span>
            {titleOptional
              ? "Skip if your photo tells the story."
              : "Make it descriptive — people decide to click based on this."}
          </span>
          <span
            className={
              title.length > TITLE_MAX_LEN * 0.9 ? "text-amber-600" : ""
            }
          >
            {title.length}/{TITLE_MAX_LEN}
          </span>
        </div>
      </section>

      <section>
        <span className="block text-sm font-medium text-[var(--gn-text)]">
          Caption{" "}
          <span className="font-normal text-[var(--gn-text-muted)]">
            (optional if you add media)
          </span>
        </span>
        <div className="mt-1">
          <PostEditor
            key={editorKey}
            embedded={Boolean(initialJson)}
            initialJson={initialJson ?? null}
            onChange={setDraftStable}
            disabled={disabled}
          />
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
      </section>
    </div>
  );
}


