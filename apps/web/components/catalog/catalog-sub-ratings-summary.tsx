import {
  ALL_CATALOG_SUB_RATING_KEYS,
  catalogSubRatingLabel,
} from "@/lib/catalog-sub-ratings-meta";

export function CatalogSubRatingsSummary({
  subRatings,
}: {
  subRatings: Record<string, unknown> | null | undefined;
}) {
  if (!subRatings || typeof subRatings !== "object") return null;
  const parts = ALL_CATALOG_SUB_RATING_KEYS.map((k) => {
    const v = subRatings[k];
    return typeof v === "number" &&
      Number.isInteger(v) &&
      v >= 1 &&
      v <= 5
      ? `${catalogSubRatingLabel(k)} ${v}/5`
      : null;
  }).filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-[var(--gn-text-muted)]">{parts.join(" · ")}</p>
  );
}
