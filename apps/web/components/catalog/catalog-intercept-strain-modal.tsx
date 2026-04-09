"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";

/**
 * Intercepted /strains/[slug] modal: dismiss with replace so one click does not
 * walk the whole browser stack (e.g. notebook → strain → … → multi-pop).
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
    router.replace("/strains", { scroll: false });
  }, [router]);
  return (
    <CatalogDetailModal fullPageHref={fullPageHref} onClose={onClose}>
      {children}
    </CatalogDetailModal>
  );
}
