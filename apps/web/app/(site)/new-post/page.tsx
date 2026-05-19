import Link from "next/link";
import { redirect } from "next/navigation";
import { NewPostForm } from "@/app/(site)/community/[slug]/new/post-form";
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
  let cancelHref = `/u/${user.id}`;
  if (communitySlug) {
    try {
      const community = await apiFetch<{ id: string; name: string; slug: string }>(
        `/communities/${encodeURIComponent(communitySlug)}`,
      );
      communityId = community.id;
      communityName = community.name;
      cancelHref = `/community/${community.slug}`;
    } catch {
      /* profile post fallback */
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/u/${user.id}`}
          className="text-sm text-[var(--gn-accent)] hover:underline"
        >
          ← back to your profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--gn-text)]">
          {communityName
            ? `New post in ${communityName}`
            : "New post on your profile"}
        </h1>
        <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
          {communityName
            ? `Posting to r/${communitySlug}. Followers of this community will see it in their feeds.`
            : "This post appears on your profile and in followers' home feeds. Add ?community=slug to post in a community."}
        </p>
      </div>
      <NewPostForm communityId={communityId} cancelHref={cancelHref} />
    </main>
  );
}
