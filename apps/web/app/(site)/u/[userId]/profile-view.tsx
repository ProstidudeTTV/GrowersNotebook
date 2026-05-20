"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CommentActionMenu,
  MenuRow,
} from "@/components/comment-action-menu";
import { EntityCoverBanner } from "@/components/entity-cover-banner";
import { FollowUserButton } from "@/components/follow-buttons";
import { FeedPostCardList } from "@/components/feed-post-card-list";
import {
  ProfileCommentsList,
  type ProfileCommentRow,
} from "@/components/profile-comments-list";
import { apiFetch } from "@/lib/api-public";
import type { FeedPost } from "@/lib/feed-post";
import { DEFAULT_GROWER_RANK, formatSeeds } from "@/lib/grower-display";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";

type PublicProfile = {
  id: string;
  displayName: string | null;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  seeds: number | null;
  growerLevel: string | null;
  viewerFollowing: boolean;
  viewerHasBlocked?: boolean;
  profileFeedHiddenFromViewer?: boolean;
  followListsHiddenFromViewer?: boolean;
  showFollowListsPublic?: boolean;
  /** Social graph counts — populated by API when available */
  followerCount?: number | null;
  followingCount?: number | null;
};

type FeedResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
};

type CommentsResponse = {
  items: ProfileCommentRow[];
  total: number;
  page: number;
  pageSize: number;
};

type ProfileNotebookRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  customStrainLabel: string | null;
  strain: { slug: string; name: string | null } | null;
  score: number;
};

type NotebooksResponse = {
  items: ProfileNotebookRow[];
  total: number;
  page: number;
  pageSize: number;
};

function getTierInfo(tier: string | null): { emoji: string; label: string } {
  if (!tier) return { emoji: "🌱", label: "Seedling" };
  const t = tier.toLowerCase();
  if (t.includes("master")) return { emoji: "👑", label: tier };
  if (t.includes("expert")) return { emoji: "⭐", label: tier };
  if (t.includes("grower") && !t.includes("rookie")) return { emoji: "🌿", label: tier };
  return { emoji: "🌱", label: tier };
}

/** Stable color from first char — matches community-icon hashing approach */
const AVATAR_COLORS = [
  "from-teal-700 to-cyan-600",
  "from-sky-700 to-blue-600",
  "from-violet-700 to-purple-600",
  "from-amber-600 to-yellow-500",
  "from-fuchsia-700 to-pink-600",
  "from-rose-700 to-red-600",
  "from-indigo-700 to-blue-600",
  "from-cyan-700 to-sky-600",
  "from-teal-800 to-teal-600",
  "from-violet-800 to-indigo-600",
];
function avatarGradient(name: string): string {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? "from-teal-700 to-cyan-600";
}

