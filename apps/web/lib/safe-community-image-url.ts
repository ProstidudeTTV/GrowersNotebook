const COMMUNITY_BANNERS_PATH = "/storage/v1/object/public/community-banners/";

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ]) {
    const trimmed = raw?.trim().replace(/\/+$/, "");
    if (!trimmed) continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      continue;
    }
  }
  return origins;
}

/**
 * Community icons/banners are only trusted from our public `community-banners`
 * Supabase bucket. Legacy external URLs should fall back instead of rendering
 * broken images after the security hardening.
 */
export function getSafeCommunityImageUrl(
  url: string | null | undefined,
): string | null {
  const value = url?.trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (!parsed.pathname.startsWith(COMMUNITY_BANNERS_PATH)) return null;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.size === 0) return null;

  return allowedOrigins.has(parsed.origin) ? value : null;
}
