"use client";

/** 1–5 stars with decimal average (read-only). */
export function StarDisplay({
  avg,
  count,
  compact,
}: {
  avg: string | null;
  count?: number;
  /** Tight single-line layout for dense card grids */
  compact?: boolean;
}) {
  const n = avg != null ? Number.parseFloat(avg) : NaN;
  const label =
    Number.isFinite(n) && count != null
      ? `${n.toFixed(1)} / 5 (${count} ${count === 1 ? "rating" : "ratings"})`
      : Number.isFinite(n)
        ? `${n.toFixed(1)} / 5`
        : "No ratings yet";

  if (compact) {
    return (
      <div
        className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-[var(--gn-text-muted)]"
        title={label}
      >
        <span className="text-amber-400 leading-none" aria-hidden>
          {Number.isFinite(n) ? "★".repeat(Math.round(n)) : "—"}
        </span>
        {Number.isFinite(n) ? (
          <span className="text-[var(--gn-text)]">{n.toFixed(1)}</span>
        ) : null}
        {count != null && count > 0 ? (
          <span className="hidden min-[380px]:inline">({count})</span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-sm text-[var(--gn-text-muted)]"
      title={label}
    >
      <span className="text-amber-400" aria-hidden>
        {Number.isFinite(n) ? "★".repeat(Math.round(n)) : "—"}
      </span>
      <span className="text-[var(--gn-text)]">{label}</span>
    </div>
  );
}
