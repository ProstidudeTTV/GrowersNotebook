export type PostMediaItem = { url: string; type: "image" | "video" };

/** Shape returned by `GET /posts` and `GET /posts/following`. */
export type FeedPost = {
  id: string;
  title: string;
  excerpt: string | null;
  media?: PostMediaItem[];
  createdAt: string;
  score: number;
  upvotes: number;
  downvotes: number;
  viewerVote: number | null;
  author: {
    id: string;
    displayName: string | null;
    seeds: number;
    growerLevel: string;
    viewerFollowing?: boolean;
  };
  /** Community context; omitted or null for profile posts. */
  community?: { slug: string; name: string } | null;
  /** Present when this post is pinned in its community feed (moderation). */
  pinnedAt?: string | null;
};
