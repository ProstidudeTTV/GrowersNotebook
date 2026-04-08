import sanitizeHtml from 'sanitize-html';
import { htmlHasExpandableYouTubeLink } from './youtube-embed';

const allowedTags = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'span',
  'img',
  'video',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'caption',
  'sup',
];

export function sanitizePostHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      span: ['class', 'data-spoiler', 'data-revealed'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
      video: ['src', 'controls', 'playsinline', 'preload', 'class', 'muted'],
      table: ['class'],
      th: ['colspan', 'rowspan', 'class'],
      td: ['colspan', 'rowspan', 'class'],
    },
    allowedSchemes: ['https'],
    allowedSchemesByTag: {
      img: ['https'],
      video: ['https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

/** True if the post has visible text, embedded media in HTML, a table, or attached media. */
export function hasRenderablePostBody(
  html: string,
  attachedMedia?: readonly unknown[] | null,
): boolean {
  if (attachedMedia?.length) return true;
  if (htmlHasExpandableYouTubeLink(html)) return true;
  if (/<img[\s>]|<video[\s>]|<table[\s>]/i.test(html)) return true;
  const text = sanitizeHtml(html, { allowedTags: [] })
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}

export function htmlToExcerpt(html: string, maxLen = 400): string {
  const plain = sanitizeHtml(html, { allowedTags: [] });
  const trimmed = plain.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}
