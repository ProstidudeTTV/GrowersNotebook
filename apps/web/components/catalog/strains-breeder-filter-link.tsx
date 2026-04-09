"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export const STRAINS_BREEDER_MODAL_RETURN_KEY = "gn-breeder-modal-return";

/**
 * When opening an intercepted `/breeders/[slug]` panel from the filtered strains
 * banner, remember the catalog list URL so closing the panel can `replace` there
 * instead of `history.back()` (which can skip past the filter).
 */
export function StrainsBreederFilterLink({
  breederSlug,
  returnHref,
  children,
  className,
}: {
  breederSlug: string;
  /** Full path + query for the current strains list view (built on the server). */
  returnHref: string;
  children: ReactNode;
  className?: string;
}) {
  const href = `/breeders/${encodeURIComponent(breederSlug)}`;

  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      onClick={() => {
        sessionStorage.setItem(
          STRAINS_BREEDER_MODAL_RETURN_KEY,
          JSON.stringify({ href: returnHref, breederSlug }),
        );
      }}
    >
      {children}
    </Link>
  );
}
