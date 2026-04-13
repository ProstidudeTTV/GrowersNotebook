/** Query params for /strains list (no detail / reviewsPage). */
export type StrainsListQuery = {
  q?: string;
  sort?: string;
  page?: string;
  breederSlug?: string;
  minRating?: string;
  minReviews?: string;
  /** indica | sativa | hybrid */
  chemotype?: string;
};

/** Query params for /breeders list (no detail / reviewsPage). */
export type BreedersListQuery = {
  q?: string;
  sort?: string;
  page?: string;
  country?: string;
  minRating?: string;
  minReviews?: string;
};

function appendStrainsParams(u: URLSearchParams, list: StrainsListQuery) {
  if (list.q?.trim()) u.set("q", list.q.trim());
  if (list.sort && list.sort !== "name") u.set("sort", list.sort);
  if (list.page && list.page !== "1") u.set("page", list.page);
  if (list.breederSlug?.trim()) u.set("breederSlug", list.breederSlug.trim());
  const mr = list.minRating?.trim();
  if (mr && Number(mr) >= 1 && Number(mr) <= 5) u.set("minRating", mr);
  const mrev = list.minReviews?.trim();
  if (mrev && Number(mrev) >= 1) u.set("minReviews", mrev);
  const ct = list.chemotype?.trim().toLowerCase();
  if (ct === "indica" || ct === "sativa" || ct === "hybrid") {
    u.set("chemotype", ct);
  }
}

export function strainsListPath(list: StrainsListQuery): string {
  const u = new URLSearchParams();
  appendStrainsParams(u, list);
  const s = u.toString();
  return s ? `/strains?${s}` : "/strains";
}

export function strainPreviewPath(
  slug: string,
  list: StrainsListQuery,
  reviewsPage = 1,
): string {
  const u = new URLSearchParams();
  appendStrainsParams(u, list);
  u.set("detail", slug);
  if (reviewsPage > 1) u.set("reviewsPage", String(reviewsPage));
  return `/strains?${u.toString()}`;
}

function appendBreedersParams(u: URLSearchParams, list: BreedersListQuery) {
  if (list.q?.trim()) u.set("q", list.q.trim());
  if (list.sort && list.sort !== "name") u.set("sort", list.sort);
  if (list.page && list.page !== "1") u.set("page", list.page);
  if (list.country?.trim()) u.set("country", list.country.trim());
  const mr = list.minRating?.trim();
  if (mr && Number(mr) >= 1 && Number(mr) <= 5) u.set("minRating", mr);
  const mrev = list.minReviews?.trim();
  if (mrev && Number(mrev) >= 1) u.set("minReviews", mrev);
}

export function breedersListPath(list: BreedersListQuery): string {
  const u = new URLSearchParams();
  appendBreedersParams(u, list);
  const s = u.toString();
  return s ? `/breeders?${s}` : "/breeders";
}

export function breederPreviewPath(
  slug: string,
  list: BreedersListQuery,
  reviewsPage = 1,
  strainReviewsPage = 1,
): string {
  const u = new URLSearchParams();
  appendBreedersParams(u, list);
  u.set("detail", slug);
  if (reviewsPage > 1) u.set("reviewsPage", String(reviewsPage));
  if (strainReviewsPage > 1) {
    u.set("strainReviewsPage", String(strainReviewsPage));
  }
  return `/breeders?${u.toString()}`;
}
