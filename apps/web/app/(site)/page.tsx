import type { Metadata } from "next";
import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import {
  GuestLanding,
  type GuestLandingHotPost,
} from "@/components/marketing/guest-landing";
import { apiFetch } from "@/lib/api-public";
import { getPublicApiUrl } from "@/lib/public-api-url";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { createClient } from "@/lib/supabase/server";
import { isLikelyHostedRenderDeploy } from "@/lib/deploy-context";
import { getPublicSiteConfigCached } from "@/lib/public-site-config-server";
import {
  SITE_NAME,
  SITE_TAGLINE,
  canonicalPath,
  defaultSiteMetadata,
  mergeMetadataWithPublicConfig,
} from "@/lib/site-config";

/** Shape of items returned by `GET /posts/hot/week` that we surface on the guest hero. */
type HotPostApiItem = {
  id: string;
  title: string;
  media?: { url: string; type: "image" | "video" }[] | null;
  score?: number | null;
  author?: { displayName?: string | null } | null;
  community?: { slug?: string | null; name?: string | null } | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Calls the SECURITY DEFINER RPC; returns 0 on any failure so the badge always renders. */
async function fetchGrowersOnline(
  supabase: SupabaseServerClient,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("growers_online_count");
    if (error) return 0;
    const value = typeof data === "number" ? data : Number(data);
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  } catch {
    return 0;
  }
}

/** Server-side fetch of the top hot posts; returns [] on any failure (page still renders mock cards). */
async function fetchGuestHeroHotPosts(): Promise<GuestLandingHotPost[]> {
  let base: string;
  try {
    base = getPublicApiUrl();
  } catch {
    base =
      process.env.API_URL?.trim().replace(/\/+$/, "") ?? "http://localhost:3001";
  }
  try {
    const res = await fetch(`${base}/posts/hot/week?pageSize=2`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as { items?: HotPostApiItem[] };
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items.slice(0, 2).map((p): GuestLandingHotPost => {
      const firstImage = (p.media ?? []).find(
        (m) => m && typeof m.url === "string" && m.type === "image",
      );
      const author = p.author?.displayName?.trim();
      return {
        id: p.id,
        title: p.title,
        imageUrl: firstImage?.url ?? null,
        score: typeof p.score === "number" ? p.score : Number(p.score ?? 0),
        authorName: author && author.length > 0 ? author : "A grower",
        communityName: p.community?.name ?? null,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Home used to export static metadata, which overrode root `generateMetadata` and ignored admin SEO.
 * Use `title.absolute` so the root layout’s `%s · Site` template is not appended to the home `<title>`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getPublicSiteConfigCached();
  const defaults = defaultSiteMetadata();
  const base: Metadata = {
    ...defaults,
    title: "Cannabis home grower communities",
    description: SITE_TAGLINE,
    openGraph: {
      ...defaults.openGraph,
      title: `Cannabis home grower communities · ${SITE_NAME}`,
      description: SITE_TAGLINE,
      url: canonicalPath("/"),
    },
    twitter: {
      ...defaults.twitter,
      title: `Cannabis home grower communities · ${SITE_NAME}`,
      description: SITE_TAGLINE,
    },
    alternates: { canonical: canonicalPath("/") },
  };
  const merged = mergeMetadataWithPublicConfig(base, cfg);
  const fromAdmin = cfg.seoDefaultTitle?.trim();
  const fromMergedDefault =
    typeof merged.title === "object" &&
    merged.title !== null &&
    "default" in merged.title
      ? String((merged.title as { default: string }).default).trim()
      : "";
  const absoluteTitle = (fromAdmin || fromMergedDefault || "Cannabis home grower communities").trim();
  return { ...merged, title: { absolute: absoluteTitle } };
}

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey?: string | null;
  memberCount?: number | null;
};

function CommunityCard({ community: c }: { community: Community }) {
  return (
    <Link
      href={`/community/${c.slug}`}
      className="gn-card block p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <CommunityIcon
          iconKey={c.iconKey}
          nameFallback={c.name}
          slugFallback={c.slug}
          frameClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[var(--gn-text)] truncate">
            {c.name}
          </h2>
          {c.description?.trim() ? (
            <p className="text-sm text-[var(--gn-text-muted)] line-clamp-2 mt-1">
              {c.description.trim()}
            </p>
          ) : (
            <p className="text-sm italic text-[var(--gn-text-muted)]/70 mt-1">
              No description yet.
            </p>
          )}
          {c.memberCount != null && c.memberCount > 0 ? (
            <p className="text-xs text-[var(--gn-text-excerpt)] mt-2">
              {c.memberCount.toLocaleString()} members
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const publicCfg = await getPublicSiteConfigCached();
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);

  let communities: Community[] = [];
  let loadError: string | null = null;
  try {
    communities = await apiFetch<Community[]>("/communities");
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not reach the API (unknown error).";
    communities = [];
  }

  let apiBase: string;
  try {
    apiBase = getPublicApiUrl();
  } catch {
    apiBase = "";
  }

  const hostedProd = isLikelyHostedRenderDeploy();

  if (!token) {
    const [growersOnline, hotPosts] = await Promise.all([
      fetchGrowersOnline(supabase),
      fetchGuestHeroHotPosts(),
    ]);

    return (
      <GuestLanding
        communities={communities}
        loadError={loadError}
        apiBase={apiBase}
        hostedDeploy={hostedProd}
        heroBlurb={
          publicCfg.seoDefaultDescription?.trim() || SITE_TAGLINE
        }
        growersOnline={growersOnline}
        hotPosts={hotPosts}
      />
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#ff6a38]">
          Communities
        </h1>
        <p className="mt-2 text-[var(--gn-text-muted)]">
          A space for home growers to share their knowledge and experiences. Growers Notebook is a community-driven platform for sharing tips, tricks, and experiences with other home growers.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loadError ? (
          <div className="col-span-full text-center py-12 gn-panel rounded-2xl">
            <div className="text-4xl mb-3">🌿</div>
            <h3 className="font-semibold text-[var(--gn-text)] mb-2">Something went sideways</h3>
            <p className="text-sm text-[var(--gn-text-muted)] mb-4">Could not load your communities right now.</p>
            <a href="/" className="inline-block bg-[#ff6a38] text-white hover:bg-[#ff7d4c] font-medium px-4 py-2 rounded-full text-sm transition-colors">Try again</a>
          </div>
        ) : communities.length === 0 ? (
          <div className="col-span-full text-center py-12 gn-panel rounded-2xl">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="font-semibold text-[var(--gn-text)] mb-2">Plant your first seed</h3>
            <p className="text-sm text-[var(--gn-text-muted)] mb-4">Join a community to see their posts in your feed.</p>
            <a href="/community" className="inline-block bg-[#ff6a38] text-white hover:bg-[#ff7d4c] font-medium px-4 py-2 rounded-full text-sm transition-colors">Browse Communities</a>
          </div>
        ) : (
          communities.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))
        )}
      </div>
    </main>
  );
}
