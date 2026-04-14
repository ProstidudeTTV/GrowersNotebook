/** Public post-media / attachment URL is a video (by path). */
export function isDmVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url.trim());
}

/** Same host rules as the API (`embed-gif-attachment-rules`). */
export function isEmbeddedGifProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "media.giphy.com" ||
      host === "i.giphy.com" ||
      host.endsWith(".giphy.com")
    ) {
      return /^\/media\/[a-z0-9]+/i.test(parsed.pathname);
    }
    if (host === "media.tenor.com" || host === "c.tenor.com") return true;
    return false;
  } catch {
    return false;
  }
}

export function dedupeUrlsPreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}
