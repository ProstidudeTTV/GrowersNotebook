"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Centered image overlay with optional prev/next (Messenger-style).
 * Image is capped so it never fills the viewport on mobile or desktop.
 */
export function DmImageLightbox({
  urls,
  initialIndex,
  onClose,
}: {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, urls.length - 1)),
  );
  const safe = urls.length > 0 ? urls : [];
  const i = safe.length ? Math.min(index, safe.length - 1) : 0;
  const src = safe[i];
  const hasNav = safe.length > 1;

  const goPrev = useCallback(() => {
    setIndex((j) => (j <= 0 ? safe.length - 1 : j - 1));
  }, [safe.length]);

  const goNext = useCallback(() => {
    setIndex((j) => (j >= safe.length - 1 ? 0 : j + 1));
  }, [safe.length]);

  useEffect(() => {
    setIndex(
      Math.min(Math.max(0, initialIndex), Math.max(0, urls.length - 1)),
    );
  }, [initialIndex, urls]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!hasNav) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, goNext, goPrev, hasNav]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close image viewer"
        onClick={onClose}
      />
      {hasNav ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-[210] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-lg text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:left-4"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-[210] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-lg text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:right-4"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
          <p className="pointer-events-none absolute bottom-4 left-1/2 z-[210] -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs text-white">
            {i + 1} / {safe.length}
          </p>
        </>
      ) : null}
      <button
        type="button"
        className="fixed right-3 top-3 z-[220] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:right-5 sm:top-5"
        aria-label="Close"
        onClick={onClose}
      >
        <span aria-hidden className="text-xl leading-none">
          ×
        </span>
      </button>
      <div
        className="relative z-10 flex max-h-[min(94dvh,1200px)] max-w-[min(98vw,1400px)] items-center justify-center px-1"
        role="dialog"
        aria-modal="true"
        aria-label="Message images"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`Attachment ${i + 1} of ${safe.length}`}
          className="h-auto w-auto max-h-[min(94dvh,1200px)] max-w-[min(98vw,1400px)] border-0 object-contain shadow-none [image-rendering:auto] [backface-visibility:hidden] [transform:translateZ(0)]"
          decoding="async"
          fetchPriority="high"
        />
      </div>
    </div>
  );
}
