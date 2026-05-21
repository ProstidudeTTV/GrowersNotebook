import Link from "next/link";
import { redirect } from "next/navigation";
import { SitePageShell } from "@/components/site-page-shell";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { NewPostForm } from "./post-form";

type Community = {
  id: string;
  slug: string;
  name: string;
  iconKey?: string | null;
};

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const token = await getAccessTokenForApi(supabase);
  if (!token) {
    redirect(`/login?next=${encodeURIComponent(`/community/${slug}/new`)}`);
  }
  let community: Community;
  try {
    community = await apiFetch<Community>(`/communities/${slug}`);
  } catch {
    return (
      <SitePageShell className="py-10">
        <p className="text-[var(--gn-text)]">Community not found.</p>
        <Link href="/community" className="mt-2 inline-block text-[var(--gn-accent)] hover:underline">
          Browse communities
        </Link>
      </SitePageShell>
    );
  }

  return (
    <SitePageShell className="py-6 sm:py-10">
      <NewPostForm
        communityId={community.id}
        communitySlug={community.slug}
        communityName={community.name}
        communityIconKey={community.iconKey ?? null}
        cancelHref={`/community/${slug}`}
        backHref={`/community/${slug}`}
        backLabel={`Back to ${community.name}`}
        headline={`Post in ${community.name}`}
        subheadline="Your first photo is the feed cover. Add a title or caption so other growers know what they're looking at."
      />
    </SitePageShell>
  );
}
