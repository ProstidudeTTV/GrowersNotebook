import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "./profile-view";
import { apiFetch } from "@/lib/api-public";
import { isUuid } from "@/lib/is-uuid";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
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
  viewerHasBlocked?: boolean;
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

type ProfileNotebookRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  customStrainLabel: string | null;
  strain: { slug: string; name: string | null } | null;
  score: number;
};

type NotebooksResponse = {
  items: ProfileNotebookRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  if (!isUuid(userId)) return { title: "Profile" };
  try {
    const profile = await apiFetch<{
      displayName: string | null;
      description: string | null;
      profileFeedHiddenFromViewer?: boolean;
    }>(`/profiles/${userId}`, { timeoutMs: 10_000 });
    const display = profile.displayName?.trim() || "Grower";
    const description =
      profile.description?.trim() ||
      `${display}'s grower profile on ${SITE_NAME}.`;
    const hidden = profile.profileFeedHiddenFromViewer === true;
    return {
      title: display,
      description,
      robots: hidden ? { index: false, follow: false } : undefined,
      openGraph: {
        title: `${display} · ${SITE_NAME}`,
        description,
        url: canonicalPath(`/u/${userId}`),
      },
      alternates: { canonical: canonicalPath(`/u/${userId}`) },
    };
  } catch {
    return { title: "Profile" };
  }
}

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
  const activeTab =
    sp.tab === "comments"
      ? "comments"
      : sp.tab === "notebooks"
        ? "notebooks"
        : "posts";
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
  let notebooksPayload: NotebooksResponse | null = null;

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
  } else if (activeTab === "comments") {
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
  } else {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    try {
      notebooksPayload = await apiFetch<NotebooksResponse>(
        `/profiles/${userId}/notebooks?${qs.toString()}`,
        { token: token ?? undefined },
      );
    } catch {
      notebooksPayload = {
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
      notebooksPayload={notebooksPayload}
    />
  );
}
