import { CANONICAL_PUBLIC_SITE_ORIGIN } from "@/lib/site-config";

/**
 * Origin for Supabase `redirectTo` / `emailRedirectTo` when computing on the server.
 * In production, never falls back to localhost — avoids bad links from mis-set client env.
 */
export function getAuthRedirectOriginServer(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    return CANONICAL_PUBLIC_SITE_ORIGIN;
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`.replace(/\/+$/, "");
  }
  if (process.env.RENDER_EXTERNAL_URL?.trim()) {
    return process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3000";
}
