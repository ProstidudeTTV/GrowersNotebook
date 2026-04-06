"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CatalogEntitySearchField } from "@/components/catalog/catalog-entity-search-field";
import { clientApiJson } from "@/lib/client-api";
import {
  strainPreviewPath,
  type StrainsListQuery,
} from "@/lib/catalog-list-urls";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type BreederHit = { slug: string; name: string };

type BreedersListJson = { items: BreederHit[] };

function buildStrainsQueryFromInputs(s: {
  q: string;
  sort: string;
  breederSlug: string;
  minRating: string;
  minReviews: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.sort === "rating") p.set("sort", "rating");
  if (s.breederSlug.trim()) p.set("breederSlug", s.breederSlug.trim());
  const mr = s.minRating.trim();
  if (mr && Number(mr) >= 1 && Number(mr) <= 5) p.set("minRating", mr);
  const mrev = s.minReviews.trim();
  if (mrev && Number(mrev) >= 1) p.set("minReviews", mrev);
  return p;
}

function toPreviewList(s: {
  q: string;
  sort: string;
  breederSlug: string;
  minRating: string;
  minReviews: string;
}): StrainsListQuery {
  return {
    q: s.q.trim() || undefined,
    sort: s.sort === "rating" ? "rating" : undefined,
    breederSlug: s.breederSlug.trim() || undefined,
    minRating:
      s.minRating.trim() &&
      Number(s.minRating) >= 1 &&
      Number(s.minRating) <= 5
        ? s.minRating.trim()
        : undefined,
    minReviews:
      s.minReviews.trim() && Number(s.minReviews) >= 1
        ? s.minReviews.trim()
        : undefined,
  };
}

