"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BreedersListSearchField } from "@/components/catalog/breeders-list-search-field";
import {
  CatalogFilterChipButton,
  CatalogToolbarActionButton,
  CatalogToolbarLabel,
} from "@/components/catalog/catalog-toolbar-controls";

function buildBreedersQueryFromInputs(s: {
  q: string;
  sort: string;
  country: string;
  minRating: string;
  minReviews: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.sort === "rating") p.set("sort", "rating");
  if (s.country.trim()) p.set("country", s.country.trim());
  const mr = s.minRating.trim();
  if (mr && Number(mr) >= 1 && Number(mr) <= 5) p.set("minRating", mr);
  const mrev = s.minReviews.trim();
  if (mrev && Number(mrev) >= 1) p.set("minReviews", mrev);
  return p;
}

export function BreedersCatalogToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spKey = sp.toString();

  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [sort, setSort] = useState(() =>
    sp.get("sort") === "rating" ? "rating" : "name",
  );
  const [country, setCountry] = useState(() => sp.get("country") ?? "");
  const [minRating, setMinRating] = useState(() => sp.get("minRating") ?? "");
  const [minReviews, setMinReviews] = useState(() => sp.get("minReviews") ?? "");

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setSort(sp.get("sort") === "rating" ? "rating" : "name");
    setCountry(sp.get("country") ?? "");
    setMinRating(sp.get("minRating") ?? "");
    setMinReviews(sp.get("minReviews") ?? "");
  }, [spKey, sp]);

  const inputs = { q, sort, country, minRating, minReviews };
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  const navigateWith = useCallback(
    (next: Partial<typeof inputs>) => {
      const s = { ...inputsRef.current, ...next };
      const p = buildBreedersQueryFromInputs(s);
      p.set("page", "1");
      p.delete("detail");
      p.delete("reviewsPage");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : `${pathname}`);
    },
    [pathname, router],
  );

  return (
    <fieldset className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_78%,transparent)] p-3 shadow-[var(--gn-shadow-sm)] sm:p-4 lg:max-w-4xl lg:flex-1">
      <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gn-text-muted)]">
        Breeder catalog
      </legend>
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <BreedersListSearchField
          value={q}
          onChange={setQ}
          onEnterCommit={() => navigateWith({ q })}
        />
        <div className="min-w-[8rem] shrink-0">
          <CatalogToolbarLabel>Country / region</CatalogToolbarLabel>
          <input
            id="breeder-country"
            type="search"
            autoComplete="off"
            placeholder="e.g. Spain"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              navigateWith({ country: country.trim() });
            }}
            onBlur={() => {
              const urlC = sp.get("country") ?? "";
              if (country.trim() === urlC.trim()) return;
              navigateWith({ country: country.trim() });
            }}
            className="w-full rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition-all duration-150 placeholder:text-[var(--gn-text-muted)] focus:border-[color-mix(in_srgb,var(--gn-accent)_40%,var(--gn-divide))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gn-accent)_28%,transparent)]"
          />
        </div>
        <div className="shrink-0">
          <CatalogToolbarLabel>Sort</CatalogToolbarLabel>
          <div className="flex flex-wrap gap-1.5">
            <CatalogFilterChipButton
              active={sort === "name"}
              onClick={() => {
                setSort("name");
                navigateWith({ sort: "name" });
              }}
            >
              <span aria-hidden>A-Z</span>
              Name
            </CatalogFilterChipButton>
            <CatalogFilterChipButton
              active={sort === "rating"}
              onClick={() => {
                setSort("rating");
                navigateWith({ sort: "rating" });
              }}
            >
              <span aria-hidden>⭐</span>
              Top rated
            </CatalogFilterChipButton>
          </div>
        </div>
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
                onClick={() => {
                  setMinRating(option.value);
                  navigateWith({ minRating: option.value });
                }}
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
                onClick={() => {
                  setMinReviews(option.value);
                  navigateWith({ minReviews: option.value });
                }}
              >
                <span aria-hidden>💬</span>
                {option.label}
              </CatalogFilterChipButton>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:mt-6">
          <CatalogToolbarActionButton onClick={() => navigateWith({})}>
            <span aria-hidden>↻</span>
            Refresh
          </CatalogToolbarActionButton>
        </div>
      </div>
      <p className="text-xs text-[var(--gn-text-muted)]">
        Breeder name updates when you press Enter. Country applies on Enter or
        when you leave the field. Live suggestions stay on the header search.{" "}
        <Link href="/breeders" className="text-[var(--gn-accent)] hover:underline">
          Reset all filters
        </Link>
      </p>
    </fieldset>
  );
}
