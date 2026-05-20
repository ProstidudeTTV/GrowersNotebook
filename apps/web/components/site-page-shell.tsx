import type { ReactNode } from "react";

type Props = {
  /** Full-width strip in the main column (edge-to-edge, no max-w). */
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Standard page wrapper: optional full-bleed banner + constrained content gutter.
 * Use when the site layout no longer applies max-w globally.
 */
export function SitePageShell({ banner, children, className }: Props) {
  return (
    <div className={className}>
      {banner ? <div className="w-full">{banner}</div> : null}
      <div className="mx-auto w-full max-w-[var(--gn-container-max)] px-[var(--gn-gutter-mobile)] sm:px-[var(--gn-gutter)]">
        {children}
      </div>
    </div>
  );
}
