import type { Metadata } from "next";
import Link from "next/link";
import { FollowCommunityButton } from "@/components/follow-buttons";
import { RecentCommunitiesTracker } from "@/components/recent-communities-tracker";
import { CommunityIcon } from "@/components/community-icon";
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
  iconKey?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  memberCount?: number | null;
  rules?: string[] | null;
  createdAt?: string | null;
};

type PostListResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatMemberCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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
        <Link href="/" className="mt-4 inline-block text-[var(--gn-accent)] hover:underline">
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

  const hasBanner = Boolean(community.bannerUrl);
  const hasMemberCount =
    typeof community.memberCount === "number" && community.memberCount >= 0;
  const hasRules =
    Array.isArray(community.rules) && community.rules.length > 0;
  const createdFormatted = formatDate(community.createdAt);

  return (
    <main className="mx-auto max-w-5xl pb-12">
      <RecentCommunitiesTracker
        slug={community.slug}
        name={community.name}
        iconKey={community.iconKey ?? null}
      />

      {/* ── Full-bleed banner ────────────────────────────────────────── */}
      <div className="relative h-48 w-full overflow-hidden sm:h-64">
        {hasBanner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.bannerUrl!}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, var(--gn-accent) 60%, #1a1a2e 40%) 0%, color-mix(in srgb, var(--gn-accent) 25%, #0f0f1a 75%) 100%)`,
            }}
          />
        )}
        {/* Gradient overlay — bottom fade for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Community identity at bottom of banner */}
        <div className="absolute bottom-0 left-0 flex items-end gap-4 px-5 pb-5">
          {community.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.iconUrl}
              alt={community.name}
              className="h-16 w-16 shrink-0 rounded-2xl border-4 border-white/20 bg-black/30 object-cover shadow-xl sm:h-20 sm:w-20"
            />
          ) : (
            <CommunityIcon
              iconKey={community.iconKey}
              nameFallback={community.name}
              slugFallback={community.slug}
              frameClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-white/20 bg-black/40 text-white text-2xl font-bold shadow-xl sm:h-20 sm:w-20"
            />
          )}
          <div className="min-w-0 pb-0.5">
            <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-md sm:text-3xl">
              {community.name}
            </h1>
            <p className="text-sm font-medium text-white/70">
              r/{community.slug}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats + action bar ───────────────────────────────────────── */}
      <div className="border-b border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--gn-text-muted)]">
            {hasMemberCount && (
              <span className="flex items-center gap-1.5">
                <span className="text-base">👥</span>
                <strong className="text-[var(--gn-text)]">
                  {formatMemberCount(community.memberCount!)}
                </strong>{" "}
                members
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-base">📝</span>
              <strong className="text-[var(--gn-text)]">{feed.total}</strong>{" "}
              posts
            </span>
            {createdFormatted && (
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="text-base">📅</span>
                Since {createdFormatted}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FollowCommunityButton communityId={community.id} slug={slug} />
            <Link
              href={`/community/${slug}/new`}
              className="rounded-full bg-[var(--gn-accent)] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
            >
              + New post
            </Link>
          </div>
        </div>
      </div>

      {/* ── Description (below stats on mobile) ─────────────────────── */}
      {community.description && (
        <div className="px-5 py-3 text-sm text-[var(--gn-text-muted)] lg:hidden">
          {community.description}
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────── */}
      <div className="px-4 pt-5 lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
        {/* Main content column */}
        <div className="min-w-0">
          {/* Sort controls */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
              Sort:
            </span>
            <Link
              href={sortLink("new")}
              className={
                sort === "new"
                  ? "rounded-full bg-[var(--gn-accent)] px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-4 py-1.5 text-sm font-medium text-[var(--gn-text)] transition hover:border-[var(--gn-text-muted)]"
              }
            >
              New
            </Link>
            <Link
              href={sortLink("top")}
              className={
                sort === "top"
                  ? "rounded-full bg-[var(--gn-accent)] px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-4 py-1.5 text-sm font-medium text-[var(--gn-text)] transition hover:border-[var(--gn-text-muted)]"
              }
            >
              Top
            </Link>
          </div>

          <CommunityPostList
            communitySlug={slug}
            communityId={community.id}
            communityName={community.name}
            communityIconKey={community.iconKey ?? null}
            sort={sort}
            page={page}
            initialItems={feed.items}
          />

          {feed.total > feed.pageSize ? (
            <div className="mt-6 flex justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link
                  className="rounded-full border border-[var(--gn-border)] px-4 py-2 text-[var(--gn-accent)] transition hover:bg-[var(--gn-surface-muted)]"
                  href={`/community/${slug}?sort=${sort}&page=${page - 1}`}
                >
                  ← Previous
                </Link>
              ) : null}
              {page * feed.pageSize < feed.total ? (
                <Link
                  className="rounded-full border border-[var(--gn-border)] px-4 py-2 text-[var(--gn-accent)] transition hover:bg-[var(--gn-surface-muted)]"
                  href={`/community/${slug}?sort=${sort}&page=${page + 1}`}
                >
                  Next →
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* About sidebar — lg+ */}
        <div className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* New Post CTA */}
            <Link
              href={`/community/${slug}/new`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gn-accent)] px-4 py-3 text-sm font-bold text-white shadow transition hover:brightness-110 active:scale-[0.98]"
            >
              ✏️ New Post in r/{community.slug}
            </Link>

            {/* About card */}
            <div className="gn-card overflow-hidden">
              <div
                className="h-10 w-full"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, var(--gn-accent) 60%, #1a1a2e 40%), color-mix(in srgb, var(--gn-accent) 25%, #0f0f1a 75%))`,
                }}
              />
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-bold text-[var(--gn-text)]">
                  About r/{community.slug}
                </h3>
                {community.description && (
                  <p className="text-sm leading-relaxed text-[var(--gn-text-muted)]">
                    {community.description}
                  </p>
                )}
                <div className="space-y-2 border-t border-[var(--gn-divide)] pt-3">
                  {hasMemberCount && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--gn-text-muted)]">Members</span>
                      <strong className="text-[var(--gn-text)]">
                        {formatMemberCount(community.memberCount!)}
                      </strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--gn-text-muted)]">Posts</span>
                    <strong className="text-[var(--gn-text)]">{feed.total}</strong>
                  </div>
                  {createdFormatted && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--gn-text-muted)]">Created</span>
                      <span className="text-[var(--gn-text)]">{createdFormatted}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rules card */}
            {hasRules && (
              <div className="gn-card p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--gn-text-muted)]">
                  Community Rules
                </h4>
                <ol className="space-y-2">
                  {community.rules!.map((rule, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[var(--gn-text-muted)]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-muted)] text-[0.65rem] font-bold text-[var(--gn-text)]">
                        {i + 1}
                      </span>
                      {rule}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Placeholder: Moderators */}
            <div className="gn-card p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--gn-text-muted)]">
                Moderators
              </h4>
              <p className="text-sm text-[var(--gn-text-muted)]">
                This community is moderated by the Growers Notebook team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
