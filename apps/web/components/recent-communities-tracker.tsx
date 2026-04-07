"use client";

import { useEffect } from "react";
import { recordRecentCommunityVisit } from "@/lib/recent-communities";

/** Records this community in sidebar “recent” (localStorage). */
export function RecentCommunitiesTracker({
  slug,
  name,
  iconKey = null,
}: {
  slug: string;
  name: string;
  iconKey?: string | null;
}) {
  useEffect(() => {
    recordRecentCommunityVisit(slug, name, iconKey ?? null);
  }, [slug, name, iconKey]);

  return null;
}
