import type { Metadata } from "next";
import Link from "next/link";
import { GuestLanding } from "@/components/marketing/guest-landing";
import { apiFetch } from "@/lib/api-public";
import { getPublicApiUrl } from "@/lib/public-api-url";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { createClient } from "@/lib/supabase/server";
import {
  SITE_NAME,
  SITE_TAGLINE,
  canonicalPath,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Cannabis home grower communities",
  description: SITE_TAGLINE,
  openGraph: {
    title: `Cannabis home grower communities · ${SITE_NAME}`,
    description: SITE_TAGLINE,
    url: canonicalPath("/"),
  },
  alternates: { canonical: canonicalPath("/") },
};

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

function CommunityListRow({ community: c }: { community: Community }) {
  return (
    <Link
      href={`/community/${c.slug}`}
      className="group block py-5 transition-colors hover:bg-[color-mix(in_srgb,var(--gn-surface-elevated)_70%,transparent)]"
    >
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

  if (!token) {
    return (
      <GuestLanding
        communities={communities}
        loadError={loadError}
        apiBase={apiBase}
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
              Start web + API (from repo root:{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                npm run dev
              </code>
              ; needs{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                npm run install:all
              </code>{" "}
              first if deps are missing).
            </li>
            <li>
              Point it at your Supabase DB: set{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                DATABASE_URL
              </code>{" "}
              in{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                apps/api/.env
              </code>{" "}
              (see apps/api/.env.example).
            </li>
            <li>
              This page loads data from{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                {apiBase}
              </code>
              — match{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                NEXT_PUBLIC_API_URL
              </code>{" "}
              in apps/web/.env.local if needed.
            </li>
            <li>
              <strong>Supabase + Windows / IPv4:</strong> the direct host{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                {"db.<project-ref>.supabase.co"}
              </code>{" "}
              is often IPv6-only and fails with{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                ENOTFOUND
              </code>
              . In the Supabase dashboard use{" "}
              <strong>Connect → Session pooler</strong> and set that full URI as{" "}
              <code className="rounded bg-black/10 px-1 dark:bg-white/10">
                DATABASE_URL
              </code>{" "}
              in <code className="rounded bg-black/10 px-1 dark:bg-white/10">apps/api/.env</code>
              , then restart the API.
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
