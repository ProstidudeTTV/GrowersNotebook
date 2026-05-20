import type { PostMediaItem } from "@/lib/feed-post";
import { emptyTipTapDoc } from "@/lib/post-draft-validation";

const STORAGE_KEY = "gn:post-composer-draft";

export type PostComposerDraft = {
  title: string;
  media: PostMediaItem[];
  bodyJson: Record<string, unknown>;
  bodyHtml: string;
  /** `null` = profile post; otherwise community slug */
  communitySlug: string | null;
  expanded: boolean;
  updatedAt: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseMedia(raw: unknown): PostMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PostMediaItem[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const type = item.type === "video" ? "video" : "image";
    if (!url) continue;
    out.push({ url, type });
  }
  return out;
}

export function loadPostComposerDraft(): PostComposerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      media: parseMedia(parsed.media),
      bodyJson: isRecord(parsed.bodyJson)
        ? parsed.bodyJson
        : { ...emptyTipTapDoc },
      bodyHtml: typeof parsed.bodyHtml === "string" ? parsed.bodyHtml : "",
      communitySlug:
        parsed.communitySlug === null
          ? null
          : typeof parsed.communitySlug === "string"
            ? parsed.communitySlug
            : null,
      expanded: parsed.expanded === true,
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function savePostComposerDraft(draft: PostComposerDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, updatedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearPostComposerDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function draftHasContent(draft: PostComposerDraft): boolean {
  if (draft.title.trim()) return true;
  if (draft.media.length > 0) return true;
  const text = draft.bodyHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}
