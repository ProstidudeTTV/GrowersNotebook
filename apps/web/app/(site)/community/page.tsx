import type { Metadata } from "next";
import Link from "next/link";
import { SitePageShell } from "@/components/site-page-shell";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
import {
  CommunitiesDirectoryClient,
  type CommunityDirectoryItem,
} from "./communities-directory-client";

export const metadata: Metadata = {
  title: "Communities",
  description: `Browse all grow communities on ${SITE_NAME}. Find your tribe, share your grows, and learn from fellow home growers.`,
  openGraph: {
    title: `Communities · ${SITE_NAME}`,
    url: canonicalPath("/community"),
  },
  alternates: { canonical: canonicalPath("/community") },
};

export default async function CommunityDirectoryPage() {
  let communities: CommunityDirectoryItem[] = [];
  let loadError: string | null = null;

  try {
    communities = await apiFetch<CommunityDirectoryItem[]>("/communities");
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load communities right now.";
  }

  const heroBanner = (
    <div
      className="relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16 lg:text-left"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--gn-accent) 35%, #050a08 65%) 0%, color-mix(in srgb, var(--gn-accent) 12%, #070e06 88%) 50%, color-mix(in srgb, #0d9488 20%, #050a08 80%) 100%)",
      }}
    >
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--gn-accent)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-[var(--gn-container-max)] lg:mx-0 lg:max-w-3xl lg:px-[var(--gn-gutter)]">
        <div className="mb-3 text-4xl">🌿</div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Find Your Grow Tribe
        </h1>
        <p className="mt-3 max-w-md text-base text-white/70">
          Join a community of passionate home growers. Share your grows, swap
          tips, and thrive together.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/hot"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/20"
          >
            🔥 What&apos;s Hot
          </Link>
          <Link
            href="/following"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--gn-accent)] px-5 py-2.5 text-sm font-bold text-[var(--gn-on-accent)] shadow-lg shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--gn-accent)_45%,transparent)] transition hover:brightness-110"
          >
            My Feed →
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <SitePageShell banner={heroBanner} className="pb-16">
      {loadError ? (
        <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-12 text-center">
          <h3 className="text-base font-bold text-[var(--gn-text)]">
            Something went sideways
          </h3>
          <p className="mt-1 text-sm text-[var(--gn-text-muted)]">{loadError}</p>
          <Link
            href="/community"
            className="mt-5 inline-flex rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-semibold text-[var(--gn-on-accent)] hover:brightness-110"
          >
            Try again
          </Link>
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-8 py-16 text-center">
          <div className="mb-4 text-5xl">🌱</div>
          <h3 className="text-lg font-bold text-[var(--gn-text)]">
            Plant your first seed
          </h3>
          <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
            No communities yet — check back soon.
          </p>
        </div>
      ) : (
        <CommunitiesDirectoryClient communities={communities} />
      )}
    </SitePageShell>
  );
}
