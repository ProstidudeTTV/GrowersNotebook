"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { stripUploadedVideoMetadata } from "@/lib/strip-uploaded-video-metadata";
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
};

export function PostMediaDropzone({
  disabled,
  onMediaReady,
  onError,
}: PostMediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const processFile = useCallback(
    async (file: File): Promise<boolean> => {
      const asVideo = isProcessablePostVideo(file);
      const asImage = !asVideo && isProcessablePostImage(file);
      if (!asImage && !asVideo) {
        onError?.(
          "Use a JPEG, PNG, WebP, GIF image or MP4/WebM/MOV video. If you picked a photo and nothing happened, try another gallery or save as JPEG—some phones use formats we cannot read in the browser yet.",
        );
        return false;
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
    [onError, onMediaReady],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return;
      setBusy(true);
      try {
        for (const file of files) {
          if (disabled) break;
          await processFile(file);
        }
      } finally {
        setBusy(false);
      }
    },
    [disabled, processFile],
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

  return (
    <div
      role="button"
      tabIndex={disabled || busy ? -1 : 0}
      aria-label="Upload images or video. Choose files or drag and drop media."
      className={[
        "relative flex min-h-[168px] cursor-pointer touch-manipulation flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 transition select-none",
        dragOver
          ? "border-[#ff4500] bg-[color-mix(in_srgb,var(--gn-accent)_12%,var(--gn-surface-muted))]"
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
        accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled || busy}
        onChange={onPick}
      />
      <div className="pointer-events-none flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-accent)] ring-1 ring-[var(--gn-ring)]">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="M12 16V8" strokeLinecap="round" />
          <path d="M8 12l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M4 16.5V18a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0020 18v-1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="pointer-events-none text-center text-sm font-medium text-[var(--gn-text)]">
        {busy ? "Uploading…" : "Tap to choose or drag and drop media"}
      </p>
      <p className="pointer-events-none text-center text-xs text-[var(--gn-text-muted)]">
        Images up to 8 MB · Videos up to 50 MB · Multiple files · Shown below your
        text, not inside the editor
      </p>
    </div>
  );
}
