/** Keys & labels for optional catalog review sub-ratings (strains + breeders). */
export const CATALOG_SUB_RATING_ROWS: readonly {
  key: CatalogSubRatingKey;
  label: string;
}[][] = [
  [
    { key: "effects", label: "Effects" },
    { key: "flavor", label: "Flavor" },
    { key: "potency", label: "Potency" },
    { key: "taste", label: "Taste" },
  ],
  [
    { key: "aroma", label: "Aroma" },
    { key: "duration", label: "Duration" },
    { key: "onset", label: "Onset" },
  ],
];

export type CatalogSubRatingKey =
  | "effects"
  | "flavor"
  | "potency"
  | "taste"
  | "aroma"
  | "duration"
  | "onset";

export const ALL_CATALOG_SUB_RATING_KEYS: CatalogSubRatingKey[] =
  CATALOG_SUB_RATING_ROWS.flat().map((c) => c.key);

const SUB_LABEL = Object.fromEntries(
  CATALOG_SUB_RATING_ROWS.flat().map((c) => [c.key, c.label]),
) as Record<CatalogSubRatingKey, string>;

export function catalogSubRatingLabel(key: CatalogSubRatingKey): string {
  return SUB_LABEL[key] ?? key;
}

export function emptyCatalogSubRatingForm(): Record<
  CatalogSubRatingKey,
  number | null
> {
  return {
    effects: null,
    flavor: null,
    potency: null,
    taste: null,
    aroma: null,
    duration: null,
    onset: null,
  };
}

export function catalogSubRatingsFromApi(
  raw: Record<string, unknown> | null | undefined,
): Record<CatalogSubRatingKey, number | null> {
  const base = emptyCatalogSubRatingForm();
  if (!raw || typeof raw !== "object") return base;
  for (const k of ALL_CATALOG_SUB_RATING_KEYS) {
    const v = raw[k];
    if (typeof v === "number" && v >= 1 && v <= 5 && Number.isInteger(v)) {
      base[k] = v;
    }
  }
  return base;
}

export function toSubRatingsPayload(
  form: Record<CatalogSubRatingKey, number | null>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of ALL_CATALOG_SUB_RATING_KEYS) {
    const v = form[k];
    if (v != null) out[k] = v;
  }
  return out;
}
