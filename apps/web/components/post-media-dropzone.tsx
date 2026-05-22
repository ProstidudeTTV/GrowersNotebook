"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import {
  POST_IMAGE_INPUT_LABEL,
  POST_IMAGE_STORED_LABEL,
  POST_VIDEO_MAX_LABEL,
} from "@/lib/media-upload-limits";
import { stripUploadedVideoMetadata } from "@/lib/strip-uploaded-video-metadata";
import { MAX_POST_MEDIA } from "@/lib/post-draft-validation";
import {
  isProcessablePostImage,
  isProcessablePostVideo,
  uploadPostImage,
  uploadPostVideo,
} from "@/lib/upload-post-media";

type PostMediaDropzoneProps = {
  disabled?: boolean;
  onMediaReady: (url: string, kind: "image" | "video") => void;
  onError?: (message: string) => void;
  /** hero = full dropzone; compact = bar under single preview; tile = grid add cell */
  size?: "hero" | "compact" | "tile";
  /** Notebook week/harvest — no video picker or upload. */
  photosOnly?: boolean;
  /** Cap multi-select uploads (e.g. remaining notebook photo slots). */
  maxFilesPerPick?: number;
  /** Override hero helper line (file count / limits). */
  hint?: string;
};

export function PostMediaDropzone({
  disabled,
  onMediaReady,
  onError,
  size = "hero",
  photosOnly = false,
  maxFilesPerPick,
  hint,
}: PostMediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  const accept = photosOnly
    ? "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
    : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov";

  const processFile = useCallback(
    async (file: File, index: number, total: number): Promise<boolean> => {
      const asVideo = !photosOnly && isProcessablePostVideo(file);
      const asImage = !asVideo && isProcessablePostImage(file);
      if (!asImage && !asVideo) {
        onError?.(
          photosOnly
            ? "Use a JPEG, PNG, WebP, or GIF photo. iPhone HEIC: save as JPEG in Photos, then upload again."
            : "Use a JPEG, PNG, WebP, GIF image or MP4/WebM/MOV video. If a photo fails, save as JPEG and retry.",
        );
        return false;
      }
      if (total > 1) {
        setProgressLabel(`Uploading ${index + 1} of ${total}…`);
      }
      try {
        const supabase = createClient();
        const token = await getAccessTokenForApi(supabase);
        if (!token) {
          onError?.("Sign in to upload media.");
          return false;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          onError?.("Sign in to upload media.");
          return false;
        }
        if (asImage) {
          const r = await uploadPostImage(supabase, user.id, file);
          if (!r.ok) {
            onError?.(r.message);
            return false;
          }
          onMediaReady(r.publicUrl, "image");
        } else {
          const r = await uploadPostVideo(supabase, user.id, file);
          if (!r.ok) {
            onError?.(r.message);
            return false;
          }
          if (r.storagePath && r.videoContentType) {
            void stripUploadedVideoMetadata(
              token,
              r.storagePath,
              r.videoContentType,
            ).catch(() => {});
          }
          onMediaReady(r.publicUrl, "video");
        }
        return true;
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Upload failed");
        return false;
      }
    },
    [onError, onMediaReady, photosOnly],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return;
      const cap =
        typeof maxFilesPerPick === "number" && maxFilesPerPick > 0
          ? maxFilesPerPick
          : files.length;
      const batch = files.slice(0, cap);
      if (files.length > batch.length) {
        onError?.(`Only ${batch.length} more file${batch.length === 1 ? "" : "s"} can be added.`);
      }
      setBusy(true);
      setProgressLabel(null);
      try {
        for (let i = 0; i < batch.length; i++) {
          if (disabled) break;
          await processFile(batch[i]!, i, batch.length);
        }
      } finally {
        setBusy(false);
        setProgressLabel(null);
      }
    },
    [disabled, maxFilesPerPick, onError, processFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || busy) return;
      const list = e.dataTransfer.files;
      if (list?.length) void processFiles(Array.from(list));
    },
    [busy, disabled, processFiles],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const list = input.files;
      const arr = list?.length ? Array.from(list) : [];
      requestAnimationFrame(() => {
        input.value = "";
      });
      if (arr.length) void processFiles(arr);
    },
    [processFiles],
  );

  const openPicker = useCallback(() => {
    if (disabled || busy) return;
    inputRef.current?.click();
  }, [busy, disabled]);

  const sizeClasses =
    size === "tile"
      ? "relative flex aspect-[4/3] min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-2 py-3 sm:aspect-video"
      : size === "compact"
        ? "relative flex min-h-[52px] cursor-pointer flex-row items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3"
        : "relative flex min-h-[220px] cursor-pointer touch-manipulation flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 sm:min-h-[240px]";

  const defaultHint = photosOnly
    ? `Tap to choose photos · up to ${POST_IMAGE_INPUT_LABEL} each (saved ~${POST_IMAGE_STORED_LABEL})`
    : `Photos up to ${POST_IMAGE_INPUT_LABEL} · videos up to ${POST_VIDEO_MAX_LABEL} · up to ${MAX_POST_MEDIA} per post`;

  return (
    <div
      role="button"
      tabIndex={disabled || busy ? -1 : 0}
      aria-label={
        photosOnly
          ? "Upload photos. Choose files or drag and drop."
          : "Upload images or video. Choose files or drag and drop media."
      }
      className={[
        sizeClasses,
        "transition select-none",
        dragOver
          ? "border-[var(--gn-accent)] bg-[color-mix(in_srgb,var(--gn-accent)_12%,var(--gn-surface-muted))]"
          : "border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-ring))]",
        disabled || busy ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
      onClick={openPicker}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled && !busy) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={accept}
        capture={photosOnly ? "environment" : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled || busy}
        onChange={onPick}
      />
      <div
        className={
          size === "tile"
            ? "pointer-events-none flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-accent)] ring-1 ring-[var(--gn-ring)]"
            : "pointer-events-none flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-accent)] ring-1 ring-[var(--gn-ring)]"
        }
      >
        <svg
          width={size === "tile" ? 20 : 24}
          height={size === "tile" ? 20 : 24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          {size === "tile" ? (
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          ) : (
            <>
              <path d="M12 16V8" strokeLinecap="round" />
              <path d="M8 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M4 16.5V18a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0020 18v-1.5"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </div>
      <p
        className={
          size === "tile"
            ? "pointer-events-none text-center text-xs font-semibold text-[var(--gn-accent)]"
            : "pointer-events-none text-center text-sm font-medium text-[var(--gn-text)]"
        }
      >
        {busy
          ? progressLabel ?? "Uploading…"
          : size === "tile"
            ? "Add"
            : size === "compact"
              ? photosOnly
                ? "Add more photos"
                : "Add more photos or video"
              : photosOnly
                ? "Add grow photos"
                : "Add grow photos or video"}
      </p>
      {size === "hero" ? (
        <p className="pointer-events-none max-w-sm text-center text-xs leading-relaxed text-[var(--gn-text-muted)]">
          {hint ?? defaultHint}
        </p>
      ) : null}
    </div>
  );
}
