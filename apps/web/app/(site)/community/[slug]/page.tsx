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
    <main className="mx-auto max-w-5xl pb-8">
      <RecentCommunitiesTracker
        slug={community.slug}
        name={community.name}
        iconKey={community.iconKey ?? null}
      />

      {/* ── Banner ──────────────────────────────────────────────────── */}
      <div className="relative w-full h-48 overflow-hidden rounded-b-2xl sm:h-56">
        {hasBanner ? (
          <img
            src={community.bannerUrl!}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(to bottom right, color-mix(in srgb, var(--gn-accent) 30%, transparent), var(--gn-surface-muted))`,
            }}
          />
        )}

        {/* Community icon — overlaps banner bottom-left */}
        <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
          {community.iconUrl ? (
            <img
              src={community.iconUrl}
              alt={community.name}
              className="h-14 w-14 rounded-2xl border-4 border-[var(--gn-page-mid)] bg-[var(--gn-surface-elevated)] object-cover"
            />
          ) : (
            <CommunityIcon
              iconKey={community.iconKey}
              nameFallback={community.name}
              slugFallback={community.slug}
              frameClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 border-[var(--gn-page-mid)] bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] text-xl font-bold"
            />
          )}
        </div>
      </div>

      {/* ── Community header ────────────────────────────────────────── */}
      <div className="px-4 pt-11 pb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--gn-text)]">
            {community.name}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--gn-text-muted)]">
            r/{community.slug}
          </p>
          {community.description && (
            <p className="mt-1 text-[var(--gn-text-muted)]">
              {community.description}
            </p>
          )}
          {hasMemberCount && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--gn-surface-muted)] px-3 py-0.5 text-sm text-[var(--gn-text-muted)]">
              👥 {formatMemberCount(community.memberCount!)} members
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <FollowCommunityButton communityId={community.id} slug={slug} />
          <Link
            href={`/community/${slug}/new`}
            className="rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            New post
          </Link>
        </div>
      </div>

      {/* ── Two-column layout (posts + sidebar) ─────────────────────── */}
      <div className="px-4 lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Main content column */}
        <div className="lg:col-span-2">
          {/* Sort controls */}
          <div className="mb-4 flex gap-2 text-sm font-medium">
            <Link
              href={sortLink("new")}
              className={
                sort === "new"
                  ? "rounded-full bg-[var(--gn-accent)] px-3 py-1 text-white shadow-sm"
                  : "rounded-full border-2 border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-hover)]"
              }
            >
              New
            </Link>
            <Link
              href={sortLink("top")}
              className={
                sort === "top"
                  ? "rounded-full bg-[var(--gn-accent)] px-3 py-1 text-white shadow-sm"
                  : "rounded-full border-2 border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 py-1 text-[var(--gn-text)] transition hover:shadow-[var(--gn-shadow-hover)]"
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
                  className="text-[var(--gn-accent)] hover:underline"
                  href={`/community/${slug}?sort=${sort}&page=${page - 1}`}
                >
                  Previous
                </Link>
              ) : null}
              {page * feed.pageSize < feed.total ? (
                <Link
                  className="text-[var(--gn-accent)] hover:underline"
                  href={`/community/${slug}?sort=${sort}&page=${page + 1}`}
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Sidebar — lg+ */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20">
            <div className="gn-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--gn-text)]">
                About r/{community.slug}
              </h3>
              {community.description && (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  {community.description}
                </p>
              )}
              {hasMemberCount && (
                <div className="flex items-center gap-2 text-sm text-[var(--gn-text-muted)]">
                  <span>👥</span>
                  <span>
                    <strong>{formatMemberCount(community.memberCount!)}</strong>{" "}
                    members
                  </span>
                </div>
              )}
              {createdFormatted && (
                <div className="flex items-center gap-2 text-sm text-[var(--gn-text-muted)]">
                  <span>📅</span>
                  <span>Created {createdFormatted}</span>
                </div>
              )}
              {hasRules && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-excerpt)] mt-3 mb-2">
                    Rules
                  </h4>
                  <ol className="space-y-1">
                    {community.rules!.map((rule, i) => (
                      <li key={i} className="text-xs text-[var(--gn-text-muted)]">
                        {i + 1}. {rule}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
