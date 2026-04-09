"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  CommentActionMenu,
  MenuRow,
} from "@/components/comment-action-menu";
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
  seeds: number | null;
  growerLevel: string | null;
  viewerFollowing: boolean;
  profileFeedHiddenFromViewer?: boolean;
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

const tabClass = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-[#ff4500] text-white shadow-[0_0_16px_rgba(215,69,0,0.35)]"
      : "text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)] hover:text-[var(--gn-text)]"
  }`;

export function ProfileView({
  profile: initialProfile,
  tab: activeTab,
  sort: activeSort,
  postsPayload,
  commentsPayload,
  notebooksPayload,
}: {
  profile: PublicProfile;
  tab: "posts" | "comments" | "notebooks";
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="gn-card-subtle p-5 sm:flex sm:items-start sm:gap-6">
        <div className="flex shrink-0 justify-center sm:justify-start">
          <span className="flex h-24 w-24 overflow-hidden rounded-full bg-[var(--gn-surface-muted)] ring-2 ring-[var(--gn-border)]">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--gn-text-muted)]">
                {profileLabel.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </span>
        </div>
        <div className="mt-4 min-w-0 flex-1 sm:mt-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[var(--gn-text)]">
                {profileLabel}
              </h1>
              <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                {statsHidden ? (
                  <>Grower stats are private</>
                ) : (
                  <>
                    {tier} · {formatSeeds(profile.seeds)} seeds
                  </>
                )}
              </p>
            </div>
            {viewerId ? (
              <CommentActionMenu ariaLabel="Profile actions">
                {isOwn ? (
                  <MenuRow onClick={() => router.push("/settings/profile")}>
                    Edit profile
                  </MenuRow>
                ) : (
                  <MenuRow
                    danger
                    onClick={() => {
                      setReportNotice(null);
                      setReportOpen(true);
                    }}
                  >
                    Report user
                  </MenuRow>
                )}
              </CommentActionMenu>
            ) : null}
          </div>
          {bio ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
              {bio}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!isOwn ? (
              <>
                <FollowUserButton
                  userId={profile.id}
                  following={profile.viewerFollowing}
                  viewerId={viewerId}
                  onFollowingChange={(v) =>
                    setProfile((p) => ({ ...p, viewerFollowing: v }))
                  }
                />
                {viewerId && profile.viewerFollowing ? (
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
                  className="inline-flex items-center justify-center rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414]"
                >
                  New post on profile
                </Link>
                <Link
                  href={buildPostsHref({ tab: "notebooks", page: 1 })}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface)] px-4 py-2 text-sm font-semibold text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
                >
                  Notebooks
                </Link>
                <span className="text-xs text-[var(--gn-text-muted)]">
                  (visible on your profile and followers&apos; feeds)
                </span>
              </>
            )}
          </div>
          {!isOwn && reportOpen ? (
            <div className="mt-4 rounded-lg border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4">
              <p className="text-xs text-[var(--gn-text-muted)]">
                Moderators review reports in the admin area. Add context
                (optional).
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
                  className="inline-flex items-center justify-center rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff5414] disabled:opacity-50"
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
              className={`mt-3 text-sm ${reportNotice.tone === "success" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {reportNotice.text}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[var(--gn-divide)] pb-4">
        <Link
          href={buildPostsHref({ tab: "posts", sort: activeSort })}
          className={tabClass(activeTab === "posts")}
        >
          Posts
        </Link>
        <Link
          href={buildPostsHref({ tab: "comments" })}
          className={tabClass(activeTab === "comments")}
        >
          Comments
        </Link>
        <Link
          href={buildPostsHref({ tab: "notebooks" })}
          className={tabClass(activeTab === "notebooks")}
        >
          Notebooks
        </Link>
      </div>

      {activeTab === "posts" ? (
        <div className="mt-6 space-y-4">
          {feedHidden ? (
            <p className="py-8 text-center text-lg font-medium text-[var(--gn-text)]">
              No post here to see!
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[var(--gn-text-muted)]">
                  Sort:
                </span>
                <Link
                  href={buildPostsHref({
                    tab: "posts",
                    sort: "new",
                    page: 1,
                  })}
                  className={
                    activeSort === "new"
                      ? "text-sm font-semibold text-[#ff4500]"
                      : "text-sm text-[var(--gn-text-muted)] hover:underline"
                  }
                >
                  New
                </Link>
                <Link
                  href={buildPostsHref({
                    tab: "posts",
                    sort: "top",
                    page: 1,
                  })}
                  className={
                    activeSort === "top"
                      ? "text-sm font-semibold text-[#ff4500]"
                      : "text-sm text-[var(--gn-text-muted)] hover:underline"
                  }
                >
                  Top
                </Link>
              </div>
              {posts.length === 0 ? (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  No posts yet.
                </p>
              ) : (
                <FeedPostCardList items={posts} />
              )}
              {postsTotal > postsPageSize ? (
                <div className="flex gap-4 text-sm">
                  {postsPage > 1 ? (
                    <Link
                      href={buildPostsHref({
                        tab: "posts",
                        sort: activeSort,
                        page: postsPage - 1,
                      })}
                      className="text-[#ff4500] hover:underline"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {postsPage * postsPageSize < postsTotal ? (
                    <Link
                      href={buildPostsHref({
                        tab: "posts",
                        sort: activeSort,
                        page: postsPage + 1,
                      })}
                      className="text-[#ff4500] hover:underline"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : activeTab === "comments" ? (
        <div className="mt-6 space-y-4">
          {feedHidden ? (
            <p className="py-8 text-center text-lg font-medium text-[var(--gn-text)]">
              No comments here to see!
            </p>
          ) : (
            <>
              {commentItems.length === 0 ? (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  No comments yet.
                </p>
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
                      href={buildPostsHref({
                        tab: "comments",
                        page: commentsPage - 1,
                      })}
                      className="text-[#ff4500] hover:underline"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {commentsPage * commentsPageSize < commentsTotal ? (
                    <Link
                      href={buildPostsHref({
                        tab: "comments",
                        page: commentsPage + 1,
                      })}
                      className="text-[#ff4500] hover:underline"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {feedHidden ? (
            <p className="py-8 text-center text-lg font-medium text-[var(--gn-text)]">
              Nothing to see here!
            </p>
          ) : (
            <>
              {isOwn ? (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/notebooks/new"
                    className="inline-flex items-center justify-center rounded-full bg-[#ff4500] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,69,0,0.35)] transition hover:bg-[#ff5414]"
                  >
                    Set up your notebook
                  </Link>
                </div>
              ) : null}
              {notebookItems.length === 0 ? (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  No public notebooks yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notebookItems.map((n) => {
                    const strainLabel =
                      n.strain?.name?.trim() ||
                      n.customStrainLabel?.trim() ||
                      null;
                    return (
                      <li key={n.id}>
                        <Link
                          href={`/notebooks/${encodeURIComponent(n.id)}`}
                          className="block rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-4 transition hover:border-[var(--gn-text-muted)]"
                        >
                          <p className="font-semibold text-[var(--gn-text)]">
                            {n.title}
                          </p>
                          {strainLabel ? (
                            <p className="mt-1 text-sm text-[var(--gn-text-muted)]">
                              {strainLabel}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-[var(--gn-text-muted)]">
                            Score {n.score} · {n.status} · updated{" "}
                            {new Date(n.updatedAt).toLocaleDateString()}
                          </p>
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
                      href={buildPostsHref({
                        tab: "notebooks",
                        page: notebooksPage - 1,
                      })}
                      className="text-[#ff4500] hover:underline"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {notebooksPage * notebooksPageSize < notebooksTotal ? (
                    <Link
                      href={buildPostsHref({
                        tab: "notebooks",
                        page: notebooksPage + 1,
                      })}
                      className="text-[#ff4500] hover:underline"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </main>
  );
}
