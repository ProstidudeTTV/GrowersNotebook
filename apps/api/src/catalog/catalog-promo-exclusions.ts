/**
 * Seed-bank CSV / catalog entries that are promos or offers, not named cultivars.
 * Keep public API and imports aligned so Supabase-backed data stays clean.
 */

/** Breeder slugs omitted from public /strains and /breeders catalog responses. */
export const PUBLIC_EXCLUDED_BREEDER_SLUGS = ['free-seed-offer'] as const;

export function isPublicExcludedBreederSlug(slug: string): boolean {
  const s = slug.trim().toLowerCase();
  return (PUBLIC_EXCLUDED_BREEDER_SLUGS as readonly string[]).includes(s);
}

/**
 * Detects CSV rows that represent “free seed with order” SKUs (not a strain).
 * Matches rows like breeder "Free Seed Offer" and names "3 Free Seeds - £75 to £100".
 */
export function isNonStrainPromoCatalogRow(row: Record<string, string>): boolean {
  const breeder = (row.breeder || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (breeder === 'free seed offer') return true;

  const strain = (row.strain_name || '').trim();
  if (!strain) return false;
  if (/^\d+\s+free\s+seeds?\b/i.test(strain)) return true;
  if (/\bfree\s+seeds?\s*[-–—]\s*£/i.test(strain)) return true;
  if (/\bfree\s+seeds?\s*[-–—]\s*over\s*£/i.test(strain)) return true;

  return false;
}
