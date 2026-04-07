"use client";

import { useCallback, useRef, useState } from "react";

const STAR_PATH =
  "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function ratingFromPointer(
  clientX: number,
  rect: DOMRect,
  roundStep: number,
): number {
  const x = clamp(clientX - rect.left, 0, rect.width);
  const raw = rect.width > 0 ? 1 + (x / rect.width) * 4 : 3;
  const stepped = Math.round(raw / roundStep) * roundStep;
  return clamp(Number(stepped.toFixed(4)), 1, 5);
}

function StarSlot({
  index,
  display,
}: {
  index: number;
  display: number;
}) {
  const fill = clamp(display - index, 0, 1);
  const pct = `${fill * 100}%`;

  return (
    <span
      className="relative inline-block h-8 w-8 shrink-0 align-middle"
      aria-hidden
    >
      {/* Base “empty” star — neutral + amber tint so it never matches the page background */}
      <svg
        className="pointer-events-none absolute left-0 top-0 h-8 w-8 text-neutral-600 opacity-35 dark:text-amber-100 dark:opacity-25"
        width="32"
        height="32"
        viewBox="0 0 24 24"
      >
        <path fill="currentColor" d={STAR_PATH} />
      </svg>
      <span
        className="pointer-events-none absolute left-0 top-0 z-[1] h-8 overflow-hidden"
        style={{ width: pct }}
      >
        <svg
          className="h-8 w-8 shrink-0 text-amber-400"
          width="32"
          height="32"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

/** 1–5 with decimal steps; hover previews like a slider, drag or click commits. */
export function InteractiveStarRating({
  value,
  onChange,
  step = 0.1,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  /** Increment for snapping (default 0.1). */
  step?: number;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  const fromX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      return ratingFromPointer(clientX, el.getBoundingClientRect(), step);
    },
    [step, value],
  );

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={Number(display.toFixed(2))}
        aria-label="Rating from 1 to 5 stars"
        className="inline-flex min-h-10 min-w-[11rem] cursor-pointer select-none items-center gap-0.5 rounded-md py-0.5 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#ff6a38]"
        onMouseMove={(e) => {
          if (e.buttons !== 0) return;
          setHover(fromX(e.clientX));
        }}
        onMouseLeave={() => setHover(null)}
        onPointerDown={(e) => {
          const el = trackRef.current;
          el?.setPointerCapture(e.pointerId);
          onChange(fromX(e.clientX));
        }}
        onPointerMove={(e) => {
          const el = trackRef.current;
          if (el?.hasPointerCapture(e.pointerId)) {
            onChange(fromX(e.clientX));
          }
        }}
        onPointerUp={(e) => {
          trackRef.current?.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          trackRef.current?.releasePointerCapture(e.pointerId);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(clamp(Number((value + step).toFixed(4)), 1, 5));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(clamp(Number((value - step).toFixed(4)), 1, 5));
          }
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <StarSlot key={i} index={i} display={display} />
        ))}
      </div>
      <span className="min-w-[3.25rem] tabular-nums text-sm font-medium text-[var(--gn-text)]">
        {display.toFixed(1)}
        <span className="text-[var(--gn-text-muted)]"> / 5</span>
      </span>
    </div>
  );
}
