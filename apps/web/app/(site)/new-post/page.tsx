import Link from "next/link";
import { redirect } from "next/navigation";
import { NewPostForm } from "@/app/(site)/community/[slug]/new/post-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewProfilePostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/new-post");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/u/${user.id}`}
          className="text-sm text-[#ff4500] hover:underline"
        >
          ← back to your profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--gn-text)]">
          New post on your profile
        </h1>
        <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
          This post appears on your profile and in followers&apos; home feeds.
          To post in a community, open that community and choose New post.
        </p>
      </div>
      <NewPostForm cancelHref={`/u/${user.id}`} />
    </main>
  );
}
