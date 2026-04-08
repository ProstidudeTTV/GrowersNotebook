/**
 * Payload shape for `kind: "new_strain"` catalog suggestions.
 * Mirrors catalog strain fields (same names as API `toPublicStrain` / DB row),
 * except server fields (`id`, `reviewCount`, `avgRating`, timestamps`) are omitted —
 * those are set on approve.
 */
export type NewStrainSuggestionPayload = {
  slug: string;
  name: string;
  description: string | null;
  /** Resolved on approve; usually null — use `breederSlug`. */
  breederId: string | null;
  /** Directory slug for staff to resolve `breederId` when approving. */
  breederSlug: string | null;
  effects: string[];
  effectsNotes: string | null;
  published: boolean;
};

export function buildNewStrainSuggestionPayload(input: {
  slug: string;
  name: string;
  description: string;
  breederSlug: string;
  effects: string[];
  effectsNotes: string;
  /** When true (default), strain goes live after staff approve. */
  published: boolean;
}): NewStrainSuggestionPayload {
  return {
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description.trim() || null,
    breederId: null,
    breederSlug: input.breederSlug.trim() || null,
    effects: [...input.effects],
    effectsNotes: input.effectsNotes.trim() || null,
    published: input.published,
  };
}
