"use client";

import { useEffect } from "react";
import { recordRecentCommunityVisit } from "@/lib/recent-communities";

/** Records this community in sidebar “recent” (localStorage). */
export function RecentCommunitiesTracker({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  useEffect(() => {
    recordRecentCommunityVisit(slug, name);
  }, [slug, name]);

  return null;
}
