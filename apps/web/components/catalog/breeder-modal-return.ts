/** sessionStorage payload for `CatalogInterceptBreederModal` dismiss. */
export const STRAINS_BREEDER_MODAL_RETURN_KEY = "gn-breeder-modal-return";

export type BreederModalReturnPayload =
  | {
      mode: "catalog-filter";
      href: string;
      breederSlug: string;
    }
  | {
      mode: "strain-detail";
      /** e.g. `/strains/blue-dream` — restore strain page/modal after breeder panel */
      href: string;
      breederSlug: string;
    };

export function breederSlugsMatch(stored: string, open: string): boolean {
  if (stored === open) return true;
  try {
    return decodeURIComponent(stored) === decodeURIComponent(open);
  } catch {
    return false;
  }
}
