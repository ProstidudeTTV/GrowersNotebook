/**
 * First-party proxy paths (see next.config rewrites). Obscure names reduce easy blocklist hits.
 * Script sets data-api to the event path so beacons stay same-origin through the proxy.
 */
export const PLAUSIBLE_PROXY_SCRIPT = "/gnpx/s.js";
export const PLAUSIBLE_PROXY_EVENT = "/gnpx/e";

export function plausibleScriptDestination(): string {
  const custom = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL?.trim();
  if (custom) return custom;
  return "https://plausible.io/js/script.js";
}

export function plausibleEventDestination(): string {
  const scriptUrl = plausibleScriptDestination();
  try {
    const u = new URL(scriptUrl);
    return `${u.origin}/api/event`;
  } catch {
    return "https://plausible.io/api/event";
  }
}
