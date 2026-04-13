"use client";

const LABELS: Record<string, string> = {
  relaxed: "Relaxed",
  happy: "Happy",
  euphoric: "Euphoric",
  uplifted: "Uplifted",
  creative: "Creative",
  focused: "Focused",
  energetic: "Energetic",
  talkative: "Talkative",
  hungry: "Hungry",
  sleepy: "Sleepy",
};

/**
 * Leafly-style survey percentages (reference data from import).
 */
export function StrainReportedEffectsPanel({
  pcts,
}: {
  pcts: Record<string, number>;
}) {
  const entries = Object.entries(pcts)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
          Reported effects
        </h2>
        <p className="mt-1 text-[11px] leading-snug text-[var(--gn-text-muted)]">
          Reference-style survey percentages from the source catalog (not GN
          reviews).
        </p>
      </div>
      <ul className="space-y-2.5">
        {entries.map(([key, v]) => {
          const pct = Math.min(100, Math.max(0, v));
          const label = LABELS[key] ?? key;
          return (
            <li key={key}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-[var(--gn-text)]">{label}</span>
                <span className="tabular-nums text-[var(--gn-text-muted)]">
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--gn-surface-elevated)]">
                <div
                  className="h-full rounded-full bg-[#ff6a38]/85"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
