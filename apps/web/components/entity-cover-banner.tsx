import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  imageUrl?: string | null;
  alt?: string;
  /** `hero` = community/profile page header; `compact` = shorter strip */
  variant?: "hero" | "compact";
  children?: ReactNode;
  className?: string;
  priority?: boolean;
};

const HEIGHT = {
  hero: "h-48 sm:h-56 md:h-64",
  compact: "h-16 sm:h-20",
} as const;

/**
 * Consistent full-width cover image + bottom fade used on profiles and communities.
 */
export function EntityCoverBanner({
  imageUrl,
  alt = "",
  variant = "hero",
  children,
  className = "",
  priority = false,
}: Props) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div
      className={`relative w-full overflow-hidden ${HEIGHT[variant]} ${className}`}
    >
      {hasImage ? (
        variant === "hero" ? (
          <Image
            src={imageUrl!.trim()}
            alt={alt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1280px) 100vw, 1100px"
            priority={priority}
            unoptimized
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl!.trim()}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )
      ) : (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[color-mix(in_srgb,var(--gn-accent)_28%,var(--gn-page-bottom))] via-[color-mix(in_srgb,var(--gn-accent)_16%,var(--gn-surface-muted))] to-[var(--gn-surface-elevated)]">
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.07]"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <pattern
                id="gn-cover-dots"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="10" cy="10" r="1.5" fill="white" />
                <circle cx="30" cy="30" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gn-cover-dots)" />
          </svg>
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--gn-accent)]/10 blur-3xl" />
        </div>
      )}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent ${
          variant === "hero" ? "h-2/3" : "h-full"
        }`}
      />
      {children ? (
        <div className="absolute inset-0 z-[1]">{children}</div>
      ) : null}
    </div>
  );
}
