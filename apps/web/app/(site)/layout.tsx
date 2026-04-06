import { SiteChrome } from "@/components/site-chrome";
import type { SidebarCommunity, SidebarHotPost } from "@/components/app-sidebar";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);

  let followedCommunities: SidebarCommunity[] = [];
  if (token) {
    try {
      followedCommunities = await apiFetch<
        Array<{ id: string; slug: string; name: string }>
      >("/communities/me/following", { token });
    } catch {
      followedCommunities = [];
    }
  }

  let hotWeekPost: SidebarHotPost | null = null;
  try {
    const hotRes = await apiFetch<{
      items: Array<{ id: string; title: string; score: number }>;
    }>("/posts/hot/week?page=1&pageSize=1", {
      token: token ?? undefined,
    });
    const first = hotRes.items[0];
    hotWeekPost = first
      ? { id: first.id, title: first.title, score: first.score }
      : null;
  } catch {
    hotWeekPost = null;
  }

  return (
    <SiteChrome
      initialFollowedCommunities={followedCommunities}
      initialHotWeekPost={hotWeekPost}
      authed={!!token}
    >
      {children}
    </SiteChrome>
  );
}
