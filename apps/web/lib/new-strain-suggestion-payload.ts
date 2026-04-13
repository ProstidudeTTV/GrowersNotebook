/**
 * Payload shape for `kind: "new_strain"` catalog suggestions.
 * Mirrors catalog strain fields (same names as API / DB row),
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
  chemotype: "indica" | "sativa" | "hybrid" | null;
  genetics: string | null;
  isAutoflower: boolean;
  /**
   * Optional JSON string of effect key → percent (0–100), e.g. `{"relaxed":45,"happy":30}`.
   * Parsed on approve; omit or empty if unknown.
   */
  reportedEffectPctsJson: string | null;
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
  chemotype: "" | "indica" | "sativa" | "hybrid";
  genetics: string;
  isAutoflower: boolean;
  reportedEffectPctsJson: string;
}): NewStrainSuggestionPayload {
  const chemotype =
    input.chemotype === "indica" ||
    input.chemotype === "sativa" ||
    input.chemotype === "hybrid"
      ? input.chemotype
      : null;
  const reported = input.reportedEffectPctsJson.trim();
  return {
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description.trim() || null,
    breederId: null,
    breederSlug: input.breederSlug.trim() || null,
    effects: [...input.effects],
    effectsNotes: input.effectsNotes.trim() || null,
    published: input.published,
    chemotype,
    genetics: input.genetics.trim() || null,
    isAutoflower: input.isAutoflower,
    reportedEffectPctsJson: reported || null,
  };
}

export type NewBreederSuggestionPayload = {
  slug: string;
  name: string;
  description: string | undefined;
  website: string | undefined;
  country: string | undefined;
  published: boolean;
};

export function buildNewBreederSuggestionPayload(input: {
  slug: string;
  name: string;
  description: string;
  website: string;
  country: string;
  published: boolean;
}): NewBreederSuggestionPayload {
  return {
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description.trim() || undefined,
    website: input.website.trim() || undefined,
    country: input.country.trim() || undefined,
    published: input.published,
  };
}
