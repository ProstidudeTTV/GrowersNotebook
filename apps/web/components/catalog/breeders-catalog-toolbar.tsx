"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BreedersListSearchField } from "@/components/catalog/breeders-list-search-field";

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
    <fieldset className="flex w-full min-w-0 flex-col gap-3 rounded-xl border border-[var(--gn-divide)] bg-[color-mix(in_srgb,var(--gn-surface-muted)_65%,transparent)] p-3 sm:p-4 lg:max-w-4xl lg:flex-1">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
        Breeder catalog
      </legend>
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <BreedersListSearchField
          value={q}
          onChange={setQ}
          onEnterCommit={() => navigateWith({ q })}
        />
        <div className="min-w-[8rem] shrink-0">
          <label htmlFor="breeder-country" className="mb-1 block text-xs text-[var(--gn-text-muted)]">
            Country / region
          </label>
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
            className="w-full rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-2.5 py-1.5 text-sm text-[var(--gn-text)] sm:px-3 sm:py-2"
          />
        </div>
        <div className="shrink-0">
          <label htmlFor="breeder-sort" className="mb-1 block text-xs text-[var(--gn-text-muted)]">
            Sort
          </label>
          <select
            id="breeder-sort"
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
        <div className="shrink-0">
          <label
            htmlFor="breeder-min-rating"
            className="mb-1 block text-xs text-[var(--gn-text-muted)]"
          >
            Min rating
          </label>
          <select
            id="breeder-min-rating"
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
            htmlFor="breeder-min-reviews"
            className="mb-1 block text-xs text-[var(--gn-text-muted)]"
          >
            Reviews
          </label>
          <select
            id="breeder-min-reviews"
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
        Breeder name updates when you press Enter. Country applies on Enter or
        when you leave the field. Live suggestions stay on the header search.{" "}
        <Link href="/breeders" className="text-[#ff6a38] hover:underline">
          Reset all filters
        </Link>
      </p>
    </fieldset>
  );
}
