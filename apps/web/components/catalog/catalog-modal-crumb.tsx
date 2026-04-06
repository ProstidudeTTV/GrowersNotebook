"use client";

import { useRouter } from "next/navigation";

/** In intercepted modals, “back” closes the overlay and restores list scroll. */
export function CatalogModalCrumb({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-[#ff6a38] hover:underline"
    >
      {children}
    </button>
  );
}
