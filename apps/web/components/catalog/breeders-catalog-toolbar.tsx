"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogEntitySearchField } from "@/components/catalog/catalog-entity-search-field";
import {
  breederPreviewPath,
  type BreedersListQuery,
} from "@/lib/catalog-list-urls";
import { useDebouncedValue } from "@/lib/use-debounced-value";

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

function toBreederPreviewList(s: {
  q: string;
  sort: string;
  country: string;
  minRating: string;
  minReviews: string;
}): BreedersListQuery {
  return {
    q: s.q.trim() || undefined,
    sort: s.sort === "rating" ? "rating" : undefined,
    country: s.country.trim() || undefined,
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

  const debouncedQ = useDebouncedValue(q, 420);
  const debouncedCountry = useDebouncedValue(country, 400);

  useEffect(() => {
    const urlQ = sp.get("q") ?? "";
    if (debouncedQ.trim() === urlQ.trim()) return;
    const p = buildBreedersQueryFromInputs({
      ...inputsRef.current,
      q: debouncedQ,
    });
    p.set("page", "1");
    p.delete("detail");
    p.delete("reviewsPage");
    router.replace(`${pathname}?${p.toString()}`);
  }, [debouncedQ, pathname, router, sp, spKey]);

  useEffect(() => {
    const urlC = sp.get("country") ?? "";
    if (debouncedCountry.trim() === urlC.trim()) return;
    const p = buildBreedersQueryFromInputs({
      ...inputsRef.current,
      country: debouncedCountry,
    });
    p.set("page", "1");
    p.delete("detail");
    p.delete("reviewsPage");
    router.replace(`${pathname}?${p.toString()}`);
  }, [debouncedCountry, pathname, router, sp, spKey]);

  const suggestExtraQs = (() => {
    const e = new URLSearchParams();
    const c = country.trim();
    if (c) e.set("country", c);
    const mr = minRating.trim();
    if (mr && Number(mr) >= 1 && Number(mr) <= 5) e.set("minRating", mr);
    const mrev = minReviews.trim();
    if (mrev && Number(mrev) >= 1) e.set("minReviews", mrev);
    const s = e.toString();
    return s ? `&${s}` : "";
  })();

  const previewList = () => toBreederPreviewList(inputs);

  return (
    <div className="flex w-full flex-col gap-3 lg:max-w-4xl lg:flex-1">
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <CatalogEntitySearchField
          placeholder="Search breeders…"
          value={q}
          onChange={setQ}
          apiListPath="/breeders"
          extraApiQuery={suggestExtraQs}
          buildDetailHref={(slug) => breederPreviewPath(slug, previewList())}
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
        Live breeder suggestions after two letters. Country filters as you type
        (short pause).{" "}
        <Link href="/breeders" className="text-[#ff6a38] hover:underline">
          Reset all filters
        </Link>
      </p>
    </div>
  );
}
