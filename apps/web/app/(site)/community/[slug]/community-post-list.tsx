"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { FeedPostCardList } from "@/components/feed-post-card-list";
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
  communityName,
  communityIconKey,
  sort,
  page,
  initialItems,
}: {
  communitySlug: string;
  communityId: string;
  communityName: string;
  communityIconKey?: string | null;
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
    if (page <= 1) {
      return (
        <EmptyState
          title="No posts yet"
          description="Be the first to share something in this community."
          action={{
            label: "Start the first post",
            href: `/community/${communitySlug}/new`,
          }}
          icon="🌱"
        />
      );
    }
    return (
      <EmptyState
        title="No posts on this page"
        description="Try an earlier page or switch sort order."
      />
    );
  }

  return (
    <FeedPostCardList
      items={items}
      pinnedCommunity={{
        slug: communitySlug,
        name: communityName,
        iconKey: communityIconKey ?? null,
      }}
    />
  );
}
