import type { CommunityIconKey } from "@/lib/community-icon-keys";
import { isCommunityIconKey } from "@/lib/community-icon-keys";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconForKey({
  iconKey,
  className,
}: {
  iconKey: CommunityIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case "seedling":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            {...stroke}
            d="M12 22V12M12 12c-2-4-6-5-8-2 2 1 5 3 8 2M12 12c2-4 6-5 8-2-2 1-5 3-8 2"
          />
        </svg>
      );
    case "leaf":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            {...stroke}
            d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
          />
          <path {...stroke} d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "sprout":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M12 22V8" />
          <path {...stroke} d="M12 8c0-4 3-6 6-6-1 3-3 5-6 6" />
          <path {...stroke} d="M12 8c0-4-3-6-6-6 1 3 3 5 6 6" />
        </svg>
      );
    case "sun":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="4" {...stroke} />
          <path
            {...stroke}
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      );
    case "droplet":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            {...stroke}
            d="M12 22a7 7 0 0 0 0-14c-3.5 0-7 7-7 11a7 7 0 0 0 14 0c0-1-.5-2.5-1.5-4"
          />
        </svg>
      );
    case "flame":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            {...stroke}
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.58-.95-3.62-2-5 1.38.85 3.1 2.42 4 4.5 0 0 1-2.33 2-5.5.73 2.58.5 5.5.5 6.5a6 6 0 1 1-11 0c0-1.12.28-2.19.8-3.15a4 4 0 0 0 4.2 6.15Z"
          />
        </svg>
      );
    case "greenhouse":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M2 22h20" />
          <path {...stroke} d="M4 22V10l8-6 8 6v12" />
          <path {...stroke} d="M12 22V14" />
          <path {...stroke} d="M9 18h6" />
        </svg>
      );
    case "mountain":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="m8 3 4 8 5-5 5 15H2L8 3Z" />
        </svg>
      );
    case "beaker":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M4.5 3h15" />
          <path {...stroke} d="M6 3v11a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V3" />
          <path {...stroke} d="M6 14h12" />
        </svg>
      );
    case "heart":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path
            {...stroke}
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"
          />
        </svg>
      );
    case "users":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" {...stroke} />
          <path {...stroke} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "home":
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M3 10.5 12 3l9 7.5" />
          <path {...stroke} d="M5 10v10h14V10" />
        </svg>
      );
    default: {
      const _exhaustive: never = iconKey;
      return _exhaustive;
    }
  }
}

/** Renders the curated community glyph, or a letter fallback when `iconKey` is missing or unknown. */
export function CommunityIcon({
  iconKey,
  nameFallback,
  slugFallback,
  className = "",
  frameClassName = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]",
}: {
  iconKey?: string | null;
  /** Used for initial-letter avatar when no icon */
  nameFallback: string;
  slugFallback: string;
  className?: string;
  frameClassName?: string;
}) {
  const trimmed = iconKey?.trim() ?? "";
  const key = trimmed && isCommunityIconKey(trimmed) ? trimmed : undefined;
  const label = nameFallback.trim() || slugFallback.trim();
  const initial = label.charAt(0).toUpperCase() || "?";

  if (!key) {
    return (
      <span
        className={`${frameClassName} text-xs font-semibold`}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    <span className={`${frameClassName} ${className}`} aria-hidden>
      <IconForKey iconKey={key} className="shrink-0 opacity-90" />
    </span>
  );
}
