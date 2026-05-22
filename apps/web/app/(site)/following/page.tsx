import type { Metadata } from "next";
import Link from "next/link";
import { FollowingFeed } from "@/components/following-feed";
import { FeedSidebar } from "@/components/feed-sidebar";
import { PostComposerPrompt } from "@/components/post-composer-prompt";
import { SitePageShell } from "@/components/site-page-shell";
import { createClient } from "@/lib/supabase/server";
import { fetchGrowersOnlineCount } from "@/lib/growers-online";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Following",
  description: `Posts from growers and communities you follow on ${SITE_NAME}.`,
  openGraph: {
    title: `Following · ${SITE_NAME}`,
    url: canonicalPath("/following"),
  },
  alternates: { canonical: canonicalPath("/following") },
};

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort === "top" ? "top" : "new";
  const page = Number(sp.page ?? 1) || 1;
  const supabase = await createClient();
  const growersOnline = await fetchGrowersOnlineCount(supabase);

  const banner = (
    <div className="relative overflow-hidden border-b border-[var(--gn-divide)] bg-gradient-to-r from-[var(--gn-surface-raised)] via-[var(--gn-surface-elevated)] to-[var(--gn-surface-raised)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-[var(--gn-accent)]/5 blur-3xl" />
      <div className="relative mx-auto flex max-w-[var(--gn-container-max)] flex-wrap items-center justify-between gap-4 px-[var(--gn-gutter-mobile)] sm:px-[var(--gn-gutter)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gn-accent)]/15 text-xl">
              📡
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--gn-text)]">
              Your Feed
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
            Posts from growers you follow and communities you&apos;ve joined.
          </p>
        </div>
        <Link
          href="/community"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] hover:border-[var(--gn-accent)]/30"
        >
          🌿 Discover Communities
        </Link>
      </div>
    </div>
  );

  return (
    <SitePageShell banner={banner} className="pb-16">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PostComposerPrompt />
          <FollowingFeed sort={sort} page={page} />
        </div>
        <div className="w-full shrink-0 lg:w-72">
          <FeedSidebar growersOnline={growersOnline} />
        </div>
      </div>
    </SitePageShell>
  );
}
