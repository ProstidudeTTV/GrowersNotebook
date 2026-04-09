"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  type BreederModalReturnPayload,
  STRAINS_BREEDER_MODAL_RETURN_KEY,
} from "@/components/catalog/breeder-modal-return";

/**
 * Strain page/modal → intercepted `/breeders/[slug]`. Remembers the strain URL so
 * closing the breeder panel uses `replace` instead of `history.back()` (avoids
 * jumping past the strain catalog to e.g. notebook).
 */
export function CatalogStrainBreederLink({
  href,
  strainSlug,
  breederSlug,
  className,
  children,
}: {
  href: string;
  strainSlug: string;
  breederSlug: string;
  className?: string;
  children: ReactNode;
}) {
  const payload: BreederModalReturnPayload = {
    mode: "strain-detail",
    href: `/strains/${encodeURIComponent(strainSlug)}`,
    breederSlug,
  };
  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      onClick={() => {
        sessionStorage.setItem(
          STRAINS_BREEDER_MODAL_RETURN_KEY,
          JSON.stringify(payload),
        );
      }}
    >
      {children}
    </Link>
  );
}
