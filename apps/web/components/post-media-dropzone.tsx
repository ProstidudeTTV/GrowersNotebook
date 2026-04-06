"use client";

import { useCallback, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { uploadPostImage, uploadPostVideo } from "@/lib/upload-post-media";

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
    async (file: File) => {
      const okImage = /^image\/(jpeg|png|webp|gif)$/i.test(file.type);
      const okVideo = /^video\/(mp4|webm|quicktime)$/i.test(file.type);
      if (!okImage && !okVideo) {
        onError?.("Drop an image (JPEG, PNG, WebP, GIF) or video (MP4, WebM, MOV).");
        return;
      }
      setBusy(true);
      try {
        const supabase = createClient();
        const token = await getAccessTokenForApi(supabase);
        if (!token) {
          onError?.("Sign in to upload media.");
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          onError?.("Sign in to upload media.");
          return;
        }
        if (okImage) {
          const r = await uploadPostImage(supabase, user.id, file);
          if (!r.ok) {
            onError?.(r.message);
            return;
          }
          onMediaReady(r.publicUrl, "image");
        } else {
          const r = await uploadPostVideo(supabase, user.id, file);
          if (!r.ok) {
            onError?.(r.message);
            return;
          }
          onMediaReady(r.publicUrl, "video");
        }
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [onError, onMediaReady],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || busy) return;
      const f = e.dataTransfer.files?.[0];
      if (f) void processFile(f);
    },
    [busy, disabled, processFile],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f) void processFile(f);
    },
    [processFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
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
      className={[
        "relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 transition",
        dragOver
          ? "border-[#ff4500] bg-[color-mix(in_srgb,var(--gn-accent)_12%,var(--gn-surface-muted))]"
          : "border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-ring))]",
        disabled || busy ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
      onClick={() => {
        if (!disabled && !busy) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mov"
        className="sr-only"
        aria-label="Upload image or video"
        disabled={disabled || busy}
        onChange={onPick}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-accent)] ring-1 ring-[var(--gn-ring)]">
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
      <p className="text-center text-sm font-medium text-[var(--gn-text)]">
        {busy ? "Uploading…" : "Drag and drop or upload media"}
      </p>
      <p className="text-center text-xs text-[var(--gn-text-muted)]">
        Images up to 8 MB · Videos up to 50 MB · Shown below your text on the post, not inside the editor
      </p>
    </div>
  );
}
