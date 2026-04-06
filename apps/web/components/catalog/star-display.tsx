"use client";

/** 1–5 stars with decimal average (read-only). */
export function StarDisplay({
  avg,
  count,
}: {
  avg: string | null;
  count?: number;
}) {
  const n = avg != null ? Number.parseFloat(avg) : NaN;
  const label =
    Number.isFinite(n) && count != null
      ? `${n.toFixed(1)} / 5 (${count} ${count === 1 ? "rating" : "ratings"})`
      : Number.isFinite(n)
        ? `${n.toFixed(1)} / 5`
        : "No ratings yet";

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
