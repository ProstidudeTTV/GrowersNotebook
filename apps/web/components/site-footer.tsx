import Link from "next/link";
import { SITE_NAME } from "@/lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-xs text-[var(--gn-text-muted)] sm:flex-row sm:text-left">
        <p>
          © {year} {SITE_NAME}
        </p>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end"
          aria-label="Legal and policies"
        >
          <Link
            href="/privacy"
            className="text-[var(--gn-text)] underline-offset-2 transition hover:text-[#ff6a38] hover:underline"
          >
            Privacy &amp; security
          </Link>
          <Link
            href="/terms"
            className="text-[var(--gn-text)] underline-offset-2 transition hover:text-[#ff6a38] hover:underline"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
