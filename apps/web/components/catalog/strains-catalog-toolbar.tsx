"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  CatalogFilterChipButton,
  CatalogToolbarActionButton,
  CatalogToolbarLabel,
} from "@/components/catalog/catalog-toolbar-controls";
import { StrainsListSearchField } from "@/components/catalog/strains-list-search-field";
import { clientApiJson } from "@/lib/client-api";
type BreederHit = { slug: string; name: string };

type BreedersListJson = { items: BreederHit[] };

import { CATALOG_EFFECT_TAGS } from "@/lib/catalog-effect-options";

function buildStrainsQueryFromInputs(s: {
  q: string;
  sort: string;
  breederSlug: string;
  minRating: string;
  minReviews: string;
  chemotype: string;
  autoflower: string;
  genetics: string;
  effects: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.sort === "rating") p.set("sort", "rating");
  else if (s.sort === "reviews") p.set("sort", "reviews");
  if (s.breederSlug.trim()) p.set("breederSlug", s.breederSlug.trim());
  const mr = s.minRating.trim();
  if (mr && Number(mr) >= 1 && Number(mr) <= 5) p.set("minRating", mr);
  const mrev = s.minReviews.trim();
  if (mrev && Number(mrev) >= 1) p.set("minReviews", mrev);
  const ct = s.chemotype.trim().toLowerCase();
  if (ct === "indica" || ct === "sativa" || ct === "hybrid") p.set("chemotype", ct);
  if (s.autoflower === "1") p.set("autoflower", "1");
  if (s.genetics.trim()) p.set("genetics", s.genetics.trim());
  if (s.effects.trim()) p.set("effects", s.effects.trim());
  return p;
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
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<BreederHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    setInput(breederLabel);
  }, [breederLabel, breederSlug]);

  const fetchHits = useCallback(async () => {
    const term = input.trim();
    if (term.length < 1) {
      setHits([]);
      setPickError(null);
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setPickError(null);
    setHits([]);
    try {
      const qs = new URLSearchParams({
        q: term,
        page: "1",
        pageSize: "12",
        sort: "name",
      });
      const data = await clientApiJson<BreedersListJson>(
        `/breeders?${qs.toString()}`,
      );
      setHits(data.items ?? []);
    } catch (e) {
      setHits([]);
      setPickError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showPanel = open && input.trim().length >= 1;

  return (
    <div ref={rootRef} className="relative min-w-[10rem] max-w-[14rem] flex-1">
      <CatalogToolbarLabel>Breeder</CatalogToolbarLabel>
      <div className="flex gap-1">
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder="Name, then Enter or Find"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void fetchHits();
          }}
          className="min-w-0 flex-1 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition-all duration-150 placeholder:text-[var(--gn-text-muted)] focus:border-[color-mix(in_srgb,var(--gn-accent)_40%,var(--gn-divide))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gn-accent)_28%,transparent)]"
        />
        <CatalogToolbarActionButton onClick={() => void fetchHits()}>
          <span aria-hidden>🔎</span>
          Find
        </CatalogToolbarActionButton>
      </div>
      {breederSlug ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--gn-accent)] hover:underline"
          onClick={() => {
            setInput("");
            onCommittedSlug("", "");
          }}
        >
          <span aria-hidden>✕</span>
          Clear breeder
        </button>
      ) : null}
      {showPanel ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-[var(--gn-border)] bg-[var(--gn-menu-bg)] py-1 shadow-[var(--gn-shadow-lg)]">
          {loading ? (
            <li className="px-3 py-2 text-xs text-[var(--gn-text-muted)]">
              Searching…
            </li>
          ) : null}
          {pickError ? (
            <li className="px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              {pickError}
            </li>
          ) : null}
          {!loading && !pickError && hits.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--gn-text-muted)]">
              No breeders match.
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
  totalPages,
  currentPage,
}: {
  breederLabelResolved: string | null;
  /** From server list response; drives page dropdown. */
  totalPages: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spKey = sp.toString();

  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [sort, setSort] = useState(() =>
    sp.get("sort") === "rating"
      ? "rating"
      : sp.get("sort") === "reviews"
        ? "reviews"
        : "name",
  );
  const [breederSlug, setBreederSlug] = useState(
    () => sp.get("breederSlug")?.trim() ?? "",
  );
  const [breederLabel, setBreederLabel] = useState(
    () => breederLabelResolved?.trim() ?? "",
  );
  const [minRating, setMinRating] = useState(() => sp.get("minRating") ?? "");
  const [minReviews, setMinReviews] = useState(() => sp.get("minReviews") ?? "");
  const [chemotype, setChemotype] = useState(() => {
    const c = sp.get("chemotype")?.trim().toLowerCase() ?? "";
    if (c === "indica" || c === "sativa" || c === "hybrid") return c;
    return "";
  });
  const [autoflower, setAutoflower] = useState(() =>
    sp.get("autoflower") === "1" || sp.get("autoflower") === "true"
      ? "1"
      : "",
  );
  const [genetics, setGenetics] = useState(() => sp.get("genetics") ?? "");
  const [effects, setEffects] = useState(() => sp.get("effects") ?? "");
  const [moreOpen, setMoreOpen] = useState(
    () =>
      Boolean(sp.get("genetics")?.trim()) || Boolean(sp.get("effects")?.trim()),
  );

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    const sortParam = sp.get("sort");
    setSort(
      sortParam === "rating"
        ? "rating"
        : sortParam === "reviews"
          ? "reviews"
          : "name",
    );
    const bSlug = sp.get("breederSlug")?.trim() ?? "";
    setBreederSlug(bSlug);
    setMinRating(sp.get("minRating") ?? "");
    setMinReviews(sp.get("minReviews") ?? "");
    const c = sp.get("chemotype")?.trim().toLowerCase() ?? "";
    setChemotype(
      c === "indica" || c === "sativa" || c === "hybrid" ? c : "",
    );
    setAutoflower(
      sp.get("autoflower") === "1" || sp.get("autoflower") === "true"
        ? "1"
        : "",
    );
    setGenetics(sp.get("genetics") ?? "");
    setEffects(sp.get("effects") ?? "");
    const name = breederLabelResolved?.trim() ?? "";
    if (bSlug) setBreederLabel(name);
    else setBreederLabel("");
  }, [spKey, sp, breederLabelResolved]);

  const inputs = {
    q,
    sort,
    breederSlug,
    minRating,
    minReviews,
    chemotype,
    autoflower,
    genetics,
    effects,
  };
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

  const navigateToPage = useCallback(
    (nextPage: number) => {
      const s = inputsRef.current;
      const p = buildStrainsQueryFromInputs(s);
      const safe = Math.max(1, Math.min(nextPage, Math.max(1, totalPages)));
      p.set("page", String(safe));
      p.delete("detail");
      p.delete("reviewsPage");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : `${pathname}`);
    },
    [pathname, router, totalPages],
  );
  const extraFilterCount =
    (genetics.trim() ? 1 : 0) +
    (effects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length > 0
      ? 1
      : 0);

  return (
    <fieldset className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_78%,transparent)] p-3 shadow-[var(--gn-shadow-sm)] sm:p-4 lg:max-w-4xl lg:flex-1">
      <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gn-text-muted)]">
        Strain catalog
      </legend>
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <StrainsListSearchField
          value={q}
          onChange={setQ}
          onEnterCommit={(committed) => navigateWith({ q: committed })}
        />
        {totalPages > 1 ? (
          <div className="shrink-0">
            <CatalogToolbarLabel>Page</CatalogToolbarLabel>
            <select
              id="strain-catalog-page"
              value={String(Math.min(currentPage, totalPages))}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) navigateToPage(n);
              }}
              className="rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition-all duration-150 focus:border-[color-mix(in_srgb,var(--gn-accent)_40%,var(--gn-divide))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gn-accent)_28%,transparent)]"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} / {totalPages}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="shrink-0">
          <CatalogToolbarLabel>Sort</CatalogToolbarLabel>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "name", label: "A-Z Name" },
              { value: "rating", label: "⭐ Rating" },
              { value: "reviews", label: "💬 Most reviewed" },
            ].map((option) => (
              <CatalogFilterChipButton
                key={option.value}
                active={sort === option.value}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </CatalogFilterChipButton>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <CatalogToolbarLabel>Type</CatalogToolbarLabel>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "", label: "Any" },
              { value: "indica", label: "🌙 Indica" },
              { value: "sativa", label: "☀️ Sativa" },
              { value: "hybrid", label: "🧬 Hybrid" },
            ].map((option) => (
              <CatalogFilterChipButton
                key={option.value || "any"}
                active={chemotype === option.value}
                onClick={() => setChemotype(option.value)}
              >
                {option.label}
              </CatalogFilterChipButton>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <CatalogToolbarLabel>Autoflower</CatalogToolbarLabel>
          <div className="flex flex-wrap gap-1.5">
            <CatalogFilterChipButton
              active={autoflower === ""}
              onClick={() => setAutoflower("")}
            >
              Any
            </CatalogFilterChipButton>
            <CatalogFilterChipButton
              active={autoflower === "1"}
              onClick={() => setAutoflower("1")}
            >
              <span aria-hidden>🌱</span>
              Autoflowers only
            </CatalogFilterChipButton>
          </div>
        </div>
        <BreederFilterCombobox
          breederSlug={breederSlug}
          breederLabel={breederLabel}
          onCommittedSlug={(slug, label) => {
            setBreederSlug(slug);
            setBreederLabel(label);
          }}
        />
        <div className="shrink-0">
          <CatalogToolbarLabel>Min rating</CatalogToolbarLabel>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "", label: "Any" },
              { value: "3", label: "3+ ★" },
              { value: "4", label: "4+ ★" },
              { value: "4.5", label: "4.5+ ★" },
              { value: "5", label: "5 ★" },
            ].map((option) => (
              <CatalogFilterChipButton
                key={option.value || "any"}
                active={minRating === option.value}
                onClick={() => setMinRating(option.value)}
              >
                {option.label}
              </CatalogFilterChipButton>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <CatalogToolbarLabel>Reviews</CatalogToolbarLabel>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "", label: "Any" },
              { value: "1", label: "1+" },
              { value: "3", label: "3+" },
              { value: "5", label: "5+" },
              { value: "10", label: "10+" },
            ].map((option) => (
              <CatalogFilterChipButton
                key={option.value || "any"}
                active={minReviews === option.value}
                onClick={() => setMinReviews(option.value)}
              >
                <span aria-hidden>💬</span>
                {option.label}
              </CatalogFilterChipButton>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:mt-6">
          <CatalogToolbarActionButton
            variant="primary"
            onClick={() => navigateWith({})}
          >
            <span aria-hidden>✨</span>
            Apply
          </CatalogToolbarActionButton>
          <CatalogToolbarActionButton onClick={() => router.refresh()}>
            <span aria-hidden>↻</span>
            Reload
          </CatalogToolbarActionButton>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CatalogFilterChipButton
          active={moreOpen || extraFilterCount > 0}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <span aria-hidden>{moreOpen ? "🪴" : "🧪"}</span>
          {moreOpen ? "Hide extras" : "More filters"}
          {extraFilterCount > 0 ? (
            <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] font-bold text-current">
              {extraFilterCount}
            </span>
          ) : null}
        </CatalogFilterChipButton>
      </div>
      {moreOpen ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] p-3 shadow-[var(--gn-shadow-sm)]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gn-text-muted)]">
              Genetics (lineage)
            </span>
            <input
              type="search"
              value={genetics}
              onChange={(e) => setGenetics(e.target.value)}
              placeholder="e.g. OG Kush, Gelato"
              className="w-full rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-3 py-2 text-sm text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition-all duration-150 placeholder:text-[var(--gn-text-muted)] focus:border-[color-mix(in_srgb,var(--gn-accent)_40%,var(--gn-divide))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gn-accent)_28%,transparent)]"
            />
          </label>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gn-text-muted)]">
              Effects (select any)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATALOG_EFFECT_TAGS.map((eff) => {
                const selected = effects
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .includes(eff);
                return (
                  <CatalogFilterChipButton
                    key={eff}
                    active={selected}
                    onClick={() => {
                      const cur = effects
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const next = selected
                        ? cur.filter((x) => x !== eff)
                        : [...cur, eff];
                      setEffects(next.join(","));
                    }}
                  >
                    {eff}
                  </CatalogFilterChipButton>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-[var(--gn-text-muted)]">
        Adjust filters, then Apply. Reload refetches the current URL. Strain name
        search commits on Enter. Header search is for growers & posts only.{" "}
        <Link href="/strains" className="text-[var(--gn-accent)] hover:underline">
          Reset all filters
        </Link>
      </p>
    </fieldset>
  );
}
