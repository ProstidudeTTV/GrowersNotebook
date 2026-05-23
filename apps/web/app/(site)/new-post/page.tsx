import { redirect } from "next/navigation";
import { NewPostForm } from "@/app/(site)/community/[slug]/new/post-form";
import { SitePageShell } from "@/components/site-page-shell";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/server";

export default async function NewProfilePostPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/new-post");
  }

  const sp = await searchParams;
  const communitySlug = sp.community?.trim();
  let communityId: string | undefined;
  let communityName: string | undefined;
  let communityIconKey: string | null | undefined;
  let cancelHref = `/u/${user.id}`;
  let headline = "Share your grow";
  let subheadline =
    "Photos first — your cover image is what people see in the feed.";

  if (communitySlug) {
    try {
      const community = await apiFetch<{
        id: string;
        name: string;
        slug: string;
        iconKey?: string | null;
      }>(`/communities/${encodeURIComponent(communitySlug)}`);
      communityId = community.id;
      communityName = community.name;
      communityIconKey = community.iconKey ?? null;
      cancelHref = `/community/${community.slug}`;
      headline = `Post in ${community.name}`;
      subheadline = `This goes to ${community.name} and followers' feeds.`;
    } catch {
      /* profile post fallback */
    }
  }

  return (
    <SitePageShell className="py-6 sm:py-10">
      <NewPostForm
        communityId={communityId}
        communitySlug={communitySlug}
        communityName={communityName}
        communityIconKey={communityIconKey}
        cancelHref={cancelHref}
        backHref={communitySlug ? cancelHref : `/u/${user.id}`}
        backLabel={
          communitySlug ? `Back to ${communityName ?? "community"}` : "Back to profile"
        }
        headline={headline}
        subheadline={subheadline}
      />
    </SitePageShell>
  );
}