export function ProfileView({
  profile: initialProfile,
  tab: activeTab,
  sort: activeSort,
  postsPayload,
  commentsPayload,
  notebooksPayload,
}: {
  profile: PublicProfile;
  tab: "posts" | "comments" | "notebooks" | "media";
  sort: "new" | "top";
  postsPayload: FeedResponse | null;
  commentsPayload: CommentsResponse | null;
  notebooksPayload: NotebooksResponse | null;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDraft, setReportDraft] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportNotice, setReportNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
    setReportOpen(false);
    setReportDraft("");
    setReportNotice(null);
  }, [initialProfile]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setViewerId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const uid = profile.id;
  const base = `/u/${uid}`;
  const profileLabel = profile.displayName?.trim() || "Grower";
  const statsHidden = profile.seeds == null || profile.growerLevel == null;
  const tier = statsHidden
    ? null
    : (profile.growerLevel?.trim() || DEFAULT_GROWER_RANK);
  const isOwn = viewerId != null && viewerId === uid;
  const bio = profile.description?.trim();

  const submitReport = useCallback(async () => {
    setReportNotice(null);
    setReportBusy(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to report.");
      const res = await apiFetch<{ alreadyReported: boolean }>(
        `/profiles/${uid}/report`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            reason: reportDraft.trim() || undefined,
          }),
        },
      );
      setReportNotice({
        tone: "success",
        text: res.alreadyReported
          ? "You already reported this profile."
          : "Thanks — moderators will review your report.",
      });
      setReportOpen(false);
      setReportDraft("");
    } catch (e) {
      setReportNotice({
        tone: "error",
        text: e instanceof Error ? e.message : "Could not submit report.",
      });
    } finally {
      setReportBusy(false);
    }
  }, [uid, reportDraft]);

  const toggleBlock = useCallback(async () => {
    if (!viewerId || isOwn) return;
    setBlockBusy(true);
    setReportNotice(null);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to manage blocks.");
      const blocked = profile.viewerHasBlocked === true;
      if (blocked) {
        await apiFetch(`/blocks/${uid}`, { method: "DELETE", token });
        setProfile((p) => ({ ...p, viewerHasBlocked: false, viewerFollowing: false }));
        setReportNotice({
          tone: "success",
          text: "Unblocked. You can follow or view their profile again.",
        });
      } else {
        await apiFetch(`/blocks/${uid}`, { method: "POST", token });
        setReportNotice({
          tone: "success",
          text: "Blocked. Their posts and messages are hidden from you.",
        });
        router.push("/");
      }
    } catch (e) {
      setReportNotice({
        tone: "error",
        text: e instanceof Error ? e.message : "Could not update block.",
      });
    } finally {
      setBlockBusy(false);
    }
  }, [viewerId, isOwn, uid, profile.viewerHasBlocked, router]);

  const posts = postsPayload?.items ?? [];
  const commentItems = commentsPayload?.items ?? [];
  const postsTotal = postsPayload?.total ?? 0;
  const postsPageSize = postsPayload?.pageSize ?? 20;
  const postsPage = postsPayload?.page ?? 1;

  const commentsTotal = commentsPayload?.total ?? 0;
  const commentsPageSize = commentsPayload?.pageSize ?? 20;
  const commentsPage = commentsPayload?.page ?? 1;

  const notebookItems = notebooksPayload?.items ?? [];
  const notebooksTotal = notebooksPayload?.total ?? 0;
  const notebooksPageSize = notebooksPayload?.pageSize ?? 20;
  const notebooksPage = notebooksPayload?.page ?? 1;

  const buildPostsHref = (p: {
    tab: string;
    sort?: string;
    page?: number;
  }) => {
    const q = new URLSearchParams();
    q.set("tab", p.tab);
    if (p.sort) q.set("sort", p.sort);
    if (p.page != null && p.page > 1) q.set("page", String(p.page));
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const feedHidden = !!profile.profileFeedHiddenFromViewer;
  const { emoji: tierEmoji, label: tierLabel } = getTierInfo(tier);
  const avatarGrad = avatarGradient(profileLabel);

  const tabItems = [
    { id: "posts", label: "Posts", count: postsTotal },
    { id: "comments", label: "Comments", count: null },
    { id: "notebooks", label: "Journals", count: notebooksTotal },
    { id: "media", label: "Media", count: null },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-[var(--gn-container-max)] pb-16">
      <EntityCoverBanner
        imageUrl={profile.bannerUrl}
        alt=""
        variant="hero"
        priority
      />

      {/* ── Profile identity block ────────────────────────────────────── */}
      <div className="relative bg-[var(--gn-surface-raised)] px-5 sm:px-8 pb-0">
        {/* Avatar — breaks out of banner into this section */}
        <div className="absolute -top-12 left-5 sm:left-8 z-10 md:-top-14">
          <span
            className={`flex h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-4 ring-[var(--gn-surface-raised)] shadow-2xl bg-gradient-to-br ${avatarGrad}`}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--gn-on-accent)]">
                {profileLabel.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </span>
        </div>

        {/* Right-side action row (positioned top-right while avatar floats left) */}
        <div className="flex justify-end pt-3 pb-2 min-h-[3rem]">
          {viewerId ? (
            <CommentActionMenu ariaLabel="Profile actions">
              {isOwn ? (
                <MenuRow onClick={() => router.push("/settings/profile")}>
                  Edit profile
                </MenuRow>
              ) : (
                <>
                  <MenuRow
                    danger
                    disabled={blockBusy}
                    onClick={() => {
                      setReportNotice(null);
                      void toggleBlock();
                    }}
                  >
                    {profile.viewerHasBlocked ? "Unblock user" : "Block user"}
                  </MenuRow>
                  <MenuRow
                    danger
                    onClick={() => {
                      setReportNotice(null);
                      setReportOpen(true);
                    }}
                  >
                    Report user
                  </MenuRow>
                </>
              )}
            </CommentActionMenu>
          ) : null}
        </div>

        {/* Name + badges + bio */}
        <div className="pt-8 pb-4">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--gn-text)] sm:text-3xl">
              {profileLabel}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!statsHidden && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gn-accent)]/30 bg-[var(--gn-accent)]/10 px-3 py-0.5 text-xs font-semibold text-[var(--gn-accent)]">
                {tierEmoji} {tierLabel}
              </span>
            )}
            {!statsHidden && profile.seeds != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-400">
                🌱 {formatSeeds(profile.seeds)} Seeds
              </span>
            )}
          </div>
          {bio ? (
            <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text-muted)]">
              {bio}
            </p>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pb-4">
          {!isOwn ? (
            <>
              {viewerId && profile.viewerHasBlocked !== true ? (
                <FollowUserButton
                  userId={profile.id}
                  following={profile.viewerFollowing}
                  viewerId={viewerId}
                  onFollowingChange={(v) =>
                    setProfile((p) => ({ ...p, viewerFollowing: v }))
                  }
                />
              ) : null}
              {viewerId &&
              profile.viewerFollowing &&
              profile.viewerHasBlocked !== true ? (
                <Link
                  href={`/messages?with=${encodeURIComponent(profile.id)}`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
                >
                  Message
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href="/new-post"
                className="inline-flex items-center justify-center rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110"
              >
                ✏️ New post
              </Link>
              <Link
                href="/settings/profile"
                className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
              >
                Edit profile
              </Link>
              <Link
                href={buildPostsHref({ tab: "notebooks", page: 1 })}
                className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
              >
                📔 Journals
              </Link>
            </>
          )}
        </div>

        {/* Report form */}
        {!isOwn && reportOpen ? (
          <div className="mb-4 rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4">
            <p className="text-xs text-[var(--gn-text-muted)]">
              Moderators review reports in the admin area. Add context (optional).
            </p>
            <textarea
              value={reportDraft}
              onChange={(e) => setReportDraft(e.target.value)}
              maxLength={2000}
              rows={3}
              className="gn-input mt-2 w-full resize-y text-sm"
              placeholder="What should reviewers know?"
              disabled={reportBusy}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => void submitReport()}
                className="inline-flex items-center justify-center rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-[var(--gn-on-accent)] transition hover:brightness-110 disabled:opacity-50"
              >
                {reportBusy ? "Submitting…" : "Submit report"}
              </button>
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => {
                  setReportOpen(false);
                  setReportDraft("");
                }}
                className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] px-4 py-2 text-sm font-medium text-[var(--gn-text)] hover:bg-[var(--gn-surface-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {reportNotice ? (
          <p
            className={`mb-4 text-sm ${reportNotice.tone === "success" ? "text-[var(--gn-accent)]" : "text-red-400"}`}
          >
            {reportNotice.text}
          </p>
        ) : null}

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <div className="border-t border-[var(--gn-divide)] py-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <span className="flex flex-col items-center sm:flex-row sm:gap-1">
            <strong className="font-bold text-[var(--gn-text)] text-base leading-none">
              {postsTotal}
            </strong>
            <span className="text-[var(--gn-text-muted)] text-xs sm:text-sm">posts</span>
          </span>
          <span className="text-[var(--gn-divide)] hidden sm:block">·</span>
          <span className="flex flex-col items-center sm:flex-row sm:gap-1">
            <strong className="font-bold text-[var(--gn-text)] text-base leading-none">
              {commentsTotal}
            </strong>
            <span className="text-[var(--gn-text-muted)] text-xs sm:text-sm">comments</span>
          </span>
          <span className="text-[var(--gn-divide)] hidden sm:block">·</span>
          {profile.followListsHiddenFromViewer && !isOwn ? (
            <>
              <span className="flex flex-col items-center sm:flex-row sm:gap-1">
                <strong className="font-bold text-[var(--gn-text)] text-base leading-none">
                  —
                </strong>
                <span className="text-[var(--gn-text-muted)] text-xs sm:text-sm">
                  followers
                </span>
              </span>
              <span className="text-[var(--gn-divide)] hidden sm:block">·</span>
              <span className="flex flex-col items-center sm:flex-row sm:gap-1">
                <strong className="font-bold text-[var(--gn-text)] text-base leading-none">
                  —
                </strong>
                <span className="text-[var(--gn-text-muted)] text-xs sm:text-sm">
                  following
                </span>
              </span>
            </>
          ) : (
            <>
              <Link
                href={`${base}/followers`}
                className="flex flex-col items-center sm:flex-row sm:gap-1 transition hover:text-[var(--gn-accent)]"
              >
                <strong className="font-bold text-[var(--gn-text)] text-base leading-none">
                  {profile.followerCount ?? 0}
                </strong>
                <span className="text-[var(--gn-text-muted)] text-xs sm:text-sm">
                  followers
                </span>
              </Link>
              <span className="text-[var(--gn-divide)] hidden sm:block">·</span>
              <Link
                href={`${base}/following`}
                className="flex flex-col items-center sm:flex-row sm:gap-1 transition hover:text-[var(--gn-accent)]"
              >
                <strong className="font-bold text-[var(--gn-text)] text-base leading-none">
                  {profile.followingCount ?? 0}
                </strong>
                <span className="text-[var(--gn-text-muted)] text-xs sm:text-sm">
                  following
                </span>
              </Link>
            </>
          )}
        </div>
        {isOwn && profile.showFollowListsPublic === false ? (
          <p className="border-t border-[var(--gn-divide)] py-2 text-xs text-[var(--gn-text-muted)]">
            Follower and following lists are hidden from others — only you can
            see them.
          </p>
        ) : null}
      </div>

      {/* ── Tab navigation ───────────────────────────────────────────── */}
      <div className="sticky top-14 z-10 border-b border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-5 sm:px-8">
        <div className="-mb-px flex gap-0.5">
          {tabItems.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={buildPostsHref({ tab: t.id, sort: activeSort })}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-[var(--gn-accent)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-[var(--gn-accent)]"
                    : "text-[var(--gn-text-muted)] hover:text-[var(--gn-text)]"
                }`}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold leading-none ${
                      isActive
                        ? "bg-[var(--gn-accent)]/15 text-[var(--gn-accent)]"
                        : "bg-[var(--gn-surface-muted)] text-[var(--gn-text-muted)]"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Two-column content area ───────────────────────────────────── */}
      <div className="px-4 pt-5 lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">

        {/* Main content */}
        <div className="min-w-0">
          {activeTab === "posts" ? (
            <div className="space-y-4">
              {feedHidden ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="text-[var(--gn-text-muted)]">No posts here to see!</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--gn-text-muted)]">
                      Sort:
                    </span>
                    <Link
                      href={buildPostsHref({ tab: "posts", sort: "new", page: 1 })}
                      className={
                        activeSort === "new"
                          ? "rounded-full bg-[var(--gn-accent)] px-3 py-1 text-xs font-semibold text-[var(--gn-on-accent)]"
                          : "rounded-full border border-[var(--gn-border)] px-3 py-1 text-xs font-medium text-[var(--gn-text-muted)] hover:text-[var(--gn-text)]"
                      }
                    >
                      New
                    </Link>
                    <Link
                      href={buildPostsHref({ tab: "posts", sort: "top", page: 1 })}
                      className={
                        activeSort === "top"
                          ? "rounded-full bg-[var(--gn-accent)] px-3 py-1 text-xs font-semibold text-[var(--gn-on-accent)]"
                          : "rounded-full border border-[var(--gn-border)] px-3 py-1 text-xs font-medium text-[var(--gn-text-muted)] hover:text-[var(--gn-text)]"
                      }
                    >
                      Top
                    </Link>
                  </div>
                  {posts.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="text-4xl mb-3">✍️</div>
                      <p className="text-sm text-[var(--gn-text-muted)]">No posts shared yet.</p>
                    </div>
                  ) : (
                    <FeedPostCardList items={posts} />
                  )}
                  {postsTotal > postsPageSize ? (
                    <div className="flex gap-4 text-sm">
                      {postsPage > 1 ? (
                        <Link
                          href={buildPostsHref({ tab: "posts", sort: activeSort, page: postsPage - 1 })}
                          className="text-[var(--gn-accent)] hover:underline"
                        >
                          ← Previous
                        </Link>
                      ) : null}
                      {postsPage * postsPageSize < postsTotal ? (
                        <Link
                          href={buildPostsHref({ tab: "posts", sort: activeSort, page: postsPage + 1 })}
                          className="text-[var(--gn-accent)] hover:underline"
                        >
                          Next →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : activeTab === "media" ? (
            (() => {
              const mediaPosts = posts.filter(
                (p) => p.media && p.media.some((m) => m.type === "image"),
              );
              const imageItems = mediaPosts.flatMap(
                (p) =>
                  (p.media ?? [])
                    .filter((m) => m.type === "image")
                    .map((m) => ({ url: m.url, postId: p.id, title: p.title })),
              );
              return (
                <div>
                  {feedHidden ? (
                    <div className="py-16 text-center">
                      <div className="text-4xl mb-3">🔒</div>
                      <p className="text-sm text-[var(--gn-text-muted)]">Nothing to see here!</p>
                    </div>
                  ) : imageItems.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="text-4xl mb-3">🌿</div>
                      <p className="text-sm text-[var(--gn-text-muted)]">No photos shared yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {imageItems.map((item, i) => (
                        <Link
                          key={`${item.postId}-${i}`}
                          href={`/p/${item.postId}`}
                          className="block aspect-square overflow-hidden rounded-xl bg-[var(--gn-surface-muted)] transition hover:opacity-90"
                          title={item.title}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : activeTab === "comments" ? (
            <div className="space-y-3">
              {feedHidden ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="text-sm text-[var(--gn-text-muted)]">No comments here to see!</p>
                </div>
              ) : (
                <>
                  {commentItems.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="text-4xl mb-3">💬</div>
                      <p className="text-sm text-[var(--gn-text-muted)]">No comments yet.</p>
                    </div>
                  ) : (
                    <ProfileCommentsList
                      items={commentItems}
                      profileUserId={uid}
                      profileLabel={profileLabel}
                    />
                  )}
                  {commentsTotal > commentsPageSize ? (
                    <div className="flex gap-4 text-sm">
                      {commentsPage > 1 ? (
                        <Link
                          href={buildPostsHref({ tab: "comments", page: commentsPage - 1 })}
                          className="text-[var(--gn-accent)] hover:underline"
                        >
                          ← Previous
                        </Link>
                      ) : null}
                      {commentsPage * commentsPageSize < commentsTotal ? (
                        <Link
                          href={buildPostsHref({ tab: "comments", page: commentsPage + 1 })}
                          className="text-[var(--gn-accent)] hover:underline"
                        >
                          Next →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            /* Notebooks tab */
            <div className="space-y-4">
              {feedHidden ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="text-sm text-[var(--gn-text-muted)]">Nothing to see here!</p>
                </div>
              ) : (
                <>
                  {isOwn ? (
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/notebooks/new"
                        className="inline-flex items-center justify-center rounded-full bg-[var(--gn-accent)] px-4 py-2 text-sm font-semibold text-[var(--gn-on-accent)] shadow-sm transition hover:brightness-110"
                      >
                        📔 Start a notebook
                      </Link>
                    </div>
                  ) : null}
                  {notebookItems.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="text-4xl mb-3">📔</div>
                      <p className="text-sm text-[var(--gn-text-muted)]">No notebooks yet.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {notebookItems.map((n) => {
                        const strainLabel =
                          n.strain?.name?.trim() ||
                          n.customStrainLabel?.trim() ||
                          null;
                        const statusColors: Record<string, string> = {
                          active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                          harvest: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                          complete: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                        };
                        const statusClass =
                          statusColors[n.status?.toLowerCase() ?? ""] ??
                          "text-[var(--gn-text-muted)] bg-[var(--gn-surface-muted)] border-[var(--gn-border)]";
                        return (
                          <li key={n.id}>
                            <Link
                              href={`/notebooks/${encodeURIComponent(n.id)}`}
                              className="flex items-start gap-4 rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] p-4 transition hover:border-[var(--gn-accent)]/30 hover:shadow-[var(--gn-shadow-md)]"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gn-accent)]/10 text-xl">
                                📔
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold text-[var(--gn-text)] leading-snug">
                                    {n.title}
                                  </p>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold capitalize ${statusClass}`}
                                  >
                                    {n.status}
                                  </span>
                                </div>
                                {strainLabel ? (
                                  <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                                    🌿 {strainLabel}
                                  </p>
                                ) : null}
                                <p className="mt-1.5 text-xs text-[var(--gn-text-muted)]">
                                  Score {n.score} · updated{" "}
                                  {new Date(n.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {notebooksTotal > notebooksPageSize ? (
                    <div className="flex gap-4 text-sm">
                      {notebooksPage > 1 ? (
                        <Link
                          href={buildPostsHref({ tab: "notebooks", page: notebooksPage - 1 })}
                          className="text-[var(--gn-accent)] hover:underline"
                        >
                          ← Previous
                        </Link>
                      ) : null}
                      {notebooksPage * notebooksPageSize < notebooksTotal ? (
                        <Link
                          href={buildPostsHref({ tab: "notebooks", page: notebooksPage + 1 })}
                          className="text-[var(--gn-accent)] hover:underline"
                        >
                          Next →
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar (lg+) ───────────────────────────────────── */}
        <div className="hidden lg:block mt-0">
          <div className="sticky top-20 space-y-4">

            {/* About This Grower card */}
            <div className="gn-card overflow-hidden">
              <div className="h-8 w-full bg-gradient-to-r from-[color-mix(in_srgb,var(--gn-accent)_55%,transparent)] via-[color-mix(in_srgb,var(--gn-accent)_35%,transparent)] to-transparent" />
              <div className="p-4 space-y-3">
                <h3 className="text-sm font-bold text-[var(--gn-text)]">
                  About {profileLabel}
                </h3>
                {bio ? (
                  <p className="text-sm leading-relaxed text-[var(--gn-text-muted)] line-clamp-4">
                    {bio}
                  </p>
                ) : null}
                <div className="space-y-2 pt-1">
                  {!statsHidden && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--gn-text-muted)]">Level</span>
                      <span className="font-semibold text-[var(--gn-accent)]">
                        {tierEmoji} {tierLabel}
                      </span>
                    </div>
                  )}
                  {!statsHidden && profile.seeds != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--gn-text-muted)]">Seeds</span>
                      <span className="font-semibold text-amber-400">
                        🌱 {formatSeeds(profile.seeds)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--gn-text-muted)]">Posts</span>
                    <strong className="text-[var(--gn-text)]">{postsTotal}</strong>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--gn-text-muted)]">Followers</span>
                    <Link
                      href={`${base}/followers`}
                      className="font-semibold text-[var(--gn-accent)] hover:underline"
                    >
                      {profile.followerCount ?? 0}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--gn-text-muted)]">Following</span>
                    <Link
                      href={`${base}/following`}
                      className="font-semibold text-[var(--gn-accent)] hover:underline"
                    >
                      {profile.followingCount ?? 0}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Journals mini-list */}
            {notebookItems.length > 0 && (
              <div className="gn-card p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--gn-text-muted)]">
                  Recent Journals
                </h3>
                <ul className="space-y-2">
                  {notebookItems.slice(0, 4).map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/notebooks/${encodeURIComponent(n.id)}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-[var(--gn-surface-elevated)]"
                      >
                        <span className="text-base leading-none">📔</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-[var(--gn-text)]">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[0.6rem] font-semibold uppercase text-[var(--gn-text-muted)]">
                          {n.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {notebooksTotal > 4 && (
                  <Link
                    href={buildPostsHref({ tab: "notebooks" })}
                    className="block text-center text-xs font-semibold text-[var(--gn-accent)] hover:underline pt-1"
                  >
                    View all {notebooksTotal} journals →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
