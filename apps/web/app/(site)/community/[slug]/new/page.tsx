import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/server";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import { NewPostForm } from "./post-form";

type Community = {
  id: string;
  slug: string;
  name: string;
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p>Community not found.</p>
        <Link href="/" className="text-[var(--gn-accent)] hover:underline">
          Home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/community/${slug}`}
          className="text-sm text-[var(--gn-accent)] hover:underline"
        >
          ← Back to {community.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--gn-text)]">
          New post in {community.name}
        </h1>
      </div>
      <NewPostForm
        communityId={community.id}
        cancelHref={`/community/${slug}`}
      />
    </main>
  );
}
