/**
 * Browser-facing origin for post-auth redirects. Prefer NEXT_PUBLIC_SITE_URL in
 * production so links stay correct behind Render’s reverse proxy when needed.
 */
export function getPublicSiteOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      const scheme = forwardedProto === "http" ? "http" : "https";
      return `${scheme}://${host}`;
    }
  }

  return new URL(request.url).origin;
}
