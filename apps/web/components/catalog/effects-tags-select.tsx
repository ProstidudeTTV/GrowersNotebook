"use client";

import { Select } from "antd";
import { CATALOG_EFFECT_TAGS } from "@/lib/catalog-effect-options";
import { adminSelectPopupProps } from "@/lib/admin-select-props";

type Props = {
  value?: string[];
  onChange?: (next: string[]) => void;
  placeholder?: string;
  id?: string;
  /** Preset effect tags (catalog filter list). Custom tags still allowed. */
  presetOptions?: readonly string[];
};

/**
 * Same pattern as admin strain edit: type a tag, Enter adds it; comma also splits.
 */
function normalizeTags(next: unknown): string[] {
  if (!Array.isArray(next)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of next) {
    const s = String(x).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function EffectsTagsSelect({
  value,
  onChange,
  placeholder = "Choose or type effect tags",
  id,
  presetOptions = CATALOG_EFFECT_TAGS,
}: Props) {
  const options = presetOptions.map((tag) => ({ value: tag, label: tag }));
  return (
    <Select
      id={id}
      mode="tags"
      className="w-full gn-effects-tags-select"
      placeholder={placeholder}
      value={value ?? []}
      options={options}
      onChange={(next) => onChange?.(normalizeTags(next))}
      tokenSeparators={[","]}
      {...adminSelectPopupProps()}
    />
  );
}
