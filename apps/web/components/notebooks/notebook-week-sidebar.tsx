"use client";

import { useEffect, useMemo, useState } from "react";
import type { NotebookDetailPayload } from "@/components/notebook-detail-client";

export function NotebookWeekSidebar({
  weeks,
  variant,
}: {
  weeks: NotebookDetailPayload["weeks"];
  variant: "sidebar" | "mobile";
}) {
  const sorted = useMemo(
    () => [...weeks].sort((a, b) => a.weekIndex - b.weekIndex),
    [weeks],
  );
  const indicesKey = sorted.map((w) => w.weekIndex).join(",");
  const indices = useMemo(
    () => sorted.map((w) => w.weekIndex),
    [sorted],
  );
  const [active, setActive] = useState<number | null>(indices[0] ?? null);

  useEffect(() => {
    if (!indices.length) return;
    const els = indices
      .map((i) => document.getElementById(`week-${i}`))
      .filter((e): e is HTMLElement => e != null);
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const t = visible[0]?.target;
        if (t?.id) {
          const m = /^week-(\d+)$/.exec(t.id);
          if (m) setActive(Number(m[1]));
        }
      },
      { rootMargin: "-80px 0px -45% 0px", threshold: [0, 0.15, 0.35, 0.55] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [indicesKey]);

  function scrollToWeek(weekIndex: number) {
    document.getElementById(`week-${weekIndex}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActive(weekIndex);
  }

  if (!sorted.length) {
    return (
      <p className="text-xs text-[var(--gn-text-muted)]">
        {variant === "sidebar"
          ? "No weeks yet. Use Add week to start your log."
          : ""}
      </p>
    );
  }

  return (
    <nav aria-label="Week calendar">
      {variant === "sidebar" ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
          Week calendar
        </p>
      ) : null}
      <ol
        className={
          variant === "mobile"
            ? "flex flex-nowrap gap-2 overflow-x-auto pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "mt-2 space-y-1"
        }
      >
        {sorted.map((w) => {
          const on = active === w.weekIndex;
          return (
            <li key={w.id} className={variant === "mobile" ? "shrink-0" : ""}>
              <button
                type="button"
                onClick={() => scrollToWeek(w.weekIndex)}
                className={[
                  variant === "mobile"
                    ? "inline-flex rounded-full border px-3 py-1.5 text-sm"
                    : "flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm transition",
                  on
                    ? "border-emerald-500/50 bg-emerald-500/15 font-medium text-[var(--gn-text)]"
                    : "border-[var(--gn-divide)] text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)]",
                ].join(" ")}
              >
                W{w.weekIndex}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
