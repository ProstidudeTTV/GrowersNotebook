import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-public";
import { isUuid } from "@/lib/is-uuid";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
import { PostView } from "./post-view";
import type { PostMediaItem } from "@/lib/feed-post";

type PostDetail = {
  id: string;
  title: string;
  bodyHtml: string;
  bodyJson?: Record<string, unknown>;
  media?: PostMediaItem[];
  createdAt: string;
  score: number;
  upvotes: number;
  downvotes: number;
  viewerVote: number | null;
  commentCount?: number;
  community?: { slug: string; name: string } | null;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl?: string | null;
    seeds: number;
    growerLevel: string;
    viewerFollowing?: boolean;
  };
};

type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  imageUrls?: string[];
  createdAt: string;
  upvotes: number;
  downvotes: number;
  score: number;
  viewerVote: number | null;
  author: {
    id: string;
    displayName: string | null;
    seeds: number;
    growerLevel: string;
  };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Post" };
  try {
    const post = await apiFetch<{ title: string }>(`/posts/${id}`, {
      timeoutMs: 10_000,
    });
    const title = post.title?.trim() || "Post";
    const description = `${title} — cannabis home grow discussion on ${SITE_NAME}.`;
    return {
      title,
      description,
      openGraph: {
        title: `${title} · ${SITE_NAME}`,
        description,
        type: "article",
        url: canonicalPath(`/p/${id}`),
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} · ${SITE_NAME}`,
        description,
      },
      alternates: { canonical: canonicalPath(`/p/${id}`) },
    };
  } catch {
    return { title: "Post" };
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let post: PostDetail;
  try {
    post = await apiFetch<PostDetail>(`/posts/${id}`);
  } catch {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-[var(--gn-text-muted)]">Post not found.</p>
        <Link href="/" className="text-[#ff4500] hover:underline">
          Home
        </Link>
      </main>
    );
  }

  let comments: CommentRow[] = [];
  let commentsFetchFailed = false;
  try {
    comments = await apiFetch<CommentRow[]>(`/posts/${id}/comments`);
  } catch {
    commentsFetchFailed = true;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-8">
      <PostView
        initialPost={post}
        initialComments={comments}
        commentsFetchFailed={commentsFetchFailed}
      />
    </main>
  );
}
