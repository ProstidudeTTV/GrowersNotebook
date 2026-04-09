"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";
import { STRAINS_BREEDER_MODAL_RETURN_KEY } from "@/components/catalog/strains-breeder-filter-link";

type StoredReturn = { href: string; breederSlug: string };

/**
 * Intercepted `/breeders/[slug]` modal. When opened from the strains catalog
 * filter banner, we store the return URL in sessionStorage so dismiss uses
 * `replace` back to `/strains?breederSlug=…` instead of `history.back()`
 * (which can pop past the filtered list).
 */
export function CatalogInterceptBreederModal({
  children,
  fullPageHref,
  breederSlug,
}: {
  children: React.ReactNode;
  fullPageHref: string;
  breederSlug: string;
}) {
  const router = useRouter();
  const onClose = useCallback(() => {
    if (typeof window === "undefined") {
      router.back();
      return;
    }
    const raw = sessionStorage.getItem(STRAINS_BREEDER_MODAL_RETURN_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredReturn;
        if (
          typeof parsed?.href === "string" &&
          parsed.breederSlug === breederSlug
        ) {
          sessionStorage.removeItem(STRAINS_BREEDER_MODAL_RETURN_KEY);
          router.replace(parsed.href, { scroll: false });
          return;
        }
      } catch {
        sessionStorage.removeItem(STRAINS_BREEDER_MODAL_RETURN_KEY);
      }
    }
    router.back();
  }, [router, breederSlug]);

  return (
    <CatalogDetailModal fullPageHref={fullPageHref} onClose={onClose}>
      {children}
    </CatalogDetailModal>
  );
}
