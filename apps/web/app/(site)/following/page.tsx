import type { Metadata } from "next";
import { FollowingFeed } from "@/components/following-feed";
import { FeedSidebar } from "@/components/feed-sidebar";
import { createClient } from "@/lib/supabase/server";
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

async function getGrowersOnline(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("growers_online_count");
    const n = typeof data === "number" ? data : Number(data ?? 0);
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
  } catch {
    return 0;
  }
}

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort === "top" ? "top" : "new";
  const page = Number(sp.page ?? 1) || 1;
  const growersOnline = await getGrowersOnline();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-text)]">
        Following
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Posts from growers you follow and communities you&apos;ve joined.
      </p>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <FollowingFeed sort={sort} page={page} />
        </div>
        <div className="w-full shrink-0 lg:w-72">
          <FeedSidebar growersOnline={growersOnline} />
        </div>
      </div>
    </main>
  );
}
