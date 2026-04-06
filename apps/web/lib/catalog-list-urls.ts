/** Query params for /strains list (no detail / reviewsPage). */
export type StrainsListQuery = {
  q?: string;
  sort?: string;
  page?: string;
  breederSlug?: string;
};

/** Query params for /breeders list (no detail / reviewsPage). */
export type BreedersListQuery = {
  q?: string;
  sort?: string;
  page?: string;
};

export function strainsListPath(list: StrainsListQuery): string {
  const u = new URLSearchParams();
  if (list.q?.trim()) u.set("q", list.q.trim());
  if (list.sort && list.sort !== "name") u.set("sort", list.sort);
  if (list.page && list.page !== "1") u.set("page", list.page);
  if (list.breederSlug?.trim()) u.set("breederSlug", list.breederSlug.trim());
  const s = u.toString();
  return s ? `/strains?${s}` : "/strains";
}

export function strainPreviewPath(
  slug: string,
  list: StrainsListQuery,
  reviewsPage = 1,
): string {
  const u = new URLSearchParams();
  if (list.q?.trim()) u.set("q", list.q.trim());
  if (list.sort && list.sort !== "name") u.set("sort", list.sort);
  if (list.page && list.page !== "1") u.set("page", list.page);
  if (list.breederSlug?.trim()) u.set("breederSlug", list.breederSlug.trim());
  u.set("detail", slug);
  if (reviewsPage > 1) u.set("reviewsPage", String(reviewsPage));
  return `/strains?${u.toString()}`;
}

export function breedersListPath(list: BreedersListQuery): string {
  const u = new URLSearchParams();
  if (list.q?.trim()) u.set("q", list.q.trim());
  if (list.sort && list.sort !== "name") u.set("sort", list.sort);
  if (list.page && list.page !== "1") u.set("page", list.page);
  const s = u.toString();
  return s ? `/breeders?${s}` : "/breeders";
}

export function breederPreviewPath(
  slug: string,
  list: BreedersListQuery,
  reviewsPage = 1,
): string {
  const u = new URLSearchParams();
  if (list.q?.trim()) u.set("q", list.q.trim());
  if (list.sort && list.sort !== "name") u.set("sort", list.sort);
  if (list.page && list.page !== "1") u.set("page", list.page);
  u.set("detail", slug);
  if (reviewsPage > 1) u.set("reviewsPage", String(reviewsPage));
  return `/breeders?${u.toString()}`;
}
