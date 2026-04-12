import type { Metadata } from "next";
import Link from "next/link";
import { CommunityIcon } from "@/components/community-icon";
import { GuestLanding } from "@/components/marketing/guest-landing";
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
};

function CommunityListRow({ community: c }: { community: Community }) {
  return (
    <Link
      href={`/community/${c.slug}`}
      className="group flex gap-4 py-5 transition-colors hover:bg-[color-mix(in_srgb,var(--gn-surface-elevated)_70%,transparent)]"
    >
      <CommunityIcon
        iconKey={c.iconKey}
        nameFallback={c.name}
        slugFallback={c.slug}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
      <h2 className="text-base font-semibold text-[#ff6a38] transition group-hover:text-[#ff7d4c] group-hover:drop-shadow-[0_0_12px_rgba(255,106,56,0.22)]">
        {c.name}
      </h2>
      {c.description?.trim() ? (
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--gn-text-muted)]">
          {c.description.trim()}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-[var(--gn-text-muted)]/80">
          No description yet.
        </p>
      )}
      </div>
    </Link>
  );
}

function CommunityColumn({ items }: { items: Community[] }) {
  return (
    <ul className="min-w-0 divide-y divide-[var(--gn-divide)]">
      {items.map((c) => (
        <li key={c.id} className="min-w-0">
          <CommunityListRow community={c} />
        </li>
      ))}
    </ul>
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
    return (
      <GuestLanding
        communities={communities}
        loadError={loadError}
        apiBase={apiBase}
        hostedDeploy={hostedProd}
        heroBlurb={
          publicCfg.seoDefaultDescription?.trim() || SITE_TAGLINE
        }
      />
    );
  }

  const mid = Math.ceil(communities.length / 2);
  const leftCommunities = communities.slice(0, mid);
  const rightCommunities = communities.slice(mid);
  const twoColumns = rightCommunities.length > 0;

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
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Could not load communities</p>
          <p className="mt-2 text-sm opacity-90">{loadError}</p>
          <ul className="mt-4 list-inside list-disc text-sm opacity-90">
            <li>
              Confirm the API service deploy succeeded and check service logs. Try{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                {apiBase || "(your API)"}/health
              </code>
              .
            </li>
            <li>
              Database schema must include required columns (e.g.{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                communities.icon_key
              </code>
              ). Apply Supabase migrations or run the SQL from{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                supabase/migrations/
              </code>{" "}
              on the project database, then redeploy or restart the API if needed.
            </li>
            <li>
              This page loads from{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                {apiBase || "(set NEXT_PUBLIC_API_URL)"}
              </code>
              — set{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                NEXT_PUBLIC_API_URL
              </code>{" "}
              on the web app to that API base URL, and ensure{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                DATABASE_URL
              </code>{" "}
              (with session pooler if your network cannot reach the direct DB host)
              is configured on the API.
            </li>
          </ul>
        </div>
      ) : null}
      {!loadError && communities.length === 0 ? (
        <p className="border-b border-dashed border-[var(--gn-divide)] py-10 text-center text-sm text-[var(--gn-text-muted)]">
          No communities yet. Create one via the API or seed your database after
          connecting Supabase and running migrations.
        </p>
      ) : null}
      {communities.length > 0 ? (
        twoColumns ? (
          <div className="grid grid-cols-1 border-t border-b border-[var(--gn-divide)] md:grid-cols-2 md:divide-x md:divide-[var(--gn-divide)]">
            <div className="min-w-0 md:pr-8">
              <CommunityColumn items={leftCommunities} />
            </div>
            <div className="min-w-0 border-t border-[var(--gn-divide)] md:border-t-0 md:pl-8">
              <CommunityColumn items={rightCommunities} />
            </div>
          </div>
        ) : (
          <div className="border-t border-b border-[var(--gn-divide)]">
            <CommunityColumn items={leftCommunities} />
          </div>
        )
      ) : null}
    </main>
  );
}
