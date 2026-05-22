import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  eyebrowClassName?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  variant?: "default" | "hot";
};

/** Shared feed page hero under full-bleed banners (Your Feed, Hot, etc.). */
export function FeedPageBanner({
  eyebrow,
  eyebrowClassName,
  title,
  description,
  actions,
  variant = "default",
}: Props) {
  const hot = variant === "hot";
  return (
    <div
      className={
        hot
          ? "relative overflow-hidden border-b border-[var(--gn-divide)] bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-hot)_12%,var(--gn-surface-muted))] via-[var(--gn-surface-raised)] to-[var(--gn-surface-muted)]"
          : "relative overflow-hidden border-b border-[var(--gn-divide)] bg-gradient-to-r from-[var(--gn-surface-raised)] via-[var(--gn-surface-elevated)] to-[var(--gn-surface-raised)]"
      }
    >
      {hot ? (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--gn-hot)_18%,transparent)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--gn-accent)_15%,transparent)] blur-3xl" />
        </>
      ) : (
        <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-[var(--gn-accent)]/5 blur-3xl" />
      )}
      <div className="relative mx-auto flex max-w-[var(--gn-container-max)] flex-col gap-4 px-[var(--gn-gutter-mobile)] py-8 sm:flex-row sm:items-end sm:justify-between sm:px-[var(--gn-gutter)] sm:py-10">
        <div>
          {eyebrow ? (
            <p
              className={
                eyebrowClassName ??
                "text-xs font-bold uppercase tracking-widest text-[var(--gn-text-muted)]"
              }
            >
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--gn-text)] sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--gn-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
