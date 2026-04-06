import {
  collectYouTubeIdsFromText,
  hasYouTubeAnchorInHtml,
} from "@/lib/youtube-embed";

export const MAX_POST_MEDIA = 30;
export const TITLE_MAX_LEN = 300;

export const emptyTipTapDoc = {
  type: "doc",
  content: [{ type: "paragraph", content: [] }],
} as const;

/** Compose / edit: body counts as non-empty with media, YouTube links, legacy embeds, or plain text. */
export function bodyHtmlIsSubmittable(
  html: string,
  mediaCount: number,
  markdownFallbackText?: string,
): boolean {
  if (mediaCount > 0) return true;
  if (hasYouTubeAnchorInHtml(html)) return true;
  if (
    markdownFallbackText !== undefined &&
    collectYouTubeIdsFromText(markdownFallbackText).length > 0
  ) {
    return true;
  }
  if (/<img[\s>]|<video[\s>]|<table[\s>]/i.test(html)) return true;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}
