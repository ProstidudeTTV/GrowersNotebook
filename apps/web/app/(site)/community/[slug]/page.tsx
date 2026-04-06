import type { Metadata } from "next";
import Link from "next/link";
import { FollowCommunityButton } from "@/components/follow-buttons";
import { RecentCommunitiesTracker } from "@/components/recent-communities-tracker";
import { apiFetch } from "@/lib/api-public";
import { SITE_NAME, canonicalPath } from "@/lib/site-config";
import {
  CommunityPostList,
  type FeedPost,
} from "./community-post-list";

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type PostListResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const safeSlug = slug?.trim();
  if (!safeSlug) return { title: "Community" };
  try {
    const community = await apiFetch<{
      name: string;
      description: string | null;
    }>(`/communities/${encodeURIComponent(safeSlug)}`, {
      timeoutMs: 10_000,
    });
    const name = community.name?.trim() || safeSlug;
    const description =
      community.description?.trim() ||
      `${name} — cannabis home grow community on ${SITE_NAME}.`;
    return {
      title: name,
      description,
      openGraph: {
        title: `${name} · ${SITE_NAME}`,
        description,
        url: canonicalPath(`/community/${safeSlug}`),
      },
      alternates: { canonical: canonicalPath(`/community/${safeSlug}`) },
    };
  } catch {
    return { title: "Community" };
  }
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = sp.sort === "top" ? "top" : "new";
  const page = Number(sp.page ?? 1) || 1;

  let community: Community;
  try {
    community = await apiFetch<Community>(`/communities/${slug}`);
  } catch {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-[var(--gn-text-muted)]">Community not found.</p>
        <Link href="/" className="mt-4 inline-block text-[#ff4500] hover:underline">
          ← Home
        </Link>
      </main>
    );
  }

  const qs = new URLSearchParams({
    communityId: community.id,
    sort,
    page: String(page),
    pageSize: "20",
  });
  let feed: PostListResponse = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  };
  try {
    feed = await apiFetch<PostListResponse>(`/posts?${qs.toString()}`);
  } catch {
    feed = { items: [], total: 0, page: 1, pageSize: 20 };
  }

  const sortLink = (s: "new" | "top") => {
    const p = new URLSearchParams({ sort: s, page: "1" });
    return `/community/${slug}?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <RecentCommunitiesTracker slug={community.slug} name={community.name} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--gn-text)]">
            {community.name}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--gn-text-muted)]">
            {community.slug}
          </p>
          <p className="mt-1 text-[var(--gn-text-muted)]">
            {community.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <FollowCommunityButton communityId={community.id} slug={slug} />
          <Link
            href={`/community/${slug}/new`}
            className="rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_14px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414] hover:shadow-[0_4px_28px_rgba(255,69,0,0.45)]"
          >
            New post
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2 text-sm font-medium">
        <Link
          href={sortLink("new")}
          className={
            sort === "new"
              ? "rounded-full bg-[#ff4500] px-3 py-1 text-white shadow-[0_0_16px_rgba(255,69,0,0.35)]"
              : "rounded-full border-2 border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-hover)]"
          }
        >
          New
        </Link>
        <Link
          href={sortLink("top")}
          className={
            sort === "top"
              ? "rounded-full bg-[#ff4500] px-3 py-1 text-white shadow-[0_0_16px_rgba(255,69,0,0.35)]"
              : "rounded-full border-2 border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-hover)]"
          }
        >
          Top
        </Link>
      </div>

      <CommunityPostList
        communitySlug={slug}
        communityId={community.id}
        sort={sort}
        page={page}
        initialItems={feed.items}
      />

      {feed.total > feed.pageSize ? (
        <div className="mt-6 flex justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              className="text-[#ff4500] hover:underline"
              href={`/community/${slug}?sort=${sort}&page=${page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {page * feed.pageSize < feed.total ? (
            <Link
              className="text-[#ff4500] hover:underline"
              href={`/community/${slug}?sort=${sort}&page=${page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
