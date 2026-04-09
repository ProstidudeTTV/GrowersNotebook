"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  breederSlugsMatch,
  STRAINS_BREEDER_MODAL_RETURN_KEY,
} from "@/components/catalog/breeder-modal-return";
import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";

/**
 * Intercepted `/breeders/[slug]` modal. Prefers `sessionStorage` so dismiss uses
 * `replace` back to the strains catalog (filtered list or strain detail) instead
 * of `history.back()` (which can return to notebook after a long chain).
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
        const parsed = JSON.parse(raw) as {
          mode?: string;
          href?: string;
          breederSlug?: string;
        };
        const modeOk =
          parsed.mode === "catalog-filter" ||
          parsed.mode === "strain-detail" ||
          parsed.mode === undefined;
        if (
          modeOk &&
          typeof parsed.href === "string" &&
          typeof parsed.breederSlug === "string" &&
          breederSlugsMatch(parsed.breederSlug, breederSlug)
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
