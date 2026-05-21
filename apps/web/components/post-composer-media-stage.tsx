"use client";

import Image from "next/image";
import { useCallback } from "react";
import { PostMediaDropzone } from "@/components/post-media-dropzone";
import type { PostMediaItem } from "@/lib/feed-post";
import { MAX_POST_MEDIA } from "@/lib/post-draft-validation";

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function MediaTile({
  item,
  index,
  total,
  disabled,
  onRemove,
  onSetCover,
  onMoveEarlier,
  onMoveLater,
}: {
  item: PostMediaItem;
  index: number;
  total: number;
  disabled?: boolean;
  onRemove: () => void;
  onSetCover: () => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
}) {
  const isCover = index === 0;

  return (
    <div className="group relative overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] ring-1 ring-[var(--gn-divide)]">
      <div className="relative aspect-[4/3] w-full sm:aspect-video">
        {item.type === "image" ? (
          <Image
            src={item.url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 320px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--gn-surface-elevated)] text-[var(--gn-text-muted)]">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
            <span className="text-xs font-semibold">Video</span>
          </div>
        )}
        {isCover ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--gn-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--gn-on-accent)] shadow-sm">
            Cover
          </span>
        ) : null}
        <div className="absolute right-1 top-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            disabled={disabled}
            aria-label="Remove"
            className="rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white hover:bg-black/80 disabled:opacity-50"
            onClick={onRemove}
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[var(--gn-divide)] px-2 py-1.5">
        {!isCover ? (
          <button
            type="button"
            disabled={disabled}
            className="text-[10px] font-semibold text-[var(--gn-accent)] hover:underline disabled:opacity-50"
            onClick={onSetCover}
          >
            Set as cover
          </button>
        ) : (
          <span className="text-[10px] text-[var(--gn-text-muted)]">Feed hero</span>
        )}
        <div className="ml-auto flex gap-0.5">
          <button
            type="button"
            disabled={disabled || index === 0}
            aria-label="Move earlier"
            className="rounded-md px-1.5 py-0.5 text-xs text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-30"
            onClick={onMoveEarlier}
          >
            ←
          </button>
          <button
            type="button"
            disabled={disabled || index >= total - 1}
            aria-label="Move later"
            className="rounded-md px-1.5 py-0.5 text-xs text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)] disabled:opacity-30"
            onClick={onMoveLater}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Instagram-style media stage: hero preview, cover order, reorder — media-first create flow. */
export function PostComposerMediaStage({
  media,
  onMediaChange,
  onMediaReady,
  disabled,
  onError,
}: {
  media: PostMediaItem[];
  onMediaChange: (items: PostMediaItem[]) => void;
  onMediaReady: (url: string, kind: "image" | "video") => void;
  disabled?: boolean;
  onError?: (message: string | null) => void;
}) {
  const atCap = media.length >= MAX_POST_MEDIA;

  const remove = useCallback(
    (idx: number) => {
      onMediaChange(media.filter((_, i) => i !== idx));
    },
    [media, onMediaChange],
  );

  const setCover = useCallback(
    (idx: number) => {
      if (idx <= 0) return;
      onMediaChange(moveItem(media, idx, 0));
    },
    [media, onMediaChange],
  );

  return (
    <section aria-label="Photos and video">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[var(--gn-text)]">
            Photos &amp; video
          </h2>
          <p className="mt-0.5 text-xs text-[var(--gn-text-muted)]">
            First image is your feed cover. Drag order with arrows — up to{" "}
            {MAX_POST_MEDIA} files.
          </p>
        </div>
        {media.length > 0 ? (
          <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--gn-text-muted)]">
            {media.length}/{MAX_POST_MEDIA}
          </span>
        ) : null}
      </div>

      {media.length === 0 ? (
        <div className="mt-3">
          <PostMediaDropzone
            disabled={disabled}
            onMediaReady={onMediaReady}
            onError={(msg) => onError?.(msg)}
            size="hero"
          />
        </div>
      ) : media.length === 1 ? (
        <div className="mt-3 space-y-3">
          <MediaTile
            item={media[0]!}
            index={0}
            total={1}
            disabled={disabled}
            onRemove={() => remove(0)}
            onSetCover={() => {}}
            onMoveEarlier={() => {}}
            onMoveLater={() => {}}
          />
          {!atCap ? (
            <PostMediaDropzone
              disabled={disabled}
              onMediaReady={onMediaReady}
              onError={(msg) => onError?.(msg)}
              size="compact"
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <ul
            className={
              media.length === 2
                ? "grid grid-cols-2 gap-2"
                : media.length <= 4
                  ? "grid grid-cols-2 gap-2 sm:grid-cols-2"
                  : "flex gap-2 overflow-x-auto pb-1 gn-scrollbar-themed"
            }
          >
            {media.map((m, idx) => (
              <li
                key={`${m.url}-${idx}`}
                className={
                  media.length > 4
                    ? "w-[min(72vw,220px)] shrink-0"
                    : "min-w-0"
                }
              >
                <MediaTile
                  item={m}
                  index={idx}
                  total={media.length}
                  disabled={disabled}
                  onRemove={() => remove(idx)}
                  onSetCover={() => setCover(idx)}
                  onMoveEarlier={() =>
                    onMediaChange(moveItem(media, idx, idx - 1))
                  }
                  onMoveLater={() =>
                    onMediaChange(moveItem(media, idx, idx + 1))
                  }
                />
              </li>
            ))}
            {!atCap ? (
              <li
                className={
                  media.length > 4
                    ? "w-[min(72vw,220px)] shrink-0"
                    : "min-w-0"
                }
              >
                <PostMediaDropzone
                  disabled={disabled}
                  onMediaReady={onMediaReady}
                  onError={(msg) => onError?.(msg)}
                  size="tile"
                />
              </li>
            ) : null}
          </ul>
        </div>
      )}

      {atCap ? (
        <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
          Maximum {MAX_POST_MEDIA} attachments per post.
        </p>
      ) : null}
    </section>
  );
}
