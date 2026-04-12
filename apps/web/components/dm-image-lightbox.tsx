"use client";

import {
  useCallback,
  useEffect,
  useState,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { isDmVideoUrl } from "@/lib/dm-media-url";

function naturalAspectFrom(
  e: SyntheticEvent<HTMLImageElement>,
): number | undefined {
  const el = e.currentTarget;
  const { naturalWidth: nw, naturalHeight: nh } = el;
  if (nw < 1 || nh < 1) return undefined;
  return nw / nh;
}

/**
 * Full-viewer overlay for DM attachments. Rendered with createPortal on
 * document.body so parent flex/transform cannot squash sizing or trap fixed
 * positioning.
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
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(
    undefined,
  );

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
    setAspectRatio(undefined);
  }, [src]);

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

  if (!src || typeof document === "undefined") return null;

  const maxW = "min(96vw, 42rem)";
  const maxH = "min(88dvh, 48rem)";

  const shell = (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        aria-label="Close viewer"
        onClick={onClose}
      />
      {hasNav ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-[510] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-lg text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:left-4"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-[510] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-lg text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:right-4"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
          <p className="pointer-events-none absolute bottom-6 left-1/2 z-[510] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
            {i + 1} / {safe.length}
          </p>
        </>
      ) : null}
      <button
        type="button"
        className="absolute right-3 top-3 z-[520] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] text-[var(--gn-text)] shadow-md transition hover:bg-[var(--gn-surface-hover)] sm:right-5 sm:top-5"
        aria-label="Close"
        onClick={onClose}
      >
        <span aria-hidden className="text-xl leading-none">
          ×
        </span>
      </button>
      <div
        className="relative z-[505] inline-block max-w-full rounded-xl bg-zinc-950/90 p-1.5 shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-white/12"
        role="dialog"
        aria-modal="true"
        aria-label="Message attachments"
        onClick={(e) => e.stopPropagation()}
      >
        {isDmVideoUrl(src) ? (
          <video
            key={src}
            src={src}
            controls
            playsInline
            aria-label={`Video ${i + 1} of ${safe.length}`}
            className="block rounded-lg"
            style={{
              display: "block",
              width: "auto",
              height: "auto",
              maxWidth: maxW,
              maxHeight: maxH,
            }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt={`Attachment ${i + 1} of ${safe.length}`}
            className="block rounded-lg"
            style={{
              objectFit: "contain",
              objectPosition: "center",
              display: "block",
              width: "auto",
              height: "auto",
              maxWidth: maxW,
              maxHeight: maxH,
              ...(aspectRatio ? { aspectRatio } : {}),
            }}
            onLoad={(e) => {
              const ar = naturalAspectFrom(e);
              if (ar !== undefined) setAspectRatio(ar);
            }}
            decoding="async"
            fetchPriority="high"
          />
        )}
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
