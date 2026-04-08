"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CommentActionMenu,
  MenuRow,
} from "@/components/comment-action-menu";
import { CommunityIcon } from "@/components/community-icon";
import { FollowUserButton } from "@/components/follow-buttons";
import { PostShareButton } from "@/components/post-share-button";
import { UserProfileLink } from "@/components/user-profile-link";
import { PostEditor } from "@/components/post-editor";
import { PostMediaCarousel } from "@/components/post-media-carousel";
import { PostMediaDropzone } from "@/components/post-media-dropzone";
import { VoteFeedPill, VoteScoreRail } from "@/components/vote-score-rail";
import { apiFetch } from "@/lib/api-public";
import {
  bodyHtmlIsSubmittable,
  MAX_POST_MEDIA,
  TITLE_MAX_LEN,
} from "@/lib/post-draft-validation";
import { DEFAULT_GROWER_RANK, formatSeeds } from "@/lib/grower-display";
import {
  normalizedViewerVote,
  parseVoteMutationResponse,
  pickViewerVote,
  talliesAfterVoteClick,
} from "@/lib/vote-ui";
import { createClient } from "@/lib/supabase/client";
import { getAccessTokenForApi } from "@/lib/supabase/get-access-token-for-api";
import type { PostMediaItem } from "@/lib/feed-post";
import { displayPostBodyHtml } from "@/lib/youtube-embed";

type Author = {
  id: string;
  displayName: string | null;
  avatarUrl?: string | null;
  seeds?: number | null;
  growerLevel?: string | null;
  viewerFollowing?: boolean;
};

function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const headerIconFrame =
  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gn-surface-elevated)] text-[var(--gn-text)] ring-1 ring-[var(--gn-ring)] sm:h-10 sm:w-10";

function postBodyHtmlIsMeaningful(rawHtml: string): boolean {
  const html = displayPostBodyHtml(rawHtml);
  if (/gn-youtube-embed/i.test(html)) return true;
  if (/<img[\s>]|<video[\s>]|<table[\s>]/i.test(html)) return true;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

type PostDetail = {
  id: string;
  title: string;
  bodyHtml: string;
  bodyJson?: Record<string, unknown>;
  media?: PostMediaItem[];
  createdAt: string;
  score: number;
  upvotes: number;
  downvotes: number;
  viewerVote: number | null;
  commentCount?: number;
  community?: { slug: string; name: string } | null;
  author: Author;
};

type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  score: number;
  viewerVote: number | null;
  author: Pick<Author, "id" | "displayName" | "seeds" | "growerLevel">;
};

