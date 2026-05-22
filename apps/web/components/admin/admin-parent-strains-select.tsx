"use client";

import { useList } from "@refinedev/core";
import { Select } from "antd";
import { useMemo } from "react";
import { adminSelectPopupProps } from "@/lib/admin-select-props";

type Props = {
  /** Exclude current strain on edit (cannot be its own parent). */
  excludeStrainId?: string;
  /** Set by Ant Design Form.Item when nested in a form. */
  value?: string[];
  onChange?: (ids: string[]) => void;
  disabled?: boolean;
};

export function AdminParentStrainsSelect({
  excludeStrainId,
  value,
  onChange,
  disabled,
}: Props) {
  const { result, query } = useList({
    resource: "strains",
    pagination: { pageSize: 500, currentPage: 1 },
  });

  const options = useMemo(() => {
    const rows = result?.data ?? [];
    return rows
      .filter((r) => {
        const id = String((r as { id: string }).id);
        return !excludeStrainId || id !== excludeStrainId;
      })
      .map((r) => {
        const row = r as { id: string; name?: string; slug?: string };
        const name = row.name?.trim() || row.slug || row.id;
        const slug = row.slug ? ` · ${row.slug}` : "";
        return { value: row.id, label: `${name}${slug}` };
      });
  }, [result?.data, excludeStrainId]);

  return (
    <Select
      mode="multiple"
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={
        query.isLoading ? "Loading strains…" : "Search parent cultivars"
      }
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled || query.isLoading}
      {...adminSelectPopupProps()}
    />
  );
}
