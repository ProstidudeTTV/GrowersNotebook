/** Small cultivar type pill for list + detail. */

const STYLE: Record<string, string> = {
  indica:
    "bg-violet-500/15 text-violet-200 ring-violet-500/40",
  sativa:
    "bg-amber-500/15 text-amber-100 ring-amber-500/35",
  hybrid:
    "bg-[color-mix(in_srgb,var(--gn-accent)_15%,transparent)] text-[var(--gn-accent)] ring-[color-mix(in_srgb,var(--gn-accent)_35%,transparent)]",
};

export function StrainChemotypeBadge({
  chemotype,
  size = "md",
}: {
  chemotype: string | null | undefined;
  size?: "sm" | "md";
}) {
  const c = chemotype?.trim().toLowerCase();
  if (c !== "indica" && c !== "sativa" && c !== "hybrid") return null;
  const cls = STYLE[c] ?? STYLE.hybrid;
  const pad = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 rounded-md font-semibold capitalize ring-1 ${pad} ${cls}`}
    >
      {c}
    </span>
  );
}
