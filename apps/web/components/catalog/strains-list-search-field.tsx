"use client";

/**
 * Strain catalog name search + live /strains suggestions only.
 * Independent from the site header (growers/posts) search.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { clientApiJson } from "@/lib/client-api";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const INPUT_ID = "gn-strains-catalog-q";

type StrainHit = {
  slug: string;
  name: string;
  description?: string | null;
};

type ListResponse = { items: StrainHit[] };

export function StrainsListSearchField({
  value,
  onChange,
  /** Extra /strains list params from toolbar filters, e.g. `&breederSlug=x&minRating=4` */
  activeListFiltersQuery,
  buildStrainDetailHref,
  onEnterCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  activeListFiltersQuery: string;
  buildStrainDetailHref: (slug: string) => string;
  /** When Enter has no suggestion to open, e.g. commit `q` to the list URL. */
  onEnterCommit?: () => void;
}) {
  const router = useRouter();
  const listboxId = `${INPUT_ID}-suggestions`;
  const rootRef = useRef<HTMLDivElement>(null);
  const debounced = useDebouncedValue(value.trim(), 280);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StrainHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async () => {
    if (debounced.length < 2) {
      setItems([]);
      setLoading(false);
      setError(null);
      setOpen(false);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setOpen(true);
    setLoading(true);
    setError(null);
    setItems([]);
    const qs = new URLSearchParams({
      q: debounced,
      page: "1",
      pageSize: "8",
      sort: "name",
    });
    const extra =
      activeListFiltersQuery.startsWith("&")
        ? activeListFiltersQuery
        : activeListFiltersQuery
          ? `&${activeListFiltersQuery}`
          : "";
    const path = `/strains?${qs.toString()}${extra}`;
    try {
      const data = await clientApiJson<ListResponse>(path, {
        signal: ctrl.signal,
      });
      if (!ctrl.signal.aborted) {
        setItems(data?.items ?? []);
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setItems([]);
        setError(e instanceof Error ? e.message : "Strain search failed");
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debounced, activeListFiltersQuery]);

  useEffect(() => {
    void runFetch();
    return () => ctrlRef.current?.abort();
  }, [runFetch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showPanel = open && debounced.length >= 2;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 basis-[14rem]">
      <label
        htmlFor={INPUT_ID}
        className="mb-1 block text-xs font-medium text-[var(--gn-text-muted)]"
      >
        Strain name
      </label>
      <input
        id={INPUT_ID}
        type="search"
        name="q"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Filter list & quick-open…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (debounced.length >= 2) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const first = items[0];
          if (first && debounced.length >= 2 && !loading && !error) {
            setOpen(false);
            router.push(buildStrainDetailHref(first.slug));
            return;
          }
          onEnterCommit?.();
        }}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className="w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2.5 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
      />
      {showPanel ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Strain suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-[var(--gn-border)] bg-[var(--gn-menu-bg)] py-1 shadow-[var(--gn-shadow-lg)] backdrop-blur-md"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-[var(--gn-text-muted)]">
              Searching strains…
            </li>
          ) : null}
          {error ? (
            <li className="px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {error}
            </li>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--gn-text-muted)]">
              No strains match. Try another term or relax filters.
            </li>
          ) : null}
          {items.map((it) => (
            <li key={it.slug} role="option">
              <Link
                href={buildStrainDetailHref(it.slug)}
                scroll={false}
                className="block px-3 py-2.5 text-left transition hover:bg-[var(--gn-surface-hover)]"
                onClick={() => setOpen(false)}
              >
                <span className="block text-sm font-medium text-[#ff6a38]">
                  {it.name}
                </span>
                {it.description?.trim() ? (
                  <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--gn-text-muted)]">
                    {it.description.trim()}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
