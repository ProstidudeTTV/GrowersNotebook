"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SiteHeaderSearch() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (pathname === "/search") {
      setValue(sp.get("q")?.trim() ?? "");
    }
  }, [pathname, sp]);

  return (
    <form
      action="/search"
      method="get"
      role="search"
      className="flex w-full max-w-md min-w-0 items-center gap-2"
    >
      <label htmlFor="gn-site-search" className="sr-only">
        Search growers and posts
      </label>
      <input
        id="gn-site-search"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Search growers & posts…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:border-[#ff6a38] focus:outline-none focus:ring-1 focus:ring-[#ff6a38]"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-[#ff6a38] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ff7d4c]"
      >
        Search
      </button>
    </form>
  );
}
