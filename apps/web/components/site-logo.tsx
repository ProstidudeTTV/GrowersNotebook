import { useId } from "react";

/** Full horizontal logo: GN monogram + GROWERS / NOTEBOOK wordmark. */
export function SiteLogo({ className }: { className?: string }) {
  const gradId = `gn-leaf-grad-${useId().replace(/:/g, "")}`;

  return (
    <svg
      className={className}
      viewBox="0 0 160 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Growers Notebook"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="var(--gn-accent)" />
        </linearGradient>
      </defs>
      <g transform="translate(10, 15)">
        <path
          d="M 25,35 C 10,30 5,15 25,5 C 20,20 20,30 25,35 Z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M 25,35 L 5,35 L 5,65 L 25,65 L 25,50 L 15,50"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 27,35 C 42,30 47,15 27,5 C 32,20 32,30 27,35 Z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M 27,65 L 27,35 L 47,65 L 47,35"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="70"
        y="44"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="13"
        fontWeight="800"
        fill="var(--gn-text)"
        letterSpacing="0.8"
      >
        GROWERS
      </text>
      <text
        x="70"
        y="59"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="13"
        fontWeight="800"
        fill="var(--gn-text)"
        letterSpacing="0.8"
      >
        NOTEBOOK
      </text>
    </svg>
  );
}
