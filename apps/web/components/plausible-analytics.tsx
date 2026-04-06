"use client";

import Script from "next/script";
import {
  PLAUSIBLE_PROXY_EVENT,
  PLAUSIBLE_PROXY_SCRIPT,
} from "@/lib/plausible-proxy";

/**
 * Loads Plausible through first-party paths (next.config rewrites) so the script
 * and /api/event calls are less likely to be blocked. The official script.js already
 * tracks Next.js client navigations via history.pushState.
 *
 * Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN. Optional NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL for self-hosted.
 */
export function PlausibleAnalytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  if (!domain) return null;

  const useProxy = process.env.NEXT_PUBLIC_PLAUSIBLE_NO_PROXY !== "1";
  if (useProxy) {
    return (
      <Script
        src={PLAUSIBLE_PROXY_SCRIPT}
        data-domain={domain}
        data-api={PLAUSIBLE_PROXY_EVENT}
        strategy="afterInteractive"
      />
    );
  }

  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL?.trim() ||
    "https://plausible.io/js/script.js";

  return (
    <Script
      src={src}
      data-domain={domain}
      strategy="afterInteractive"
    />
  );
}
