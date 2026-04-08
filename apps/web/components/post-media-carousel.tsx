"use client";

import { useEffect, useMemo, useState } from "react";
import { DmImageLightbox } from "@/components/dm-image-lightbox";
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
  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const n = items.length;

  const imageUrls = useMemo(
    () => items.filter((m) => m.type === "image").map((m) => m.url),
    [items],
  );

  useEffect(() => {
    if (n === 0) return;
    setIndex((i) => Math.min(Math.max(i, 0), n - 1));
  }, [n]);

  if (n === 0) return null;

  const safeIndex = ((index % n) + n) % n;
  const cur = items[safeIndex];
  const hasMany = n > 1;

  const btnClass =
    "absolute top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)]/95 text-[var(--gn-text)] shadow-md backdrop-blur-sm transition hover:bg-[var(--gn-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[#ff4500]";

  const shell = embedded
    ? "gn-post-media-attachments gn-post-media-attachments--embedded relative overflow-hidden p-3 sm:p-4"
    : "gn-post-media-attachments gn-card-subtle relative overflow-hidden p-3 sm:p-4";

  const openLightboxForUrl = (url: string) => {
    if (imageUrls.length === 0) return;
    const i = imageUrls.indexOf(url);
    setLightbox({
      urls: imageUrls,
      index: i >= 0 ? i : 0,
    });
  };

  return (
    <div className={shell}>
      {lightbox ? (
        <DmImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
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
      <div className="relative aspect-[16/10] max-h-[min(75dvh,44rem)] min-h-[11rem] w-full overflow-hidden rounded-xl bg-black/25 ring-1 ring-[var(--gn-ring)]">
        {cur.type === "image" ? (
          <button
            type="button"
            className="absolute inset-0 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
            aria-label={`View image ${safeIndex + 1} larger`}
            onClick={() => openLightboxForUrl(cur.url)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={cur.url}
              src={cur.url}
              alt=""
              className="pointer-events-none h-full w-full object-cover object-center select-none"
              loading={safeIndex === 0 ? "eager" : "lazy"}
            />
          </button>
        ) : (
          <video
            key={cur.url}
            src={cur.url}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain"
          />
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
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white tabular-nums sm:bottom-3">
          {safeIndex + 1} / {n}
        </div>
      ) : null}
    </div>
  );
}
