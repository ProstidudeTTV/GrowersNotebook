/** YouTube video IDs are 11 chars in this set. */
const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const MUSIC_YT_HOST = "music.youtube.com";

function normalizeHref(href: string): string {
  const h = href.trim();
  if (h.startsWith("//")) return `https:${h}`;
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  return `https://${h}`;
}

/**
 * Parse a YouTube watch / embed / shorts / youtu.be URL into a video id, or null.
 */
export function extractYouTubeVideoId(raw: string): string | null {
  try {
    const u = new URL(normalizeHref(raw));
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === MUSIC_YT_HOST) {
      const v = u.searchParams.get("v");
      if (v && YT_ID_RE.test(v)) return v;
      return null;
    }

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0]?.split("?")[0] ?? "";
      return YT_ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") {
        const id = parts[1]?.split("?")[0] ?? "";
        return YT_ID_RE.test(id) ? id : null;
      }
      const v = u.searchParams.get("v");
      if (v && YT_ID_RE.test(v)) return v;
    }
  } catch {
    return null;
  }
  return null;
}

/** Match TipTap/sanitizer-style anchor tags with double or single quoted href. */
const ANCHOR_RE =
  /<a\b[^>]*\bhref\s*=\s*(["'])((?:https?:)?\/\/[^"']+?)\1[^>]*>([\s\S]*?)<\/a>/gi;

/** `<p><a href="youtube…">…</a></p>` → embed (avoids block div inside p). */
const PARAGRAPH_YT_ANCHOR_RE =
  /<p(\s[^>]*)?>\s*<a\b[^>]*\bhref\s*=\s*(["'])((?:https?:)?\/\/[^"']+?)\2[^>]*>([\s\S]*?)<\/a>\s*<\/p>/gi;

export function expandYouTubeAnchorsInHtml(html: string): string {
  let out = html.replace(
    PARAGRAPH_YT_ANCHOR_RE,
    (full, _attrs: string | undefined, _q: string, href: string) => {
      const id = extractYouTubeVideoId(normalizeHref(href));
      if (!id) return full;
      return youtubeEmbedMarkup(id);
    },
  );
  out = out.replace(ANCHOR_RE, (full, _q: string, href: string) => {
    const id = extractYouTubeVideoId(normalizeHref(href));
    if (!id) return full;
    return youtubeEmbedMarkup(id);
  });
  return out;
}

/** e.g. markdown paragraph that is only a bare https://youtube.com/... URL */
const BARE_P_RE = /<p(\s[^>]*)?>\s*(https:\/\/[^\s<]+)\s*<\/p>/gi;

export function expandBareYouTubeParagraphsInHtml(html: string): string {
  return html.replace(BARE_P_RE, (full, _attrs: string | undefined, url: string) => {
    const id = extractYouTubeVideoId(normalizeHref(url));
    if (!id) return full;
    return youtubeEmbedMarkup(id);
  });
}

export function youtubeEmbedMarkup(videoId: string): string {
  return `<div class="gn-youtube-embed"><iframe class="gn-youtube-iframe" src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
}

/**
 * YouTube video ids present in `<a href="…youtube…">` (deduped, order preserved).
 */
export function collectYouTubeIdsFromHtml(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(ANCHOR_RE.source, ANCHOR_RE.flags);
  while ((m = re.exec(html)) !== null) {
    const id = extractYouTubeVideoId(normalizeHref(m[2]));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** True if body HTML contains at least one YouTube link we can turn into an embed. */
export function hasYouTubeAnchorInHtml(html: string): boolean {
  return collectYouTubeIdsFromHtml(html).length > 0;
}

/** Raw stored HTML → HTML with YouTube links replaced by embed iframes. */
export function displayPostBodyHtml(bodyHtml: string): string {
  let out = expandYouTubeAnchorsInHtml(bodyHtml);
  out = expandBareYouTubeParagraphsInHtml(out);
  return out;
}

/** Markdown/source text may contain bare YouTube URLs (autolinked on render). */
const BARE_YT_RE =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?(?:[^>\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})\b[^\s<>"']*/gi;

export function collectYouTubeIdsFromText(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(BARE_YT_RE.source, BARE_YT_RE.flags);
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    if (!YT_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Feed cards: detect YouTube from stored HTML (anchors + pasted URLs in text nodes)
 * and from plain excerpt (e.g. bare URL or "YouTube video" fallback when excerpt has no id).
 */
export function collectYouTubeIdsForFeedPreview(
  bodyHtml: string | null | undefined,
  excerpt: string | null | undefined,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (ids: string[]) => {
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  };
  if (bodyHtml?.trim()) {
    push(collectYouTubeIdsFromHtml(bodyHtml));
    push(
      collectYouTubeIdsFromText(
        bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
      ),
    );
  }
  if (excerpt?.trim()) push(collectYouTubeIdsFromText(excerpt));
  return out;
}
