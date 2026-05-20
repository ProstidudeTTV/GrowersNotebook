import { SiteLogoMark } from "@/components/site-logo-mark";

type SiteBrandProps = {
  className?: string;
  /** `sm` for mobile header; `md` for sidebar / desktop brand column */
  size?: "sm" | "md";
};

/**
 * Navbar/sidebar brand: GN mark + readable HTML wordmark (avoids cramming SVG text
 * into a narrow w-56 column).
 */
export function SiteBrand({ className = "", size = "md" }: SiteBrandProps) {
  const markClass = size === "sm" ? "h-8 w-6" : "h-9 w-7";
  const lineClass =
    size === "sm"
      ? "text-[0.8125rem] leading-[1.05]"
      : "text-[0.9375rem] leading-[1.08]";

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${className}`.trim()}
    >
      <SiteLogoMark className={`${markClass} shrink-0`} aria-hidden />
      <div className="min-w-0 flex flex-col justify-center">
        <span
          className={`${lineClass} font-extrabold tracking-tight text-[var(--gn-text)]`}
        >
          Growers
        </span>
        <span
          className={`${lineClass} font-extrabold tracking-tight text-[var(--gn-text)]`}
        >
          Notebook
        </span>
      </div>
    </div>
  );
}
