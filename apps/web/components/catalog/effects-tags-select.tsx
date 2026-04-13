"use client";

import { Select } from "antd";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
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
  placeholder = "Type a tag and press Enter",
  id,
}: Props) {
  return (
    <Select
      id={id}
      mode="tags"
      className="w-full gn-effects-tags-select"
      placeholder={placeholder}
      value={value}
      onChange={(next) => onChange(normalizeTags(next))}
      tokenSeparators={[","]}
    />
  );
}
