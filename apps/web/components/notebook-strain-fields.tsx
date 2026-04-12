"use client";

import { Form, Input } from "antd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-public";

type Suggestion = { id: string; name: string; slug: string };

type NotebookStrainFieldsProps = {
  /** When this string changes (e.g. after load), the search box syncs for display */
  displaySeed: string;
};

/**
 * Catalog search + custom strain, wired to Ant Form fields `strainId` and `customStrainLabel`.
 * Must render inside a Form.
 */
export function NotebookStrainFields({ displaySeed }: NotebookStrainFieldsProps) {
  const form = Form.useFormInstance();
  const linkedStrainId = Form.useWatch("strainId", form);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    setQ(displaySeed);
  }, [displaySeed]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await apiFetch<{ items: Suggestion[] }>(
            `/notebooks/strain-suggestions?q=${encodeURIComponent(t)}&pageSize=12`,
          );
          setSuggestions(res.items ?? []);
        } catch {
          setSuggestions([]);
        }
      })();
    }, 250);
    return () => window.clearTimeout(id);
  }, [q]);

  const pickStrain = useCallback(
    (s: Suggestion) => {
      form.setFieldsValue({
        strainId: s.id,
        customStrainLabel: "",
      });
      setQ(s.name);
      setSuggestions([]);
    },
    [form],
  );

  const clearStrainId = useCallback(() => {
    form.setFieldValue("strainId", "");
  }, [form]);

  return (
    <>
      <Form.Item name="strainId" hidden>
        <Input />
      </Form.Item>
      <div className="relative mb-6 block">
        <span className="text-sm font-medium text-[var(--gn-text)]">
          Strain (catalog search)
        </span>
        <p className="mt-1 text-xs leading-relaxed text-[var(--gn-text-muted)]">
          <Link href="/strains" className="text-[#ff4500] hover:underline">
            Open Strains directory
          </Link>{" "}
          to browse the full catalog.
        </p>
        <input
          value={q}
          onChange={(e) => {
            clearStrainId();
            setQ(e.target.value);
          }}
          className="gn-input mt-2 w-full"
          placeholder="Search catalog by name…"
          autoComplete="off"
        />
        {linkedStrainId ? (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            Linked to catalog strain.
          </p>
        ) : null}
        {suggestions.length > 0 ? (
          <ul className="gn-scrollbar-themed absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                  onClick={() => pickStrain(s)}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Form.Item name="customStrainLabel" label="Custom strain name">
        <Input
          placeholder="If not using a catalog match"
          disabled={!!linkedStrainId}
          onChange={() => {
            form.setFieldValue("strainId", "");
          }}
        />
      </Form.Item>
    </>
  );
}
