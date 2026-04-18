"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";

/**
 * Intercepted `/strains/[slug]` slide-over. Closing uses `history.back()` so the
 * user returns to the page they were on (notebook, feed, post, etc.). The strains
 * list preview overlay uses `?detail=` on `/strains` instead of this route.
 */
export function CatalogInterceptStrainModal({
  children,
  fullPageHref,
}: {
  children: React.ReactNode;
  fullPageHref: string;
}) {
  const router = useRouter();
  const onClose = useCallback(() => {
    router.back();
  }, [router]);
  return (
    <CatalogDetailModal fullPageHref={fullPageHref} onClose={onClose}>
      {children}
    </CatalogDetailModal>
  );
}
