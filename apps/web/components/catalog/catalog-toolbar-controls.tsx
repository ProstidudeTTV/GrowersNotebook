import type { ReactNode } from "react";

export function CatalogToolbarLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gn-text-muted)]">
      {children}
    </span>
  );
}

export function CatalogFilterChipButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1.5 text-sm font-semibold transform-gpu transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out hover:-translate-y-px hover:shadow-[0_14px_28px_-18px_rgba(0,0,0,0.45)] active:translate-y-[1px] active:scale-[0.985] ${
        active
          ? "border-[var(--gn-accent)] bg-[var(--gn-accent)] text-[var(--gn-on-accent)] shadow-[0_12px_26px_-16px_color-mix(in_srgb,var(--gn-accent)_85%,transparent)]"
          : "border-[var(--gn-divide)] bg-[var(--gn-surface)] text-[var(--gn-text-muted)] hover:border-[color-mix(in_srgb,var(--gn-accent)_35%,var(--gn-divide))] hover:bg-[var(--gn-surface-elevated)] hover:text-[var(--gn-text)]"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b transition-opacity duration-150 ${
          active
            ? "from-white/20 to-transparent opacity-100"
            : "from-white/10 to-transparent opacity-0 group-hover:opacity-100"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset transition-opacity duration-150 ${
          active
            ? "opacity-100 ring-white/10"
            : "opacity-0 ring-[color-mix(in_srgb,var(--gn-accent)_35%,transparent)] group-hover:opacity-100"
        }`}
      />
      <span className="relative z-[1] inline-flex items-center gap-1.5">
        {children}
      </span>
    </button>
  );
}

export function CatalogToolbarActionButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-semibold transform-gpu transition-[transform,box-shadow,background-color,border-color,filter] duration-150 ease-out hover:-translate-y-px hover:shadow-[0_16px_30px_-18px_rgba(0,0,0,0.5)] active:translate-y-[1px] active:scale-[0.985] ${
        variant === "primary"
          ? "bg-[var(--gn-accent)] text-[var(--gn-on-accent)] shadow-[0_14px_28px_-16px_color-mix(in_srgb,var(--gn-accent)_85%,transparent)] hover:brightness-110"
          : "border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] hover:border-[color-mix(in_srgb,var(--gn-accent)_25%,var(--gn-divide))] hover:bg-[var(--gn-surface-hover)]"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b transition-opacity duration-150 ${
          variant === "primary"
            ? "from-white/20 to-transparent opacity-100"
            : "from-white/10 to-transparent opacity-0 group-hover:opacity-100"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset transition-opacity duration-150 ${
          variant === "primary"
            ? "opacity-100 ring-white/10"
            : "opacity-0 ring-[color-mix(in_srgb,var(--gn-accent)_35%,transparent)] group-hover:opacity-100"
        }`}
      />
      <span className="relative z-[1] inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
