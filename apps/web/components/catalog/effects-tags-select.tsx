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
      onChange={onChange}
      tokenSeparators={[","]}
    />
  );
}
