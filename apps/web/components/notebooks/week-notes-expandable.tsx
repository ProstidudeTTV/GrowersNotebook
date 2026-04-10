"use client";

import { useMemo, useState, type ReactNode } from "react";

export function WeekNotesExpandable({
  title,
  spots,
  formatInstant,
}: {
  title: ReactNode;
  spots: { body: string; at: string }[];
  formatInstant: (iso: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalLen = useMemo(
    () => spots.reduce((n, s) => n + s.body.length, 0),
    [spots],
  );
  const needsToggle = spots.length > 1 || totalLen > 200;

  const clampClass =
    expanded || !needsToggle
      ? ""
      : "max-h-[7.5rem] overflow-hidden";

  return (
    <div className="min-w-0">
      {title}
      <div className={`mt-2 space-y-2 ${clampClass}`}>
        {spots.map((spot, idx) => (
          <div
            key={idx}
            className={
              idx > 0
                ? "mt-2.5 border-l-2 border-[var(--gn-divide)]/45 pl-3"
                : ""
            }
          >
            <time
              className="text-[10px] font-medium tabular-nums text-[var(--gn-text-muted)]"
              dateTime={spot.at}
            >
              {formatInstant(spot.at)}
            </time>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-[var(--gn-text)]">
              {spot.body}
            </p>
          </div>
        ))}
      </div>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 text-[11px] font-medium text-emerald-400/90 hover:text-emerald-300 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