function BreederFilterCombobox({
  breederSlug,
  breederLabel,
  onCommittedSlug,
}: {
  breederSlug: string;
  breederLabel: string;
  onCommittedSlug: (slug: string, label: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(breederLabel);
  const debounced = useDebouncedValue(input.trim(), 260);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<BreederHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(breederLabel);
  }, [breederLabel, breederSlug]);

  useEffect(() => {
    if (debounced.length < 1) {
      setHits([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams({
      q: debounced,
      page: "1",
      pageSize: "12",
      sort: "name",
    });
    void (async () => {
      try {
        const data = await clientApiJson<BreedersListJson>(
          `/breeders?${qs.toString()}`,
          { signal: ctrl.signal },
        );
        if (!ctrl.signal.aborted) {
          setHits(data.items ?? []);
          setOpen(true);
        }
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showPanel =
    open && debounced.length >= 1 && (loading || hits.length > 0);

  return (
    <div ref={rootRef} className="relative min-w-[10rem] max-w-[14rem] flex-1">
      <label htmlFor={id} className="mb-1 block text-xs text-[var(--gn-text-muted)]">
        Breeder
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Filter breeder…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => {
          if (debounced.length >= 1 && hits.length) setOpen(true);
        }}
        className="w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2.5 py-1.5 text-sm text-[var(--gn-text)]"
      />
      {breederSlug ? (
        <button
          type="button"
          className="mt-1 text-xs text-[#ff6a38] hover:underline"
          onClick={() => {
            setInput("");
            onCommittedSlug("", "");
          }}
        >
          Clear breeder
        </button>
      ) : null}
      {showPanel ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-[var(--gn-border)] bg-[var(--gn-menu-bg)] py-1 shadow-[var(--gn-shadow-lg)]">
          {loading && hits.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--gn-text-muted)]">
              Searching…
            </li>
          ) : null}
          {hits.map((h) => (
            <li key={h.slug}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
                onClick={() => {
                  setInput(h.name);
                  onCommittedSlug(h.slug, h.name);
                  setOpen(false);
                }}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StrainsCatalogToolbar({
  breederLabelResolved,
}: {
  breederLabelResolved: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spKey = sp.toString();

  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [sort, setSort] = useState(() =>
    sp.get("sort") === "rating" ? "rating" : "name",
  );
  const [breederSlug, setBreederSlug] = useState(
    () => sp.get("breederSlug")?.trim() ?? "",
  );
  const [breederLabel, setBreederLabel] = useState(
    () => breederLabelResolved?.trim() ?? "",
  );
  const [minRating, setMinRating] = useState(() => sp.get("minRating") ?? "");
  const [minReviews, setMinReviews] = useState(() => sp.get("minReviews") ?? "");

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setSort(sp.get("sort") === "rating" ? "rating" : "name");
    const bSlug = sp.get("breederSlug")?.trim() ?? "";
    setBreederSlug(bSlug);
    setMinRating(sp.get("minRating") ?? "");
    setMinReviews(sp.get("minReviews") ?? "");
    const name = breederLabelResolved?.trim() ?? "";
    if (bSlug) setBreederLabel(name);
    else setBreederLabel("");
  }, [spKey, sp, breederLabelResolved]);

  const inputs = { q, sort, breederSlug, minRating, minReviews };
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  const navigateWith = useCallback(
    (next: Partial<typeof inputs>) => {
      const s = { ...inputsRef.current, ...next };
      const p = buildStrainsQueryFromInputs(s);
      p.set("page", "1");
      p.delete("detail");
      p.delete("reviewsPage");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : `${pathname}`);
    },
    [pathname, router],
  );

  const debouncedQ = useDebouncedValue(q, 420);
  useEffect(() => {
    const urlQ = sp.get("q") ?? "";
    if (debouncedQ.trim() === urlQ.trim()) return;
    const p = buildStrainsQueryFromInputs({
      ...inputsRef.current,
      q: debouncedQ,
    });
    p.set("page", "1");
    p.delete("detail");
    p.delete("reviewsPage");
    router.replace(`${pathname}?${p.toString()}`);
  }, [debouncedQ, pathname, router, sp, spKey]);

  const suggestExtraQs = (() => {
    const e = new URLSearchParams();
    if (breederSlug) e.set("breederSlug", breederSlug);
    const mr = minRating.trim();
    if (mr && Number(mr) >= 1 && Number(mr) <= 5) e.set("minRating", mr);
    const mrev = minReviews.trim();
    if (mrev && Number(mrev) >= 1) e.set("minReviews", mrev);
    const s = e.toString();
    return s ? `&${s}` : "";
  })();

  const previewList = () => toPreviewList(inputs);

  return (
    <div className="flex w-full flex-col gap-3 lg:max-w-4xl lg:flex-1">
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <CatalogEntitySearchField
          placeholder="Search strains…"
          value={q}
          onChange={setQ}
          apiListPath="/strains"
          extraApiQuery={suggestExtraQs}
          buildDetailHref={(slug) => strainPreviewPath(slug, previewList())}
        />
        <div className="shrink-0">
          <label htmlFor="strain-sort" className="mb-1 block text-xs text-[var(--gn-text-muted)]">
            Sort
          </label>
          <select
            id="strain-sort"
            value={sort}
            onChange={(e) => {
              const v = e.target.value === "rating" ? "rating" : "name";
              setSort(v);
              navigateWith({ sort: v });
            }}
            className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
          >
            <option value="name">Name</option>
            <option value="rating">Rating</option>
          </select>
        </div>
        <BreederFilterCombobox
          breederSlug={breederSlug}
          breederLabel={breederLabel}
          onCommittedSlug={(slug, label) => {
            setBreederSlug(slug);
            setBreederLabel(label);
            navigateWith({ breederSlug: slug });
          }}
        />
        <div className="shrink-0">
          <label
            htmlFor="strain-min-rating"
            className="mb-1 block text-xs text-[var(--gn-text-muted)]"
          >
            Min rating
          </label>
          <select
            id="strain-min-rating"
            value={minRating}
            onChange={(e) => {
              const v = e.target.value;
              setMinRating(v);
              navigateWith({ minRating: v });
            }}
            className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
          >
            <option value="">Any</option>
            <option value="3">3+ ★</option>
            <option value="4">4+ ★</option>
            <option value="4.5">4.5+ ★</option>
            <option value="5">5 ★</option>
          </select>
        </div>
        <div className="shrink-0">
          <label
            htmlFor="strain-min-reviews"
            className="mb-1 block text-xs text-[var(--gn-text-muted)]"
          >
            Reviews
          </label>
          <select
            id="strain-min-reviews"
            value={minReviews}
            onChange={(e) => {
              const v = e.target.value;
              setMinReviews(v);
              navigateWith({ minReviews: v });
            }}
            className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="3">3+</option>
            <option value="5">5+</option>
            <option value="10">10+</option>
          </select>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)] sm:mt-5 sm:px-4 sm:py-2"
          onClick={() => navigateWith({})}
        >
          Refresh
        </button>
      </div>
      <p className="text-xs text-[var(--gn-text-muted)]">
        Type at least two letters for live strain suggestions.{" "}
        <Link href="/strains" className="text-[#ff6a38] hover:underline">
          Reset all filters
        </Link>
      </p>
    </div>
  );
}
