"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostFeedList } from "@/components/post-feed-list";
import { apiFetch } from "@/lib/api-public";
import type { FeedPost } from "@/lib/feed-post";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export type { FeedPost } from "@/lib/feed-post";

type FeedResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

export function CommunityPostList({
  communitySlug,
  communityId,
  sort,
  page,
  initialItems,
}: {
  communitySlug: string;
  communityId: string;
  sort: "new" | "top";
  page: number;
  initialItems: FeedPost[];
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) return;
      const qs = new URLSearchParams({
        communityId,
        sort,
        page: String(page),
        pageSize: "20",
      });
      try {
        const feed = await apiFetch<FeedResponse>(`/posts?${qs.toString()}`, {
          token,
        });
        setItems(feed.items);
      } catch {
        /* keep SSR items */
      }
    })();
  }, [communityId, sort, page]);

  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)] px-4 py-6 text-center text-sm text-[var(--gn-text-muted)]">
        {page <= 1 ? (
          <>
            No posts in this community yet.{" "}
            <Link
              href={`/community/${communitySlug}/new`}
              className="font-medium text-[#ff4500] hover:underline"
            >
              Start the first one
            </Link>
            .
          </>
        ) : (
          "No posts on this page."
        )}
      </p>
    );
  }

  return <PostFeedList items={items} />;
}
