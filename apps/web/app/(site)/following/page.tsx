import { FollowingFeed } from "@/components/following-feed";

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort === "top" ? "top" : "new";
  const page = Number(sp.page ?? 1) || 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gn-text)]">
        Following
      </h1>
      <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
        Posts from growers you follow and communities you’ve joined—your
        personal front page.
      </p>
      <div className="mt-6">
        <FollowingFeed sort={sort} page={page} />
      </div>
    </main>
  );
}
