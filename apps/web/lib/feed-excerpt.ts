/**
 * Normalize post body excerpts for feed cards (plain text, predictable wrapping).
 * Excerpts are usually plain text from the API; this handles stray tags/entities.
 */
export function formatFeedExcerpt(raw: string | null | undefined): string {
  if (raw == null) return "";
  let t = String(raw).trim();
  if (!t) return "";
  t = t.replace(/<[^>]*>/g, " ");
  t = t
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, " ")
    .replace(/&gt;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
  t = t.replace(/&#(?:x[0-9a-f]+|[0-9]+);/gi, " ");
  t = t.replace(/&[a-z]{2,20};/gi, " ");
  return t.replace(/\s+/g, " ").trim();
}
