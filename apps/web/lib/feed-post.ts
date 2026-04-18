export type PostMediaItem = { url: string; type: "image" | "video" };

/** Shape returned by `GET /posts` and `GET /posts/following`. */
export type FeedPost = {
  id: string;
  title: string;
  excerpt: string | null;
  /** Present on list/detail API payloads; used for feed link previews (e.g. YouTube). */
  bodyHtml?: string;
  media?: PostMediaItem[];
  createdAt: string;
  score: number;
  upvotes: number;
  downvotes: number;
  viewerVote: number | null;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl?: string | null;
    seeds: number;
    growerLevel: string;
    viewerFollowing?: boolean;
  };
  /** Comment count (community / list feeds). */
  commentCount?: number;
  /** Community context; omitted or null for profile posts. */
  community?: { slug: string; name: string } | null;
  /** Present when this post is pinned in its community feed (moderation). */
  pinnedAt?: string | null;
};
