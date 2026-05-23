"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { isDmVideoUrl } from "@/lib/dm-media-url";

const SWIPE_NAV_PX = 56;
const SWIPE_DISMISS_PX = 72;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.min(Math.max(0, i), len - 1);
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Immersive image/video viewer (Facebook theater / Reddit lightbox style).
 * Edge-to-edge stage, contain fit, swipe gallery, pinch/double-tap zoom on images.
 */
export function MediaViewer({
  urls,
  initialIndex,
  onClose,
  ariaLabel = "Media viewer",
}: {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
  ariaLabel?: string;
}) {
  const safe = urls.filter((u) => u.trim().length > 0);
  const [index, setIndex] = useState(() =>
    clampIndex(initialIndex, safe.length),
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dismissOffset, setDismissOffset] = useState(0);
  const touchRef = useRef<{
    x: number;
    y: number;
    mode: "idle" | "pan" | "swipe";
  }>({ x: 0, y: 0, mode: "idle" });
  const stageRef = useRef<HTMLDivElement>(null);

  const i = safe.length ? clampIndex(index, safe.length) : 0;
  const src = safe[i];
  const hasNav = safe.length > 1;
  const isVideo = src ? isDmVideoUrl(src) : false;

  const goPrev = useCallback(() => {
    setIndex((j) => (j <= 0 ? safe.length - 1 : j - 1));
  }, [safe.length]);

  const goNext = useCallback(() => {
    setIndex((j) => (j >= safe.length - 1 ? 0 : j + 1));
  }, [safe.length]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    setIndex(clampIndex(initialIndex, safe.length));
  }, [initialIndex, safe.length]);

  useEffect(() => {
    resetZoom();
    setDismissOffset(0);
  }, [src, resetZoom]);

  useEffect(() => {
    if (safe.length < 2) return;
    const preload = (url: string) => {
      if (isDmVideoUrl(url)) return;
      const img = new Image();
      img.src = url;
    };
    const prev = safe[i <= 0 ? safe.length - 1 : i - 1];
    const next = safe[i >= safe.length - 1 ? 0 : i + 1];
    if (prev) preload(prev);
    if (next) preload(next);
  }, [i, safe]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasNav) {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight" && hasNav) {
        e.preventDefault();
        goNext();
      }
      if (e.key === "0" || e.key === "=") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, goNext, goPrev, hasNav, resetZoom]);

  const onWheel = (e: ReactWheelEvent) => {
    if (isVideo) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
    }
  };

  const onDoubleClick = () => {
    if (isVideo) return;
    setZoom((z) => (z > 1.05 ? 1 : 2));
    if (zoom > 1.05) setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (isVideo) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    touchRef.current = { x: e.clientX, y: e.clientY, mode: zoom > 1 ? "pan" : "swipe" };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const t = touchRef.current;
    if (t.mode === "idle") return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (t.mode === "pan" && zoom > 1) {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      touchRef.current = { ...t, x: e.clientX, y: e.clientY };
      return;
    }
    if (t.mode === "swipe" && zoom <= 1) {
      if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        setDismissOffset(Math.min(dy, 120));
      }
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const t = touchRef.current;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    touchRef.current = { x: 0, y: 0, mode: "idle" };

    if (zoom <= 1 && dismissOffset >= SWIPE_DISMISS_PX) {
      onClose();
      return;
    }
    setDismissOffset(0);

    if (zoom <= 1 && hasNav) {
      if (dx <= -SWIPE_NAV_PX) goNext();
      else if (dx >= SWIPE_NAV_PX) goPrev();
    }
  };

  if (!src || typeof document === "undefined") return null;

  const shell = (
    <div
      ref={stageRef}
      className="gn-media-viewer fixed inset-0 z-[500] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      style={{
        opacity: dismissOffset > 0 ? 1 - dismissOffset / 200 : 1,
        transform:
          dismissOffset > 0 ? `translateY(${dismissOffset}px)` : undefined,
        transition: dismissOffset > 0 ? "none" : "opacity 0.2s ease",
      }}
    >
      <button
        type="button"
        className="absolute inset-0 z-[500] bg-[color-mix(in_srgb,var(--gn-page-top)_94%,transparent)]"
        aria-label="Close viewer"
        onClick={onClose}
      />

      {hasNav ? (
        <>
          <button
            type="button"
            className="gn-media-viewer-nav gn-media-viewer-nav--prev absolute left-0 top-0 z-[510] hidden h-full w-[min(22vw,8rem)] items-center justify-start pl-2 sm:flex"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gn-surface-elevated)_88%,transparent)] text-[var(--gn-text)] shadow-lg backdrop-blur-md ring-1 ring-[var(--gn-divide)]">
              <Chevron dir="left" />
            </span>
          </button>
          <button
            type="button"
            className="gn-media-viewer-nav gn-media-viewer-nav--next absolute right-0 top-0 z-[510] hidden h-full w-[min(22vw,8rem)] items-center justify-end pr-2 sm:flex"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gn-surface-elevated)_88%,transparent)] text-[var(--gn-text)] shadow-lg backdrop-blur-md ring-1 ring-[var(--gn-divide)]">
              <Chevron dir="right" />
            </span>
          </button>
        </>
      ) : null}

      <button
        type="button"
        className="absolute right-3 top-3 z-[520] flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gn-surface-elevated)_90%,transparent)] text-[var(--gn-text)] shadow-lg backdrop-blur-md ring-1 ring-[var(--gn-divide)] transition sm:right-5 sm:top-5"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <CloseIcon />
      </button>

      {hasNav ? (
        <p
          className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[520] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--gn-page-top)_75%,transparent)] px-4 py-1.5 text-sm font-semibold tabular-nums text-[var(--gn-text)] shadow-md backdrop-blur-md"
        >
          {i + 1} / {safe.length}
        </p>
      ) : null}

      <div
        className="pointer-events-none relative z-[505] flex min-h-0 flex-1 items-center justify-center px-2 pb-14 pt-14 sm:px-6"
      >
        <div
          className="pointer-events-auto flex max-h-[min(92dvh,100%)] max-w-[min(96vw,1200px)] items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            touchAction: isVideo ? "auto" : "none",
          }}
          onWheel={onWheel}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onDoubleClick();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <video
              key={src}
              src={src}
              controls
              playsInline
              autoPlay
              className="gn-media-viewer-video max-h-[min(92dvh,100%)] max-w-[min(96vw,1200px)] rounded-lg"
              aria-label={`Video ${i + 1} of ${safe.length}`}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={src}
              src={src}
              alt={`Image ${i + 1} of ${safe.length}`}
              className="gn-media-viewer-image max-h-[min(92dvh,100%)] max-w-[min(96vw,1200px)] select-none"
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
          )}
        </div>
      </div>

      {hasNav ? (
        <div
          className="absolute bottom-20 left-1/2 z-[510] flex -translate-x-1/2 gap-2 sm:hidden"
        >
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gn-surface-elevated)_90%,transparent)] text-[var(--gn-text)] shadow-md ring-1 ring-[var(--gn-divide)]"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gn-surface-elevated)_90%,transparent)] text-[var(--gn-text)] shadow-md ring-1 ring-[var(--gn-divide)]"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <Chevron dir="right" />
          </button>
        </div>
      ) : null}
    </div>
  );

  return createPortal(shell, document.body);
}
