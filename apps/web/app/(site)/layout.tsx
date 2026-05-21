import { headers } from "next/headers";
import { SiteChrome } from "@/components/site-chrome";
import { SiteProviders } from "@/components/site-providers";
import type { SidebarCommunity, SidebarHotPost } from "@/components/app-sidebar";
import { SiteMaintenancePage } from "@/components/site-maintenance-page";
import { apiFetch } from "@/lib/api-public";
import { getPublicSiteConfigCached } from "@/lib/public-site-config-server";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

/** Bound sidebar data fetches so a cold API cannot block the document for minutes. */
const SIDEBAR_API_TIMEOUT_MS = 12_000;

export default async function SiteLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const pathname =
    (await headers()).get("x-gn-pathname") ?? "";
  const maintenanceExempt =
    pathname.startsWith("/login") || pathname.startsWith("/auth/");

  const [publicSiteConfig, followingRows, hotRes, profileMe] =
    await Promise.all([
    getPublicSiteConfigCached(),
    token
      ? apiFetch<
          Array<{
            id: string;
            slug: string;
            name: string;
            iconKey?: string | null;
            iconUrl?: string | null;
          }>
        >("/communities/me/following", {
          token,
          timeoutMs: SIDEBAR_API_TIMEOUT_MS,
        }).catch(
          () =>
            [] as Array<{
              id: string;
              slug: string;
              name: string;
              iconKey?: string | null;
              iconUrl?: string | null;
            }>,
        )
      : Promise.resolve(
          [] as Array<{
            id: string;
            slug: string;
            name: string;
            iconKey?: string | null;
            iconUrl?: string | null;
          }>,
        ),
    apiFetch<{
      items: Array<{ id: string; title: string; score: number }>;
    }>("/posts/hot/week?page=1&pageSize=3", {
      token: token ?? undefined,
      timeoutMs: SIDEBAR_API_TIMEOUT_MS,
    }).catch(() => ({
      items: [] as Array<{ id: string; title: string; score: number }>,
    })),
    token
      ? apiFetch<{
          id: string;
          role: string;
          displayName: string | null;
          avatarUrl: string | null;
        }>("/profiles/me", {
          token,
          timeoutMs: SIDEBAR_API_TIMEOUT_MS,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const profileRole = profileMe?.role ?? null;
  const staff =
    profileRole === "owner" ||
    profileRole === "admin" ||
    profileRole === "moderator";
  if (
    publicSiteConfig.maintenanceEnabled &&
    !staff &&
    !maintenanceExempt
  ) {
    return (
      <SiteMaintenancePage
        message={publicSiteConfig.maintenanceMessage}
      />
    );
  }

  const followedCommunities: SidebarCommunity[] = followingRows;
  const hotWeekPosts: SidebarHotPost[] = hotRes.items.slice(0, 3).map((p) => ({
    id: p.id,
    title: p.title,
    score: p.score,
  }));

  return (
    <SiteProviders
      initialAuth={{
        userId: profileMe?.id ?? authUser?.id ?? null,
        email: authUser?.email ?? null,
        displayName: profileMe?.displayName?.trim() || null,
        avatarUrl: profileMe?.avatarUrl?.trim() || null,
        role: profileRole,
      }}
    >
      <SiteChrome
        initialFollowedCommunities={followedCommunities}
        initialHotWeekPosts={hotWeekPosts}
        modal={modal}
        motdText={publicSiteConfig.motdText}
        announcement={publicSiteConfig.announcement}
        mailingListNudgeRecommended={
          publicSiteConfig.mailingListNudgeRecommended ?? false
        }
      >
        {children}
      </SiteChrome>
    </SiteProviders>
  );
}
