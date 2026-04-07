/**
 * Canonical browser origin for Supabase `redirectTo` / `emailRedirectTo`.
 * On Render, set `NEXT_PUBLIC_SITE_URL` to the public web URL (no trailing slash)
 * so password-reset and signup emails use your public site URL.
 */
export function getSiteOriginForAuth(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
