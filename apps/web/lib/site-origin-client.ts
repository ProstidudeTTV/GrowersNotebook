import { CANONICAL_PUBLIC_SITE_ORIGIN } from "@/lib/site-config";

/**
 * Canonical browser origin for Supabase `redirectTo` / `emailRedirectTo`.
 * Prefer `NEXT_PUBLIC_SITE_URL` (set in production to https://growersnotebook.com).
 * In production, never use localhost — email links must hit the live site.
 */
export function getSiteOriginForAuth(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const isProd = process.env.NODE_ENV === "production";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLoopback =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".localhost");
    if (isProd && isLoopback) {
      return CANONICAL_PUBLIC_SITE_ORIGIN;
    }
    return window.location.origin.replace(/\/+$/, "");
  }

  if (isProd) {
    return CANONICAL_PUBLIC_SITE_ORIGIN;
  }

  return "";
}
