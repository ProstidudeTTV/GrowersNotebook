/** Inline SVG wordmark for header / favicon-style use (no external asset). */
export function SiteLogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="gn-site-logo-grad"
          x1="4"
          y1="28"
          x2="28"
          y2="4"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#ff4500" />
        </linearGradient>
      </defs>
      {/* Notebook / journal */}
      <path
        d="M9 6h11a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H9V6Z"
        stroke="url(#gn-site-logo-grad)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 6H8a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h1"
        stroke="url(#gn-site-logo-grad)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      <path
        d="M13 11h6M13 15h5"
        stroke="url(#gn-site-logo-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Leaf accent */}
      <path
        d="M22.5 5Q26 9.5 23.5 13Q21 9.5 22.5 5Z"
        fill="url(#gn-site-logo-grad)"
        opacity={0.92}
      />
    </svg>
  );
}
