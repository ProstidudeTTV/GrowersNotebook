const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function normalizeHref(href: string): string {
  const h = href.trim();
  if (h.startsWith('//')) return `https:${h}`;
  if (h.startsWith('http://') || h.startsWith('https://')) return h;
  return `https://${h}`;
}

/** Parse YouTube URLs into a canonical 11-char video id. */
export function extractYouTubeVideoId(raw: string): string | null {
  try {
    const u = new URL(normalizeHref(raw));
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'music.youtube.com') {
      const v = u.searchParams.get('v');
      if (v && YT_ID_RE.test(v)) return v;
      return null;
    }

    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]?.split('?')[0] ?? '';
      return YT_ID_RE.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed') {
        const id = parts[1]?.split('?')[0] ?? '';
        return YT_ID_RE.test(id) ? id : null;
      }
      const v = u.searchParams.get('v');
      if (v && YT_ID_RE.test(v)) return v;
    }
  } catch {
    return null;
  }
  return null;
}

const ANCHOR_HREF_RE =
  /<a\b[^>]*\bhref\s*=\s*(["'])((?:https?:)?\/\/[^"']+?)\1/gi;

const BARE_P_RE = /<p(\s[^>]*)?>\s*(https:\/\/[^\s<]+)\s*<\/p>/gi;

/** At least one `<a href>` points to a YouTube URL we can embed. */
export function htmlHasExpandableYouTubeLink(html: string): boolean {
  let m: RegExpExecArray | null;
  const re = new RegExp(ANCHOR_HREF_RE.source, ANCHOR_HREF_RE.flags);
  while ((m = re.exec(html)) !== null) {
    if (extractYouTubeVideoId(normalizeHref(m[2]))) return true;
  }
  const reP = new RegExp(BARE_P_RE.source, BARE_P_RE.flags);
  while ((m = reP.exec(html)) !== null) {
    if (extractYouTubeVideoId(normalizeHref(m[2]))) return true;
  }
  return false;
}
