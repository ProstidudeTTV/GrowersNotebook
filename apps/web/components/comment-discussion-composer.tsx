"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { uploadPostImage } from "@/lib/upload-post-media";

export const COMMENT_DISCUSSION_ATTACH_MAX = 8;

/** Quick-insert emoji for the comment box (Unicode). */
export const COMMENT_EMOJI_QUICK = [
  "\u{1F44D}",
  "\u{1F525}",
  "\u{2764}\u{FE0F}",
  "\u{1F389}",
  "\u{1F604}",
  "\u{1F331}",
];

export type PendingCommentImage = {
  id: string;
  localBlobUrl?: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: string;
};

export function revokePendingCommentImage(a: PendingCommentImage) {
  if (a.localBlobUrl) URL.revokeObjectURL(a.localBlobUrl);
}

async function fetchGiphyItems(q: string) {
  const r = await fetch(`/api/giphy-search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
  });
  const j = (await r.json()) as {
    items?: { url: string; preview: string; title: string }[];
  };
  return j.items ?? [];
}

export function CommentDiscussionComposer({
  viewerId,
  disabled = false,
  placeholder = "Join the discussion…",
  submitLabel = "Comment",
  replyBanner,
  onSubmit,
  onSubmitError,
}: {
  viewerId: string | null;
  /** Disables controls (e.g. parent loading). */
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  replyBanner?: ReactNode;
  onSubmit: (payload: {
    body: string;
    imageUrls: string[];
  }) => Promise<void>;
  onSubmitError?: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [pendingCommentImages, setPendingCommentImages] = useState<
    PendingCommentImage[]
  >([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifItems, setGifItems] = useState<
    { url: string; preview: string; title: string }[]
  >([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const commentPhotoInputId = useId();
  const pendingRef = useRef(pendingCommentImages);
  pendingRef.current = pendingCommentImages;
  const debouncedGifQuery = useDebouncedValue(gifQuery.trim(), 320);
  const gifFetchSeq = useRef(0);

  useEffect(() => {
    return () => {
      for (const a of pendingRef.current) {
        revokePendingCommentImage(a);
      }
    };
  }, []);

  const runGifSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setGifItems([]);
      setGifLoading(false);
      return;
    }
    const seq = ++gifFetchSeq.current;
    setGifLoading(true);
    try {
      const items = await fetchGiphyItems(trimmed);
      if (seq === gifFetchSeq.current) setGifItems(items);
    } catch {
      if (seq === gifFetchSeq.current) setGifItems([]);
    } finally {
      if (seq === gifFetchSeq.current) setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gifPickerOpen) {
      gifFetchSeq.current += 1;
      setGifLoading(false);
      return;
    }
    void runGifSearch(debouncedGifQuery);
  }, [debouncedGifQuery, gifPickerOpen, runGifSearch]);

  const addGifToComment = useCallback((url: string) => {
    setPendingCommentImages((prev) => {
      if (prev.length >= COMMENT_DISCUSSION_ATTACH_MAX) return prev;
      if (prev.some((x) => x.remoteUrl === url)) return prev;
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return [...prev, { id, remoteUrl: url, uploading: false }];
    });
    setGifPickerOpen(false);
    setGifQuery("");
    setGifItems([]);
  }, []);

  const onCommentImageFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    if (!files?.length) {
      requestAnimationFrame(() => {
        input.value = "";
      });
      return;
    }
    const snapshot = Array.from(files);
    requestAnimationFrame(() => {
      input.value = "";
    });
    const supabase = createClient();
    void (async () => {
      const uid =
        viewerId ??
        (await supabase.auth.getUser()).data.user?.id ??
        null;
      if (!uid) {
        onSubmitError?.("Sign in to attach photos.");
        return;
      }
      const room =
        COMMENT_DISCUSSION_ATTACH_MAX - pendingCommentImages.length;
      if (room <= 0) return;
      const list = snapshot.slice(0, room);
      const newItems: PendingCommentImage[] = list.map((file) => ({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        localBlobUrl: URL.createObjectURL(file),
        uploading: true,
      }));
      setPendingCommentImages((prev) => [...prev, ...newItems]);
      await Promise.all(
        list.map(async (file, i) => {
          const itemId = newItems[i]!.id;
          try {
            const r = await uploadPostImage(supabase, uid, file);
            setPendingCommentImages((prev) => {
              const cur = prev.find((x) => x.id === itemId);
              if (!cur) return prev;
              if (!r.ok) {
                return prev.map((x) =>
                  x.id === itemId
                    ? { ...x, uploading: false, error: r.message }
                    : x,
                );
              }
              revokePendingCommentImage(cur);
              return prev.map((x) =>
                x.id === itemId
                  ? {
                      ...x,
                      uploading: false,
                      remoteUrl: r.publicUrl,
                      localBlobUrl: undefined,
                      error: undefined,
                    }
                  : x,
              );
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Could not upload image.";
            setPendingCommentImages((prev) => {
              const cur = prev.find((x) => x.id === itemId);
              if (!cur) return prev;
              return prev.map((x) =>
                x.id === itemId
                  ? { ...x, uploading: false, error: message }
                  : x,
              );
            });
          }
        }),
      );
    })();
  };

  const submit = async () => {
    const trimmed = text.trim();
    const remoteUrls = pendingCommentImages
      .map((a) => a.remoteUrl)
      .filter(Boolean) as string[];
    const uploading = pendingCommentImages.some((a) => a.uploading);
    const hasErr = pendingCommentImages.some((a) => a.error);
    const attachmentsReady =
      pendingCommentImages.length === 0 ||
      (remoteUrls.length === pendingCommentImages.length &&
        !uploading &&
        !hasErr);
    if (!trimmed && remoteUrls.length === 0) return;
    if (pendingCommentImages.length > 0 && !attachmentsReady) {
      if (uploading) onSubmitError?.("Wait for photos to finish uploading.");
      else if (hasErr) {
        onSubmitError?.("Remove photos that failed to upload, then try again.");
      } else onSubmitError?.("Photos are not ready to send yet.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        body: trimmed,
        imageUrls: remoteUrls.length > 0 ? remoteUrls : [],
      });
      setText("");
      setPendingCommentImages((prev) => {
        for (const a of prev) revokePendingCommentImage(a);
        return [];
      });
    } catch (e) {
      onSubmitError?.(
        e instanceof Error ? e.message : "Could not post comment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const busy = disabled || submitting;
  const canSend =
    (text.trim().length > 0 ||
      pendingCommentImages.some((a) => a.remoteUrl)) &&
    !pendingCommentImages.some((a) => a.uploading || a.error);

  return (
    <div className="space-y-2">
      <input
        id={commentPhotoInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={onCommentImageFiles}
      />
      <textarea
        className="gn-input min-h-[5.5rem] w-full p-3 text-sm sm:min-h-[6rem]"
        rows={4}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!viewerId || busy}
      />
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--gn-text-muted)]">
          Emoji
        </span>
        {COMMENT_EMOJI_QUICK.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={!viewerId || busy}
            className="rounded-md border border-[var(--gn-divide)] px-1.5 py-0.5 text-base leading-none transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-40"
            title={emoji}
            onClick={() => setText((t) => t + emoji)}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          disabled={!viewerId || busy}
          className="ml-1 rounded-full border border-[var(--gn-divide)] px-2.5 py-1 text-xs font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-40"
          onClick={() => setGifPickerOpen((o) => !o)}
        >
          GIF
        </button>
      </div>
      {gifPickerOpen && viewerId ? (
        <div className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3">
          <div className="flex flex-wrap gap-2">
            <input
              className="gn-input min-w-[12rem] flex-1 px-2 py-1.5 text-sm"
              placeholder="Search Giphy…"
              value={gifQuery}
              aria-busy={gifLoading}
              onChange={(e) => setGifQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runGifSearch(gifQuery);
                }
              }}
            />
            <button
              type="button"
              className="rounded-full bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-divide)] hover:bg-[var(--gn-surface-hover)]"
              onClick={() => void runGifSearch(gifQuery)}
            >
              {gifLoading ? "…" : "Search now"}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[var(--gn-text-muted)]">
            Powered by Giphy. Results update as you type (after a short pause).
          </p>
          {gifQuery.trim().length > 0 && gifQuery.trim().length < 2 ? (
            <p className="mt-1 text-[10px] text-[var(--gn-text-muted)]">
              Type at least 2 characters.
            </p>
          ) : null}
          {gifItems.length > 0 ? (
            <ul className="mt-3 grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {gifItems.map((g) => (
                <li key={g.url}>
                  <button
                    type="button"
                    className="relative block w-full overflow-hidden rounded-lg ring-1 ring-[var(--gn-divide)] hover:ring-[#ff4500]"
                    title={g.title}
                    onClick={() => addGifToComment(g.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.preview}
                      alt=""
                      className="h-16 w-full object-cover sm:h-20"
                      loading="lazy"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {busy ||
        pendingCommentImages.length >= COMMENT_DISCUSSION_ATTACH_MAX ||
        !viewerId ? (
          <span
            className="inline-flex rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--gn-text)] opacity-50"
            aria-disabled
          >
            Add photos ({pendingCommentImages.length}/
            {COMMENT_DISCUSSION_ATTACH_MAX})
          </span>
        ) : (
          <label
            htmlFor={commentPhotoInputId}
            className="inline-flex cursor-pointer touch-manipulation select-none rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
          >
            Add photos ({pendingCommentImages.length}/
            {COMMENT_DISCUSSION_ATTACH_MAX})
          </label>
        )}
        {pendingCommentImages.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setPendingCommentImages((prev) => {
                for (const a of prev) revokePendingCommentImage(a);
                return [];
              })
            }
            className="text-xs font-semibold text-[#ff4500] hover:underline disabled:opacity-50"
          >
            Clear photos
          </button>
        ) : null}
      </div>
      {pendingCommentImages.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendingCommentImages.map((att) => {
            const src = att.remoteUrl ?? att.localBlobUrl ?? "";
            return (
              <div
                key={att.id}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] sm:h-16 sm:w-16"
              >
                {src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : null}
                {att.uploading ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-medium text-white"
                    aria-hidden
                  >
                    …
                  </div>
                ) : null}
                {att.error ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-red-600/85 p-1 text-center text-[9px] font-medium leading-tight text-white"
                    title={att.error}
                  >
                    Failed
                  </div>
                ) : null}
                {!att.uploading && !att.error ? (
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="absolute right-0.5 top-0.5 rounded bg-black/55 px-1 text-[10px] text-white hover:bg-black/75"
                    onClick={() => {
                      setPendingCommentImages((prev) => {
                        const found = prev.find((x) => x.id === att.id);
                        if (found) revokePendingCommentImage(found);
                        return prev.filter((x) => x.id !== att.id);
                      });
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {replyBanner}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!viewerId || busy || !canSend}
        className="w-full rounded-full bg-[#ff4500] px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_16px_rgba(255,69,0,0.3)] transition hover:bg-[#ff5414] hover:shadow-[0_0_24px_rgba(255,69,0,0.4)] disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Posting…" : submitLabel}
      </button>
    </div>
  );
}
