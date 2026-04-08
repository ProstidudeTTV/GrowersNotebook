/**
 * DM + clipboard helpers for sharing a post link. URL shape must stay in sync
 * with `DmSharedPostEmbed` parsing in the messages panel.
 */

const POST_ID_GROUP =
  "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

/** Absolute (http/https) post URL, same shape as stored from `clientAbsolutePostUrl`. */
export const DM_POST_SHARE_URL_RE =
  new RegExp(
    `(https?:\\/\\/[^\\s]+\\/p\\/${POST_ID_GROUP})\\b`,
    "i",
  );

export function clientAbsolutePostUrl(postId: string): string {
  const env =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")
      : undefined;
  const origin =
    env ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "";
  return `${origin}/p/${postId}`;
}

export function buildPostShareDmBody(postTitle: string, absoluteUrl: string) {
  const t = postTitle.trim() || "Post";
  return `Shared a post: ${t}\n\n${absoluteUrl}`;
}

export function firstPostShareMatch(body: string): {
  fullUrl: string;
  postId: string;
} | null {
  const m1 = DM_POST_SHARE_URL_RE.exec(body);
  if (m1) return { fullUrl: m1[1], postId: m1[2] };
  const rel = new RegExp(`(?:^|\\s)(\\/p\\/${POST_ID_GROUP})\\b`, "i").exec(
    body,
  );
  if (rel) return { fullUrl: rel[1].trim(), postId: rel[2] };
  return null;
}

export function captionWithoutShareUrl(body: string, shareUrl: string): string {
  return body
    .split("\n")
    .filter((line) => line.trim() !== shareUrl.trim())
    .join("\n")
    .trim();
}
