import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
      className="gn-card block p-4 hover:shadow-[var(--gn-shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <CommunityIcon
          iconKey={c.iconKey}
          nameFallback={c.name}
          slugFallback={c.slug}
          frameClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--gn-text)] truncate flex-1">
              {c.name}
            </h2>
            <span className="shrink-0 text-sm text-[var(--gn-text-muted)]" aria-hidden>
              →
            </span>
          </div>
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
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gn-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--gn-accent)]">
                {c.memberCount.toLocaleString()} members
              </span>
            </div>
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

  // Logged-in users land on the community feed, not a bare directory
  redirect("/hot");

  // Unreachable — kept only so TS doesn't complain about missing return
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden>🌿</span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-text)]">
            Find Your Grow Tribe
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-[var(--gn-text-muted)]">
          Connect with growers who share your passion. Join a community to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loadError ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-surface-elevated)] ring-1 ring-[var(--gn-ring)]">
              <svg className="h-7 w-7 text-[var(--gn-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[var(--gn-text)] mb-1">Something went sideways</h3>
            <p className="text-sm text-[var(--gn-text-muted)] mb-5 max-w-xs mx-auto">Could not load communities right now. Please try again in a moment.</p>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110">
              Try again
            </Link>
          </div>
        ) : communities.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gn-accent)]/10 ring-1 ring-[var(--gn-accent)]/20">
              <svg className="h-7 w-7 text-[var(--gn-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[var(--gn-text)] mb-1">Plant your first seed</h3>
            <p className="text-sm text-[var(--gn-text-muted)] mb-5 max-w-xs mx-auto">
              No communities are set up yet. Join one to connect with fellow growers and share your journey.
            </p>
            <Link href="/community" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110">
              Browse Communities
            </Link>
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
