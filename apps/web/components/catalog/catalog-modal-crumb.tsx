"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

/** In intercepted modals, “back” closes the overlay and restores list scroll. */
export function CatalogModalCrumb({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const onBack = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    try {
      router.back();
    } finally {
      window.setTimeout(() => {
        busy.current = false;
      }, 400);
    }
  }, [router]);
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-[#ff6a38] hover:underline"
    >
      {children}
    </button>
  );
}
