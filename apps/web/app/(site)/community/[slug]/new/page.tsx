import Link from "next/link";
import { apiFetch } from "@/lib/api-public";
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
  let community: Community;
  try {
    community = await apiFetch<Community>(`/communities/${slug}`);
  } catch {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p>Community not found.</p>
        <Link href="/" className="text-[#ff4500] hover:underline">
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
          className="text-sm text-[#ff4500] hover:underline"
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
