"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CommentActionMenu,
  MenuRow,
} from "@/components/comment-action-menu";
import { CommunityIcon } from "@/components/community-icon";
import { PostShareButton } from "@/components/post-share-button";
import { VoteFeedPill } from "@/components/vote-score-rail";
import { apiFetch } from "@/lib/api-public";
import type { FeedPost } from "@/lib/feed-post";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import {
  normalizedViewerVote,
  parseVoteMutationResponse,
  talliesAfterVoteClick,
} from "@/lib/vote-ui";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function CommunityFeedCard({
  post,
  community,
  onPatch,
}: {
  post: FeedPost;
  community: { slug: string; name: string; iconKey?: string | null };
  onPatch: (postId: string, patch: Partial<FeedPost>) => void;
}) {
  const router = useRouter();
  const [local, setLocal] = useState(post);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDraft, setReportDraft] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const voteOverlay = useRef<{ target: number | null } | undefined>(undefined);

  useEffect(() => {
    setLocal(post);
  }, [post]);

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

  const refreshPost = useCallback(async () => {
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    const p = await apiFetch<FeedPost>(`/posts/${post.id}`, {
      token: token ?? undefined,
    });
    const overlay = voteOverlay.current;
    const srvVv = normalizedViewerVote(p.viewerVote);
    let vv = srvVv;
    if (overlay !== undefined) {
      if (srvVv === overlay.target) {
        voteOverlay.current = undefined;
      } else {
        vv = overlay.target;
      }
    }
    const next = { ...p, viewerVote: vv };
    setLocal(next);
    onPatch(post.id, next);
  }, [post.id, onPatch]);

  const vote = async (value: 1 | -1) => {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    setVoteBusy(true);
    voteOverlay.current = undefined;
    const prevVv = normalizedViewerVote(local.viewerVote);
    const optimistic = talliesAfterVoteClick(
      local.upvotes,
      local.downvotes,
      prevVv,
      value,
    );
    setLocal((p) => ({ ...p, ...optimistic }));
    onPatch(post.id, optimistic);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to vote.");
      const voteRes = await apiFetch<Record<string, unknown>>("/votes/post", {
        method: "POST",
        token,
        body: JSON.stringify({ postId: post.id, value }),
      });
      const metrics = parseVoteMutationResponse(voteRes);
      if (metrics) {
        voteOverlay.current = undefined;
        const patch = {
          score: metrics.score,
          upvotes: metrics.upvotes,
          downvotes: metrics.downvotes,
          viewerVote: metrics.viewerVote,
        };
        setLocal((p) => ({ ...p, ...patch }));
        onPatch(post.id, patch);
      } else {
        if ("viewerVote" in voteRes || "viewer_vote" in voteRes) {
          voteOverlay.current = {
            target: normalizedViewerVote(
              voteRes.viewerVote ?? voteRes.viewer_vote,
            ),
          };
        }
        await refreshPost();
      }
    } catch {
      voteOverlay.current = undefined;
      setLocal(post);
      onPatch(post.id, post);
      await refreshPost();
    } finally {
      setVoteBusy(false);
    }
  };

  const submitReport = async () => {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (local.author.id === viewerId) return;
    setReportBusy(true);
    setReportMsg(null);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to report.");
      const res = await apiFetch<{ alreadyReported?: boolean }>(
        `/posts/${post.id}/report`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ reason: reportDraft.trim() || undefined }),
        },
      );
      setReportOpen(false);
      setReportDraft("");
      setReportMsg(
        res.alreadyReported
          ? "You already reported this post."
          : "Thanks — moderators will review.",
      );
      window.setTimeout(() => setReportMsg(null), 4000);
    } catch (e) {
      setReportMsg(
        e instanceof Error ? e.message : "Could not submit report.",
      );
    } finally {
      setReportBusy(false);
    }
  };

  const media = local.media?.[0];
  const commentsN =
    typeof local.commentCount === "number" ? local.commentCount : 0;
  const isOwn = viewerId != null && viewerId === local.author.id;

  const openPost = () => {
    router.push(`/p/${local.id}`);
  };

  return (
    <article
      className={`relative rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)] transition hover:border-[color-mix(in_srgb,var(--gn-accent)_22%,var(--gn-border))] hover:shadow-[var(--gn-shadow-md)] ${local.pinnedAt ? "ring-1 ring-amber-400/25" : ""}`}
    >
      <div
        role="link"
        tabIndex={0}
        className="block cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--gn-ring-focus)]"
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest("[data-interactive]")) return;
          openPost();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          if ((e.target as HTMLElement).closest("[data-interactive]")) return;
          e.preventDefault();
          openPost();
        }}
        aria-label={`Open post: ${local.title}`}
      >
        <div className="p-3.5 sm:p-4">
          <div className="flex items-start gap-2">
            <CommunityIcon
              iconKey={community.iconKey}
              nameFallback={community.name}
              slugFallback={community.slug}
              frameClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--gn-text-muted)]">
                <span className="font-semibold text-[var(--gn-text)]">
                  {community.name.trim() || community.slug}
                </span>
                <span aria-hidden>·</span>
                <span title={new Date(local.createdAt).toLocaleString()}>
                  {timeAgo(local.createdAt)}
                </span>
              </div>
              <h2 className="mt-2 text-base font-bold leading-snug text-[var(--gn-text)] sm:text-lg">
                {local.title}
              </h2>
            </div>
            <div className="shrink-0" data-interactive>
              <CommentActionMenu ariaLabel="Post actions">
                <MenuRow
                  onClick={() => {
                    router.push(`/u/${local.author.id}`);
                  }}
                >
                  View profile
                </MenuRow>
                {!isOwn ? (
                  <MenuRow
                    onClick={() => {
                      setReportOpen(true);
                      setReportMsg(null);
                    }}
                  >
                    Report post
                  </MenuRow>
                ) : null}
              </CommentActionMenu>
            </div>
          </div>

          {media ? (
            <div
              className="mt-3 overflow-hidden rounded-xl bg-black/25 ring-1 ring-[var(--gn-ring)]"
              {...(media.type === "video"
                ? { "data-interactive": true as const }
                : {})}
            >
              {media.type === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={media.url}
                  alt=""
                  className="max-h-[min(28rem,70vh)] w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <video
                  src={media.url}
                  className="max-h-[min(28rem,70vh)] w-full object-contain"
                  controls
                  preload="metadata"
                  playsInline
                />
              )}
            </div>
          ) : null}

          {local.excerpt && !media ? (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--gn-text-excerpt)]">
              {local.excerpt}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 border-t border-[var(--gn-divide)] px-3.5 py-2.5 sm:px-4"
        data-interactive
      >
        <VoteFeedPill
          score={local.score}
          upvotes={local.upvotes}
          downvotes={local.downvotes}
          viewerVote={local.viewerVote}
          onUp={() => void vote(1)}
          onDown={() => void vote(-1)}
          disabled={voteBusy}
        />
        <Link
          href={`/p/${local.id}#comments`}
          prefetch={false}
          data-interactive
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 text-xs font-medium text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition hover:bg-[var(--gn-surface-hover)]"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 opacity-80"
            aria-hidden
          >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
          <span className="tabular-nums">{compactCount(commentsN)}</span>
          <span className="sr-only">comments</span>
        </Link>
        <span
          data-interactive
          className="inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <PostShareButton
            postId={local.id}
            postTitle={local.title}
            viewerId={viewerId}
          />
        </span>
      </div>

      {reportMsg ? (
        <p className="border-t border-[var(--gn-divide)] px-4 py-2 text-xs text-[var(--gn-text-muted)]">
          {reportMsg}
        </p>
      ) : null}

      {reportOpen ? (
        <div
          className="border-t border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3"
          data-interactive
        >
          <p className="text-xs text-[var(--gn-text-muted)]">
            Report this post to moderators (optional note).
          </p>
          <textarea
            className="gn-input mt-2 w-full p-2 text-sm"
            rows={2}
            value={reportDraft}
            placeholder="Reason (optional)"
            onChange={(e) => setReportDraft(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reportBusy}
              className="rounded-full bg-[#ff4500] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() => void submitReport()}
            >
              {reportBusy ? "Sending…" : "Submit report"}
            </button>
            <button
              type="button"
              disabled={reportBusy}
              className="rounded-full border border-[var(--gn-ring)] px-3 py-1 text-xs text-[var(--gn-text)]"
              onClick={() => {
                setReportOpen(false);
                setReportDraft("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
