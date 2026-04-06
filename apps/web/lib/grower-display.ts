/** Lowest rank from API seeds tiers (fallback if `growerLevel` missing). */
export const DEFAULT_GROWER_RANK = "Rookie Grower";

/**
 * Display-only helpers. API seeds score =
 * 2×(net post votes) + 1×(net comment votes) on that grower's content.
 */
export function formatSeeds(seeds: number | null | undefined): string {
  const k = Number(seeds);
  if (!Number.isFinite(k)) return "0";
  if (k >= 1000) return `${(k / 1000).toFixed(1)}k`.replace(".0k", "k");
  return String(k);
}

/** Net vote score with leading + for positive (e.g. Reddit). */
export function formatVoteScore(score: number | null | undefined): string {
  const s = Number(score);
  if (!Number.isFinite(s)) return "0";
  if (s > 0) return `+${s}`;
  return String(s);
}
