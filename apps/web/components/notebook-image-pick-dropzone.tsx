"use client";

/**
 * Image uploads for notebooks (weeks / harvest): explicit file button + drag-and-drop.
 * Uses the same Supabase `post-media` bucket as posts so URLs pass API validation.
 */
import { useCallback, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import {
  isProcessablePostImage,
  uploadPostImage,
} from "@/lib/upload-post-media";

export function NotebookImagePickDropzone({
  disabled,
  remainingSlots,
  onImageUrl,
  onError,
}: {
  disabled?: boolean;
  remainingSlots: number;
  onImageUrl: (httpsUrl: string) => void;
  onError?: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const processFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (!isProcessablePostImage(file)) {
        onError?.(
          "Use a JPEG, PNG, WebP, or GIF image. HEIC is not supported in the browser yet.",
        );
        return false;
      }
      try {
        const supabase = createClient();
        const token = await getAccessTokenForApi(supabase);
        if (!token) {
          onError?.("Sign in to upload photos.");
          return false;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          onError?.("Sign in to upload photos.");
          return false;
        }
        const r = await uploadPostImage(supabase, user.id, file);
        if (!r.ok) {
          onError?.(r.message);
          return false;
        }
        onImageUrl(r.publicUrl);
        return true;
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Upload failed");
        return false;
      }
    },
    [onError, onImageUrl],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (disabled || remainingSlots <= 0 || files.length === 0) return;
      setBusy(true);
      try {
        let slots = remainingSlots;
        for (const file of files) {
          if (disabled || slots <= 0) break;
          const ok = await processFile(file);
          if (ok) slots -= 1;
        }
      } finally {
        setBusy(false);
      }
    },
    [disabled, processFile, remainingSlots],
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
    if (disabled || busy || remainingSlots <= 0) return;
    inputRef.current?.click();
  }, [busy, disabled, remainingSlots]);

  const dim = disabled || busy || remainingSlots <= 0;

  return (
    <div
      className={[
        "rounded-xl border-2 border-dashed px-4 py-4 transition",
        dragOver
          ? "border-emerald-500/70 bg-[color-mix(in_srgb,var(--gn-accent)_10%,var(--gn-surface-muted))]"
          : "border-[var(--gn-ring)] bg-[var(--gn-surface)]",
        dim ? "opacity-55" : "",
      ].join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dim) setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        if (dim) return;
        const list = e.dataTransfer.files;
        if (list?.length) void processFiles(Array.from(list));
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={dim}
        onChange={onPick}
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPicker();
          }}
          disabled={dim}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-45"
        >
          {busy ? "Uploading…" : "Choose from device"}
        </button>
        <p className="text-xs text-[var(--gn-text-muted)]">
          Or drag images here · up to {remainingSlots} more · JPEG / PNG / WebP /
          GIF
        </p>
        <p className="text-[11px] text-[var(--gn-text-muted)]">
          Same secure storage as forum posts (public https link).
        </p>
      </div>
    </div>
  );
}
