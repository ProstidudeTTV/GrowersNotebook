import { headers } from "next/headers";
import { SiteChrome } from "@/components/site-chrome";
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
  const pathname =
    (await headers()).get("x-gn-pathname") ?? "";
  const maintenanceExempt =
    pathname.startsWith("/login") || pathname.startsWith("/auth/");

  const [publicSiteConfig, followingRows, hotRes, profileRole] =
    await Promise.all([
    getPublicSiteConfigCached(),
    token
      ? apiFetch<
          Array<{
            id: string;
            slug: string;
            name: string;
            iconKey?: string | null;
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
            }>,
        )
      : Promise.resolve(
          [] as Array<{
            id: string;
            slug: string;
            name: string;
            iconKey?: string | null;
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
      ? apiFetch<{ role: string }>("/profiles/me", {
          token,
          timeoutMs: SIDEBAR_API_TIMEOUT_MS,
        })
          .then((p) => p.role)
          .catch(() => null as string | null)
      : Promise.resolve(null as string | null),
  ]);

  const staff =
    profileRole === "admin" || profileRole === "moderator";
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
    <SiteChrome
      initialFollowedCommunities={followedCommunities}
      initialHotWeekPosts={hotWeekPosts}
      authed={!!token}
      modal={modal}
      motdText={publicSiteConfig.motdText}
      announcement={publicSiteConfig.announcement}
      mailingListNudgeRecommended={
        publicSiteConfig.mailingListNudgeRecommended ?? false
      }
    >
      {children}
    </SiteChrome>
  );
}
