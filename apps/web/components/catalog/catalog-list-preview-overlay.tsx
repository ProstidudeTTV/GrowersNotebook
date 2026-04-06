"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CatalogDetailModal } from "@/components/catalog/catalog-detail-modal";

function CatalogListPreviewOverlayInner({
  children,
  fullPageHref,
}: {
  children: React.ReactNode;
  fullPageHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const close = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("detail");
    p.delete("reviewsPage");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <CatalogDetailModal fullPageHref={fullPageHref} onClose={close}>
      {children}
    </CatalogDetailModal>
  );
}

/** Keeps the catalog list mounted so scroll and page query stay intact. */
export function CatalogListPreviewOverlay({
  children,
  fullPageHref,
}: {
  children: React.ReactNode;
  fullPageHref: string;
}) {
  return (
    <Suspense fallback={null}>
      <CatalogListPreviewOverlayInner fullPageHref={fullPageHref}>
        {children}
      </CatalogListPreviewOverlayInner>
    </Suspense>
  );
}
