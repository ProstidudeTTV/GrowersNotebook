"use client";

/**
 * Strain catalog name field — updates the list only when you press Enter (no live API).
 * Quick picks live search is reserved for the site header (growers & posts).
 */

const INPUT_ID = "gn-strains-catalog-q";

export function StrainsListSearchField({
  value,
  onChange,
  onEnterCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Apply this text as `q` in the URL (use input value so Enter always wins over stale state). */
  onEnterCommit?: (committed: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1 basis-[14rem]">
      <label
        htmlFor={INPUT_ID}
        className="mb-1 block text-xs font-medium text-[var(--gn-text-muted)]"
      >
        Strain name
      </label>
      <input
        id={INPUT_ID}
        type="search"
        name="strainCatalogQ"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Type a name, press Enter to search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          e.stopPropagation();
          const committed = e.currentTarget.value.trim();
          onChange(committed);
          onEnterCommit?.(committed);
        }}
        className="w-full rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition-all duration-150 placeholder:text-[var(--gn-text-muted)] focus:border-[color-mix(in_srgb,var(--gn-accent)_40%,var(--gn-divide))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gn-accent)_28%,transparent)]"
      />
    </div>
  );
}