function CommentTree({
  comments,
  viewerId,
  onReply,
  onVoteComment,
  onSaveEdit,
  onReport,
  onDeleteComment,
  votingCommentId,
  deletingCommentId,
}: {
  comments: CommentRow[];
  viewerId: string | null;
  onReply: (id: string) => void;
  onVoteComment: (commentId: string, value: 1 | -1) => void;
  onSaveEdit: (comment: CommentRow, body: string) => Promise<void>;
  onReport: (
    comment: CommentRow,
    reason: string,
  ) => Promise<{ alreadyReported: boolean }>;
  onDeleteComment: (comment: CommentRow) => void | Promise<void>;
  votingCommentId: string | null;
  deletingCommentId: string | null;
}) {
  const byParent = useMemo(() => {
    const map = new Map<string | null, CommentRow[]>();
    for (const c of comments) {
      const k = c.parentId;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [comments]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<{
    commentId: string;
    text: string;
    tone: "success" | "info";
  } | null>(null);

  const startEdit = (c: CommentRow) => {
    setEditingId(c.id);
    setDraft(c.body);
    setLocalError(null);
  };

  const cancelEdit = () => {
    setLocalError(null);
    setEditingId(null);
    setDraft("");
  };

  const saveEdit = async (c: CommentRow) => {
    setLocalError(null);
    try {
      await onSaveEdit(c, draft.trim());
      setEditingId(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not save");
    }
  };

  const submitReport = async (c: CommentRow) => {
    setLocalError(null);
    setReportNotice(null);
    try {
      const { alreadyReported } = await onReport(c, reportDraft.trim());
      setReportingId(null);
      setReportDraft("");
      setReportNotice({
        commentId: c.id,
        tone: alreadyReported ? "info" : "success",
        text: alreadyReported
          ? "You already reported this comment."
          : "Thanks — moderators will review your report.",
      });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Report failed");
    }
  };

  const renderNodes = (parentId: string | null, depth: number) => {
    const kids = byParent.get(parentId) ?? [];
    return kids.map((c) => {
      const busy =
        votingCommentId === c.id || deletingCommentId === c.id;
      const isAuthor = viewerId != null && viewerId === c.authorId;
      const canDelete = isAuthor;
      const tier = c.author.growerLevel?.trim() || DEFAULT_GROWER_RANK;

      return (
        <li key={c.id} className="mt-3" id={`comment-${c.id}`}>
          <div className="flex gap-2" style={{ marginLeft: depth * 12 }}>
            <VoteScoreRail
              score={c.score}
              upvotes={c.upvotes}
              downvotes={c.downvotes}
              viewerVote={c.viewerVote}
              onUp={() => onVoteComment(c.id, 1)}
              onDown={() => onVoteComment(c.id, -1)}
              disabled={busy}
              size="sm"
            />
            <div className="min-w-0 flex-1 gn-card-subtle p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-xs text-[var(--gn-text-muted)]">
                  <UserProfileLink
                    userId={c.author.id}
                    className="font-medium text-[var(--gn-text)] transition hover:text-[#ff4500] hover:underline"
                  >
                    {c.author.displayName ?? "member"}
                  </UserProfileLink>
                  <span> · </span>
                  <span title="Grower tier">{tier}</span>
                  <span> · </span>
                  <span title="Net seeds from posts and comments">
                    {formatSeeds(c.author.seeds)} seeds
                  </span>
                  <span> · </span>
                  {new Date(c.createdAt).toLocaleString()}
                </div>
                {viewerId ? (
                  <CommentActionMenu ariaLabel={`Actions for comment by ${c.author.displayName ?? "member"}`}>
                    {isAuthor ? (
                      <MenuRow
                        onClick={() =>
                          editingId === c.id ? cancelEdit() : startEdit(c)
                        }
                      >
                        {editingId === c.id ? "Cancel edit" : "Edit"}
                      </MenuRow>
                    ) : (
                      <MenuRow
                        onClick={() => {
                          setReportingId((id) =>
                            id === c.id ? null : c.id,
                          );
                          setReportDraft("");
                          setLocalError(null);
                          setReportNotice(null);
                        }}
                      >
                        {reportingId === c.id ? "Hide report form" : "Report"}
                      </MenuRow>
                    )}
                    {canDelete ? (
                      <MenuRow
                        danger
                        onClick={() => void onDeleteComment(c)}
                        disabled={busy}
                      >
                        Delete
                      </MenuRow>
                    ) : null}
                  </CommentActionMenu>
                ) : null}
              </div>
              {localError && (editingId === c.id || reportingId === c.id) ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {localError}
                </p>
              ) : null}
              {editingId === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="gn-input w-full p-2 text-sm"
                    rows={4}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!draft.trim() || busy}
                    className="rounded-full bg-[#ff4500] px-3 py-1 text-xs font-medium text-white shadow-[0_0_12px_rgba(255,69,0,0.3)] transition hover:bg-[#ff5414] disabled:opacity-50"
                    onClick={() => void saveEdit(c)}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--gn-text)]">
                  {c.body}
                </div>
              )}
              {reportNotice?.commentId === c.id ? (
                <p
                  className={
                    reportNotice.tone === "success"
                      ? "mt-2 text-xs text-emerald-700 dark:text-emerald-400"
                      : "mt-2 text-xs text-amber-800 dark:text-amber-200"
                  }
                >
                  {reportNotice.text}
                </p>
              ) : null}
              {reportingId === c.id ? (
                <div className="mt-2 space-y-2 rounded border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-xs text-amber-900 dark:text-amber-100">
                    Moderators review reports in the admin area. You can add an
                    optional note below.
                  </p>
                  <textarea
                    className="gn-input w-full p-2 text-sm"
                    rows={2}
                    placeholder="Reason (optional)"
                    value={reportDraft}
                    onChange={(e) => setReportDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs font-medium text-amber-900 underline dark:text-amber-200"
                    onClick={() => void submitReport(c)}
                  >
                    Submit report
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className="mt-2 text-xs font-medium text-[#ff4500] transition hover:underline hover:drop-shadow-[0_0_8px_rgba(255,69,0,0.35)]"
                onClick={() => onReply(c.id)}
              >
                Reply
              </button>
            </div>
          </div>
          <ul className="list-none pl-0">
            {renderNodes(c.id, depth + 1)}
          </ul>
        </li>
      );
    });
  };

  return <ul className="list-none pl-0">{renderNodes(null, 0)}</ul>;
}

export function PostView({
  initialPost,
  initialComments,
}: {
  initialPost: PostDetail;
  initialComments: CommentRow[];
}) {
  const router = useRouter();
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [postReportOpen, setPostReportOpen] = useState(false);
  const [postReportDraft, setPostReportDraft] = useState("");
  const [postReportMsg, setPostReportMsg] = useState<string | null>(null);
  const [postReportBusy, setPostReportBusy] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMedia, setEditMedia] = useState<PostMediaItem[]>([]);
  const [editDraft, setEditDraft] = useState<{
    json: Record<string, unknown>;
    html: string;
  } | null>(null);
  const [editorMountKey, setEditorMountKey] = useState(0);
  const [editBusy, setEditBusy] = useState(false);
  /** If POST did not return tallies, hold viewerVote until GET agrees (see merge in refresh*). */
  const postVoteOverlay = useRef<{ target: number | null } | undefined>(
    undefined,
  );
  const commentVoteOverlay = useRef(
    new Map<string, { target: number | null }>(),
  );

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
    const p = await apiFetch<PostDetail>(`/posts/${post.id}`, {
      token: token ?? undefined,
    });
    const overlay = postVoteOverlay.current;
    const srv = pickViewerVote(p);
    let nextVv = srv;
    if (overlay !== undefined) {
      if (srv === overlay.target) {
        postVoteOverlay.current = undefined;
      } else {
        nextVv = overlay.target;
      }
    }
    setPost({ ...p, viewerVote: nextVv });
  }, [post.id]);

  const refreshComments = useCallback(
    async (token?: string | null) => {
      const supabase = createClient();
      const t =
        token !== undefined ? token : await getAccessTokenForApi(supabase);
      const path = `/posts/${post.id}/comments`;
      const list = await apiFetch<CommentRow[]>(path, {
        token: t ?? undefined,
      });
      const m = commentVoteOverlay.current;
      const merged = list.map((c) => {
        const srv = pickViewerVote(c);
        const ov = m.get(c.id);
        if (!ov) {
          return { ...c, viewerVote: srv };
        }
        if (srv === ov.target) {
          m.delete(c.id);
          return { ...c, viewerVote: srv };
        }
        return { ...c, viewerVote: ov.target };
      });
      setComments(merged);
    },
    [post.id],
  );

  const refreshPostRef = useRef(refreshPost);
  const refreshCommentsRef = useRef(refreshComments);
  refreshPostRef.current = refreshPost;
  refreshCommentsRef.current = refreshComments;

  useEffect(() => {
    void refreshPostRef.current();
    void refreshCommentsRef.current();
  }, [post.id]);

  useEffect(() => {
    setPostReportOpen(false);
    setPostReportDraft("");
    setPostReportMsg(null);
  }, [post.id]);

  /** Session often isn't ready on first paint; refetch so viewerVote / comment votes apply. */
  useEffect(() => {
    if (!viewerId) return;
    void refreshPostRef.current();
    void refreshCommentsRef.current();
  }, [viewerId, post.id]);

  useEffect(() => {
    const supabase = createClient();
    const id = post.id;
    const syncAll = () => {
      void refreshPostRef.current();
      void refreshCommentsRef.current();
    };
    const ch = supabase
      .channel(`post-live:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${id}`,
        },
        syncAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_votes",
          filter: `post_id=eq.${id}`,
        },
        syncAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_votes",
          filter: `post_id=eq.${id}`,
        },
        syncAll,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refreshPostRef.current();
          void refreshCommentsRef.current();
        }
      });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [post.id]);

  const votePost = async (value: 1 | -1) => {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to vote.");
        return;
      }
      postVoteOverlay.current = undefined;
      setPost((p) => {
        const t = talliesAfterVoteClick(
          p.upvotes,
          p.downvotes,
          normalizedViewerVote(p.viewerVote),
          value,
        );
        return { ...p, ...t };
      });
      const voteRes = await apiFetch<Record<string, unknown>>("/votes/post", {
        method: "POST",
        token,
        body: JSON.stringify({ postId: post.id, value }),
      });
      const metrics = parseVoteMutationResponse(voteRes);
      if (metrics) {
        postVoteOverlay.current = undefined;
        setPost((p) => ({ ...p, ...metrics }));
      } else {
        if ("viewerVote" in voteRes || "viewer_vote" in voteRes) {
          postVoteOverlay.current = {
            target: normalizedViewerVote(
              voteRes.viewerVote ?? voteRes.viewer_vote,
            ),
          };
        }
        await refreshPost();
      }
      await refreshComments(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vote failed");
      void refreshPostRef.current();
      void refreshCommentsRef.current();
    } finally {
      setBusy(false);
    }
  };

  const voteComment = async (commentId: string, value: 1 | -1) => {
    setError(null);
    setVotingCommentId(commentId);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to vote on comments.");
        return;
      }
      commentVoteOverlay.current.delete(commentId);
      setComments((list) =>
        list.map((c) => {
          if (c.id !== commentId) return c;
          const t = talliesAfterVoteClick(
            c.upvotes,
            c.downvotes,
            normalizedViewerVote(c.viewerVote),
            value,
          );
          return { ...c, ...t };
        }),
      );
      const voteRes = await apiFetch<Record<string, unknown>>(
        "/votes/comment",
        {
          method: "POST",
          token,
          body: JSON.stringify({ commentId, value }),
        },
      );
      const metrics = parseVoteMutationResponse(voteRes);
      if (metrics) {
        commentVoteOverlay.current.delete(commentId);
        setComments((list) =>
          list.map((c) =>
            c.id === commentId ? { ...c, ...metrics } : c,
          ),
        );
      } else {
        if ("viewerVote" in voteRes || "viewer_vote" in voteRes) {
          commentVoteOverlay.current.set(commentId, {
            target: normalizedViewerVote(
              voteRes.viewerVote ?? voteRes.viewer_vote,
            ),
          });
        }
        await refreshComments(token);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comment vote failed");
      void refreshPostRef.current();
      void refreshCommentsRef.current();
    } finally {
      setVotingCommentId(null);
    }
  };

  const saveCommentEdit = async (c: CommentRow, body: string) => {
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) throw new Error("Sign in to edit.");
    await apiFetch(`/posts/${c.postId}/comments/${c.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ body }),
    });
    await refreshComments(token);
    await refreshPost();
  };

  const reportComment = async (c: CommentRow, reason: string) => {
    const supabase = createClient();
    const token = await getAccessTokenForApi(supabase);
    if (!token) throw new Error("Sign in to report.");
    return apiFetch<{ ok: boolean; alreadyReported: boolean }>(
      `/posts/${c.postId}/comments/${c.id}/report`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ reason: reason || undefined }),
      },
    );
  };

  const submitPostReport = async () => {
    if (!viewerId || viewerId === post.author.id) return;
    setPostReportBusy(true);
    setPostReportMsg(null);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) throw new Error("Sign in to report.");
      const res = await apiFetch<{ alreadyReported?: boolean }>(
        `/posts/${post.id}/report`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            reason: postReportDraft.trim() || undefined,
          }),
        },
      );
      setPostReportOpen(false);
      setPostReportDraft("");
      setPostReportMsg(
        res.alreadyReported
          ? "You already reported this post."
          : "Thanks — moderators will review.",
      );
      window.setTimeout(() => setPostReportMsg(null), 4000);
    } catch (e) {
      setPostReportMsg(
        e instanceof Error ? e.message : "Could not submit report.",
      );
    } finally {
      setPostReportBusy(false);
    }
  };

  const removeComment = async (c: CommentRow) => {
    if (
      !window.confirm(
        "Delete this comment and all replies beneath it? This cannot be undone.",
      )
    ) {
      return;
    }
    setError(null);
    setDeletingCommentId(c.id);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to delete.");
        return;
      }
      await apiFetch(`/posts/${post.id}/comments/${c.id}`, {
        method: "DELETE",
        token,
      });
      await refreshComments(token);
      await refreshPost();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const setEditDraftStable = useCallback(
    (p: { json: Record<string, unknown>; html: string }) => {
      setEditDraft(p);
    },
    [],
  );

  const startEditPost = useCallback(() => {
    setError(null);
    setEditTitle(post.title);
    setEditMedia([...(post.media ?? [])]);
    setEditDraft(null);
    setEditorMountKey((k) => k + 1);
    setEditingPost(true);
  }, [post.title, post.media]);

  const cancelEditPost = useCallback(() => {
    setEditingPost(false);
    setError(null);
  }, []);

  const saveEditPost = async () => {
    setError(null);
    if (!editTitle.trim()) {
      setError("Title is required.");
      return;
    }
    if (!editDraft) {
      setError("Wait for the editor to finish loading.");
      return;
    }
    if (!bodyHtmlIsSubmittable(editDraft.html, editMedia.length)) {
      setError("Add body text or keep at least one attachment.");
      return;
    }
    setEditBusy(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to save.");
        return;
      }
      await apiFetch(`/posts/${post.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          title: editTitle.trim(),
          bodyHtml: editDraft.html,
          bodyJson: editDraft.json,
          media: editMedia,
        }),
      });
      setEditingPost(false);
      await refreshPost();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save post");
    } finally {
      setEditBusy(false);
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this post permanently?")) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to delete.");
        return;
      }
      await apiFetch(`/posts/${post.id}`, {
        method: "DELETE",
        token,
      });
      if (post.community?.slug) {
        router.push(`/community/${post.community.slug}`);
      } else {
        router.push(`/u/${post.author.id}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete post");
    } finally {
      setBusy(false);
    }
  };

  const onEditMediaReady = useCallback((url: string, kind: "image" | "video") => {
    setError(null);
    setEditMedia((prev) => {
      if (prev.length >= MAX_POST_MEDIA) return prev;
      if (prev.some((m) => m.url === url)) return prev;
      return [...prev, { url, type: kind }];
    });
  }, []);

  const submitComment = async () => {
    setError(null);
    if (!text.trim()) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const token = await getAccessTokenForApi(supabase);
      if (!token) {
        setError("Sign in to comment.");
        return;
      }
      await apiFetch(`/posts/${post.id}/comments`, {
        method: "POST",
        token,
        body: JSON.stringify({
          body: text.trim(),
          parentId: replyTo,
        }),
      });
      setText("");
      setReplyTo(null);
      await refreshComments(token);
      await refreshPost();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  };

  const authorTier = post.author.growerLevel?.trim() || DEFAULT_GROWER_RANK;
  const isOp = Boolean(viewerId && viewerId === post.author.id);
  const showPostBody = postBodyHtmlIsMeaningful(post.bodyHtml);
  const showPostMedia = Boolean(post.media && post.media.length > 0);
  const commentsTotal =
    typeof post.commentCount === "number"
      ? post.commentCount
      : comments.length;

  const authorInitial =
    (post.author.displayName ?? "m").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <article className="relative z-20 overflow-visible rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-sm)]">
        <div className="overflow-hidden rounded-t-2xl">
        <div className="p-3.5 sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            {post.community ? (
              <CommunityIcon
                iconKey={null}
                nameFallback={post.community.name}
                slugFallback={post.community.slug}
                frameClassName={`${headerIconFrame} text-xs font-semibold`}
              />
            ) : post.author.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={post.author.avatarUrl}
                alt=""
                className={`${headerIconFrame} object-cover text-xs font-semibold`}
              />
            ) : (
              <span
                className={`${headerIconFrame} text-xs font-semibold`}
                aria-hidden
              >
                {authorInitial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--gn-text-muted)] sm:text-sm">
                {post.community ? (
                  <>
                    <Link
                      href={`/community/${post.community.slug}`}
                      className="font-semibold text-[var(--gn-text)] hover:underline"
                    >
                      {post.community.name.trim() || post.community.slug}
                    </Link>
                    <span aria-hidden>·</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-[var(--gn-text)]">
                      Profile post
                    </span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <UserProfileLink
                  userId={post.author.id}
                  className="font-medium text-[var(--gn-text)] hover:text-[#ff4500] hover:underline"
                >
                  {post.author.displayName ?? "member"}
                </UserProfileLink>
                <span aria-hidden>·</span>
                <span title="Tier based on seeds">{authorTier}</span>
                <span aria-hidden>·</span>
                <span title="Net seeds from this grower">
                  {formatSeeds(post.author.seeds)} seeds
                </span>
                <span aria-hidden>·</span>
                <span title={new Date(post.createdAt).toLocaleString()}>
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              </div>
              {editingPost ? (
                <input
                  className="gn-input mt-2 w-full text-xl font-bold text-[var(--gn-text)] sm:text-2xl"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={TITLE_MAX_LEN}
                  aria-label="Post title"
                />
              ) : (
                <h1 className="mt-2 text-xl font-bold leading-snug text-[var(--gn-text)] sm:text-2xl">
                  {post.title}
                </h1>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <FollowUserButton
                  userId={post.author.id}
                  following={post.author.viewerFollowing ?? false}
                  viewerId={viewerId}
                  onFollowingChange={(v) =>
                    setPost((p) => ({
                      ...p,
                      author: { ...p.author, viewerFollowing: v },
                    }))
                  }
                  onFollowComplete={refreshPost}
                />
                {isOp && !editingPost ? (
                  <>
                    <button
                      type="button"
                      onClick={startEditPost}
                      disabled={busy || editBusy}
                      className="rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)] disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePost()}
                      disabled={busy || editBusy}
                      className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
                {isOp && editingPost ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void saveEditPost()}
                      disabled={editBusy}
                      className="rounded-full bg-[#ff4500] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {editBusy ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditPost}
                      disabled={editBusy}
                      className="rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--gn-text)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : null}
                {viewerId && !isOp && !editingPost ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPostReportOpen((o) => !o);
                      setPostReportMsg(null);
                    }}
                    className="rounded-full border border-[var(--gn-ring)] bg-[var(--gn-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--gn-text)] transition hover:bg-[var(--gn-surface-hover)]"
                  >
                    {postReportOpen ? "Close report" : "Report post"}
                  </button>
                ) : null}
              </div>
              {viewerId && !isOp && postReportMsg ? (
                <p className="mt-2 text-sm text-[var(--gn-text-muted)]">
                  {postReportMsg}
                </p>
              ) : null}
              {viewerId && !isOp && postReportOpen && !editingPost ? (
                <div
                  className="mt-3 rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-3"
                  data-interactive
                >
                  <p className="text-xs text-[var(--gn-text-muted)]">
                    Report this post to moderators (optional note).
                  </p>
                  <textarea
                    className="gn-input mt-2 w-full p-2 text-sm"
                    rows={2}
                    placeholder="Reason (optional)"
                    value={postReportDraft}
                    onChange={(e) => setPostReportDraft(e.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={postReportBusy}
                      className="rounded-full bg-[#ff4500] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      onClick={() => void submitPostReport()}
                    >
                      {postReportBusy ? "Sending…" : "Submit report"}
                    </button>
                    <button
                      type="button"
                      disabled={postReportBusy}
                      className="rounded-full border border-[var(--gn-ring)] px-3 py-1.5 text-xs text-[var(--gn-text)] disabled:opacity-50"
                      onClick={() => {
                        setPostReportOpen(false);
                        setPostReportDraft("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {editingPost ? (
          <div className="border-t border-[var(--gn-divide)] gn-post-content-flow">
            <div className="p-3 sm:p-4">
              <PostEditor
                key={editorMountKey}
                embedded
                initialJson={post.bodyJson ?? null}
                onChange={setEditDraftStable}
                disabled={editBusy}
              />
            </div>
            <div className="space-y-3 border-t border-[var(--gn-divide)] p-3 sm:p-4">
              <PostMediaDropzone
                disabled={editBusy}
                onMediaReady={onEditMediaReady}
                onError={setError}
              />
              {editMedia.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {editMedia.map((m, idx) => (
                    <li
                      key={`${m.url}-${idx}`}
                      className="relative overflow-hidden rounded-lg ring-1 ring-[var(--gn-ring)]"
                    >
                      {m.type === "image" ? (
                        <img
                          src={m.url}
                          alt=""
                          className="h-24 w-24 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center bg-[var(--gn-surface-elevated)] text-xs font-medium text-[var(--gn-text-muted)]">
                          Video
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={editBusy}
                        aria-label="Remove attachment"
                        className="absolute right-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-xs text-white hover:bg-black/75 disabled:opacity-50"
                        onClick={() =>
                          setEditMedia((list) =>
                            list.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : showPostBody || showPostMedia ? (
          <div className="border-t border-[var(--gn-divide)] gn-post-content-flow">
            {showPostBody ? (
              <div
                className="gn-post-body prose prose-zinc max-w-none px-3.5 py-4 prose-p:text-[0.9375rem] prose-p:leading-relaxed dark:prose-invert sm:px-5 sm:py-5"
                dangerouslySetInnerHTML={{
                  __html: displayPostBodyHtml(post.bodyHtml),
                }}
                onClick={(e) => {
                  const el = (e.target as HTMLElement).closest?.(
                    ".gn-spoiler",
                  );
                  if (!el) return;
                  e.preventDefault();
                  const cur = el.getAttribute("data-revealed");
                  el.setAttribute(
                    "data-revealed",
                    cur === "true" ? "false" : "true",
                  );
                }}
              />
            ) : null}
            {showPostMedia ? (
              <PostMediaCarousel items={post.media!} embedded />
            ) : null}
          </div>
        ) : null}
        </div>

        <div
          className="flex flex-col gap-2 rounded-b-2xl border-t border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-3.5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-5"
          data-interactive
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <VoteFeedPill
              score={post.score}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              viewerVote={post.viewerVote}
              onUp={() => void votePost(1)}
              onDown={() => void votePost(-1)}
              disabled={busy}
            />
            <Link
              href="#comments"
              prefetch={false}
              aria-label={`${commentsTotal} comments — jump to discussion`}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-3 text-xs font-medium text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition hover:bg-[var(--gn-surface-hover)]"
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
              <span className="tabular-nums">{compactCount(commentsTotal)}</span>
              <span className="hidden sm:inline">comments</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center sm:justify-end">
            <PostShareButton
              postId={post.id}
              postTitle={post.title}
              viewerId={viewerId}
            />
          </div>
        </div>
      </article>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <section
        id="comments"
        className="relative z-10 scroll-mt-20 rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] p-3.5 shadow-[var(--gn-shadow-sm)] sm:scroll-mt-24 sm:p-5"
      >
        <h2 className="text-base font-semibold text-[var(--gn-text)] sm:text-lg">
          Comments
        </h2>
        <div className="mt-3 space-y-2">
          <textarea
            className="gn-input min-h-[5.5rem] w-full p-3 text-sm sm:min-h-[6rem]"
            rows={4}
            placeholder="Join the discussion…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {replyTo ? (
            <div className="text-xs text-[var(--gn-text-muted)]">
              Replying to a thread.{" "}
              <button
                type="button"
                className="font-medium text-[#ff4500] underline"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={submitComment}
            disabled={busy}
            className="w-full rounded-full bg-[#ff4500] px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_16px_rgba(255,69,0,0.3)] transition hover:bg-[#ff5414] hover:shadow-[0_0_24px_rgba(255,69,0,0.4)] disabled:opacity-50 sm:w-auto"
          >
            Comment
          </button>
        </div>
        <div className="mt-5 sm:mt-6">
          <CommentTree
            comments={comments}
            viewerId={viewerId}
            onReply={(id) => setReplyTo(id)}
            onVoteComment={voteComment}
            onSaveEdit={saveCommentEdit}
            onReport={reportComment}
            onDeleteComment={removeComment}
            votingCommentId={votingCommentId}
            deletingCommentId={deletingCommentId}
          />
        </div>
      </section>
    </div>
  );
}
