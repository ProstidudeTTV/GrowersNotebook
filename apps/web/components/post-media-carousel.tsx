"use client";

import { useEffect, useMemo, useState } from "react";
import { MediaViewer } from "@/components/media-viewer";
import type { PostMediaItem } from "@/lib/feed-post";

export function PostMediaCarousel({
  items,
  /** When true, outer card chrome is omitted (parent `.gn-post-content-flow` provides one surface). */
  embedded = false,
}: {
  items: PostMediaItem[];
  embedded?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const n = items.length;

  const allUrls = useMemo(() => items.map((m) => m.url), [items]);

  useEffect(() => {
    if (n === 0) return;
    setIndex((i) => Math.min(Math.max(i, 0), n - 1));
  }, [n]);

  if (n === 0) return null;

  const safeIndex = ((index % n) + n) % n;
  const cur = items[safeIndex];
  const hasMany = n > 1;

  const btnClass =
    "absolute top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)]/95 text-[var(--gn-text)] shadow-md backdrop-blur-sm transition hover:bg-[var(--gn-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--gn-accent)]";

  const shell = embedded
    ? "gn-post-media-attachments gn-post-media-attachments--embedded relative overflow-hidden p-3 sm:p-4"
    : "gn-post-media-attachments gn-card-subtle relative overflow-hidden p-3 sm:p-4";

  const openViewerAt = (idx: number) => {
    setViewer({ urls: allUrls, index: idx });
  };

  return (
    <div className={shell}>
      {viewer ? (
        <MediaViewer
          urls={viewer.urls}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          ariaLabel="Post media"
        />
      ) : null}
      {hasMany ? (
        <button
          type="button"
          className={`${btnClass} left-1.5 sm:left-2`}
          aria-label="Previous media"
          onClick={() => setIndex((i) => i - 1)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : null}
      <div className="relative min-h-[11rem] w-full overflow-hidden rounded-xl bg-[var(--gn-surface-muted)]">
        {cur.type === "image" ? (
          <button
            type="button"
            className="absolute inset-0 block h-full min-h-[11rem] w-full cursor-zoom-in border-0 bg-transparent p-0"
            aria-label={`View image ${safeIndex + 1} larger`}
            onClick={() => openViewerAt(safeIndex)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={cur.url}
              src={cur.url}
              alt=""
              className="pointer-events-none h-full min-h-[11rem] w-full max-h-[min(75dvh,44rem)] object-contain object-center select-none"
              loading={safeIndex === 0 ? "eager" : "lazy"}
            />
          </button>
        ) : (
          <div className="relative flex min-h-[11rem] max-h-[min(75dvh,44rem)] w-full items-center justify-center">
            <video
              key={cur.url}
              src={cur.url}
              controls
              playsInline
              preload="metadata"
              className="max-h-[min(75dvh,44rem)] w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="absolute right-2 top-2 z-[2] flex h-9 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--gn-page-top)_80%,transparent)] px-3 text-xs font-semibold text-[var(--gn-text)] shadow-md backdrop-blur-md ring-1 ring-[var(--gn-divide)]"
              aria-label="Open video fullscreen"
              onClick={() => openViewerAt(safeIndex)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
              Fullscreen
            </button>
          </div>
        )}
      </div>
      {hasMany ? (
        <button
          type="button"
          className={`${btnClass} right-1.5 sm:right-2`}
          aria-label="Next media"
          onClick={() => setIndex((i) => i + 1)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      ) : null}
      {hasMany ? (
        <button
          type="button"
          className="absolute inset-x-0 bottom-2.5 z-[1] mx-auto w-fit cursor-zoom-in rounded-full bg-[color-mix(in_srgb,var(--gn-page-top)_70%,transparent)] px-2.5 py-1 text-xs font-medium tabular-nums text-[var(--gn-text)] backdrop-blur-sm sm:bottom-3"
          aria-label={`View media ${safeIndex + 1} in fullscreen`}
          onClick={() => openViewerAt(safeIndex)}
        >
          {safeIndex + 1} / {n} · tap to expand
        </button>
      ) : null}
    </div>
  );
}
