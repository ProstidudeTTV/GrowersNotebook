"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedPostCard } from "@/components/feed-post-card";
import type { FeedPost } from "@/lib/feed-post";

export function FeedPostCardList({
  items: initialItems,
  pinnedCommunity,
}: {
  items: FeedPost[];
  pinnedCommunity?: { slug: string; name: string; iconKey?: string | null };
}) {
  const [items, setItems] = useState(initialItems);

  const patchItem = useCallback((postId: string, patch: Partial<FeedPost>) => {
    setItems((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
    );
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  return (
    <div className="flex flex-col gap-4">
      {items.map((p) => (
        <FeedPostCard
          key={p.id}
          post={p}
          onPatch={patchItem}
          pinnedCommunity={pinnedCommunity}
        />
      ))}
    </div>
  );
}
