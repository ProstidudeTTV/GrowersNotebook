"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  type BreederModalReturnPayload,
  STRAINS_BREEDER_MODAL_RETURN_KEY,
} from "@/components/catalog/breeder-modal-return";

/** Navigates to filtered strains and records return target for breeder panel dismiss. */
export function BreederStrainsCatalogLink({
  breederSlug,
  className,
  children,
}: {
  breederSlug: string;
  className?: string;
  children: ReactNode;
}) {
  const href = `/strains?breederSlug=${encodeURIComponent(breederSlug)}`;
  const payload: BreederModalReturnPayload = {
    mode: "catalog-filter",
    href,
    breederSlug,
  };
  return (
    <Link
      href={href}
      replace
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
