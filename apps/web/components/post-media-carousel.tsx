"use client";

import { useEffect, useState } from "react";
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
  const n = items.length;

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
    ? "gn-post-media-attachments gn-post-media-attachments--embedded relative overflow-hidden p-4"
    : "gn-post-media-attachments gn-card-subtle relative overflow-hidden p-4";

  return (
    <div className={shell}>
      {hasMany ? (
        <button
          type="button"
          className={`${btnClass} left-2`}
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
      <div className="relative min-h-[12rem]">
        {cur.type === "image" ? (
          <img
            key={cur.url}
            src={cur.url}
            alt=""
            className="gn-post-attachment-img"
            loading={safeIndex === 0 ? "eager" : "lazy"}
          />
        ) : (
          <video
            key={cur.url}
            src={cur.url}
            controls
            playsInline
            preload="metadata"
            className="gn-post-attachment-video"
          />
        )}
      </div>
      {hasMany ? (
        <button
          type="button"
          className={`${btnClass} right-2`}
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
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white tabular-nums">
          {safeIndex + 1} / {n}
        </div>
      ) : null}
    </div>
  );
}
