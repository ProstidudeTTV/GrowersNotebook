import { SiteChrome } from "@/components/site-chrome";
import type {
  SidebarCommunity,
  SidebarHotNotebook,
  SidebarHotPost,
} from "@/components/app-sidebar";
import { apiFetch } from "@/lib/api-public";
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

  const [followingRows, hotRes, hotNotebooksRes] = await Promise.all([
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
    }>("/posts/hot/week?page=1&pageSize=1", {
      token: token ?? undefined,
      timeoutMs: SIDEBAR_API_TIMEOUT_MS,
    }).catch(() => ({ items: [] as Array<{ id: string; title: string; score: number }> })),
    apiFetch<{
      items: Array<{ id: string; title: string; score: number }>;
    }>("/notebooks?page=1&pageSize=3&sort=hot", {
      token: token ?? undefined,
      timeoutMs: SIDEBAR_API_TIMEOUT_MS,
    }).catch(() => ({
      items: [] as Array<{ id: string; title: string; score: number }>,
    })),
  ]);

  const followedCommunities: SidebarCommunity[] = followingRows;
  const first = hotRes.items[0];
  const hotWeekPost: SidebarHotPost | null = first
    ? { id: first.id, title: first.title, score: first.score }
    : null;

  const hotNotebooks: SidebarHotNotebook[] = hotNotebooksRes.items.map(
    (n) => ({
      id: n.id,
      title: n.title,
      score: n.score,
    }),
  );

  return (
    <SiteChrome
      initialFollowedCommunities={followedCommunities}
      initialHotWeekPost={hotWeekPost}
      initialHotNotebooks={hotNotebooks}
      authed={!!token}
      modal={modal}
    >
      {children}
    </SiteChrome>
  );
}
