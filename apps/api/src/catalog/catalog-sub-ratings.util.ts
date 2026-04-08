import type { CatalogReviewSubRatings } from '../db/schema';

const SUB_KEYS = new Set<string>([
  'effects',
  'flavor',
  'potency',
  'taste',
  'aroma',
  'duration',
  'onset',
]);

/**
 * Strip unknown keys and non-integers; only 1–5 allowed.
 * Returns `{}` when nothing valid is present.
 */
export function normalizeCatalogSubRatings(
  raw: unknown,
): CatalogReviewSubRatings {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: CatalogReviewSubRatings = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!SUB_KEYS.has(k)) continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 5) continue;
    (out as Record<string, number>)[k] = n;
  }
  return out;
}
