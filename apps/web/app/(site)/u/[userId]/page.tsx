import { notFound } from "next/navigation";
import { ProfileView } from "./profile-view";
import { apiFetch } from "@/lib/api-public";
import { isUuid } from "@/lib/is-uuid";
import type { FeedPost } from "@/lib/feed-post";
import type { ProfileCommentRow } from "@/components/profile-comments-list";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type PublicProfile = {
  id: string;
  displayName: string | null;
  description: string | null;
  avatarUrl: string | null;
  seeds: number | null;
  growerLevel: string | null;
  viewerFollowing: boolean;
  profileFeedHiddenFromViewer?: boolean;
};

type FeedResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

type CommentsResponse = {
  items: ProfileCommentRow[];
  total: number;
  page: number;
  pageSize: number;
};

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string; sort?: string; page?: string }>;
}) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  const sp = await searchParams;
  const activeTab = sp.tab === "comments" ? "comments" : "posts";
  const sort = sp.sort === "top" ? "top" : "new";
  const page = Number(sp.page ?? 1) || 1;

  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);

  let profile: PublicProfile;
  try {
    profile = await apiFetch<PublicProfile>(`/profiles/${userId}`, {
      token: token ?? undefined,
    });
  } catch {
    notFound();
  }

  let postsPayload: FeedResponse | null = null;
  let commentsPayload: CommentsResponse | null = null;

  if (activeTab === "posts") {
    const qs = new URLSearchParams({
      sort,
      page: String(page),
      pageSize: "20",
    });
    try {
      postsPayload = await apiFetch<FeedResponse>(
        `/profiles/${userId}/posts?${qs.toString()}`,
        { token: token ?? undefined },
      );
    } catch {
      postsPayload = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
    }
  } else {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    try {
      commentsPayload = await apiFetch<CommentsResponse>(
        `/profiles/${userId}/comments?${qs.toString()}`,
        { token: token ?? undefined },
      );
    } catch {
      commentsPayload = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };
    }
  }

  return (
    <ProfileView
      profile={profile}
      tab={activeTab}
      sort={sort}
      postsPayload={postsPayload}
      commentsPayload={commentsPayload}
    />
  );
}
