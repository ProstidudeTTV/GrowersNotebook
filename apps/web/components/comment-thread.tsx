"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { loginHref } from "@/lib/login-return-path";
import {
  CommentActionMenu,
  MenuRow,
} from "@/components/comment-action-menu";
import {
  CommentDiscussionComposer,
} from "@/components/comment-discussion-composer";
import { StackedDmStyleImages } from "@/components/stacked-dm-style-images";
import { VoteScoreRail } from "@/components/vote-score-rail";
import { UserProfileLink } from "@/components/user-profile-link";
import { DEFAULT_GROWER_RANK, formatSeeds } from "@/lib/grower-display";
import { dedupeUrlsPreserveOrder } from "@/lib/dm-media-url";

const COMMENT_AVATAR_COLORS = [
  "bg-[var(--gn-accent)]",
  "bg-teal-800",
  "bg-sky-800",
  "bg-violet-800",
  "bg-amber-800",
] as const;

function nameColorClass(name: string | null | undefined): string {
  if (!name) return COMMENT_AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h * 31) + name.charCodeAt(i)) >>> 0;
  }
  return COMMENT_AVATAR_COLORS[h % COMMENT_AVATAR_COLORS.length];
}

export type CommentThreadAuthor = {
  id: string;
  displayName: string | null;
  avatarUrl?: string | null;
  seeds?: number | null;
  growerLevel?: string | null;
};

export type CommentThreadItem = {
  id: string;
  postId?: string;
  authorId: string;
  parentId: string | null;
  body: string;
  imageUrls?: string[];
  createdAt: string;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  viewerVote?: number | null;
  author: CommentThreadAuthor;
  parentAuthor?: Pick<CommentThreadAuthor, "id" | "displayName"> | null;
};

function commentImageUrls(c: Pick<CommentThreadItem, "imageUrls">): string[] {
  const u = c.imageUrls?.filter(Boolean) ?? [];
  return dedupeUrlsPreserveOrder(u);
}

function CommentAvatar({
  displayName,
  avatarUrl,
  size = "md",
}: {
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: "md" | "sm";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-[11px]";
  if (avatarUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-[var(--gn-ring)]`}
      />
    );
  }
  const initial = (displayName ?? "").trim().charAt(0).toUpperCase() || "?";
  const colorClass = nameColorClass(displayName);
  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full ${colorClass} font-semibold text-white`}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function CommentThread({
  comments,
  viewerId,
  enableVotes = true,
  onVoteComment,
  onReplySubmit,
  onSaveEdit,
  onReport,
  onDeleteComment,
  onOpenCommentImages,
  votingCommentId,
  deletingCommentId,
  replyDisabled = false,
}: {
  comments: CommentThreadItem[];
  viewerId: string | null;
  enableVotes?: boolean;
  onVoteComment?: (commentId: string, value: 1 | -1) => void;
  onReplySubmit: (
    parentId: string,
    payload: { body: string; imageUrls: string[] },
  ) => Promise<void>;
  onSaveEdit?: (comment: CommentThreadItem, body: string) => Promise<void>;
  onReport?: (
    comment: CommentThreadItem,
    reason: string,
  ) => Promise<{ alreadyReported: boolean }>;
  onDeleteComment?: (comment: CommentThreadItem) => void | Promise<void>;
  onOpenCommentImages: (urls: string[], index: number) => void;
  votingCommentId?: string | null;
  deletingCommentId?: string | null;
  replyDisabled?: boolean;
}) {
  const byParent = useMemo(() => {
    const map = new Map<string | null, CommentThreadItem[]>();
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
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const signInToReportHref = loginHref(
    pathname,
    searchParams.toString() || undefined,
  );

  const startEdit = (c: CommentThreadItem) => {
    setEditingId(c.id);
    setDraft(c.body);
    setLocalError(null);
  };

  const cancelEdit = () => {
    setLocalError(null);
    setEditingId(null);
    setDraft("");
  };

  const saveEdit = async (c: CommentThreadItem) => {
    if (!onSaveEdit) return;
    setLocalError(null);
    try {
      await onSaveEdit(c, draft.trim());
      setEditingId(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not save");
    }
  };

  const submitReport = async (c: CommentThreadItem) => {
    if (!onReport) return;
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

  const submitInlineReply = async (
    parentId: string,
    payload: { body: string; imageUrls: string[] },
  ) => {
    setReplyBusy(true);
    setLocalError(null);
    try {
      await onReplySubmit(parentId, payload);
      setReplyingToId(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Reply failed");
      throw e;
    } finally {
      setReplyBusy(false);
    }
  };

  const renderComment = (c: CommentThreadItem, depth: number) => {
    const busy =
      votingCommentId === c.id ||
      deletingCommentId === c.id ||
      (replyingToId === c.id && replyBusy);
    const cImgs = commentImageUrls(c);
    const isAuthor = viewerId != null && viewerId === c.authorId;
    const canDelete = isAuthor && Boolean(onDeleteComment);
    const tier = c.author.growerLevel?.trim() || DEFAULT_GROWER_RANK;
    const upvotes = c.upvotes ?? 0;
    const downvotes = c.downvotes ?? 0;
    const score = c.score ?? upvotes - downvotes;
    const canReply = Boolean(viewerId && !replyDisabled);
    const replyParentId = depth === 0 ? c.id : (c.parentId ?? c.id);
    const isReplying = replyingToId === c.id;
    const canReport = Boolean(onReport) && !isAuthor;
    const showReportForm = reportingId === c.id && canReport && viewerId;

    return (
      <li
        key={c.id}
        id={`comment-${c.id}`}
        className={depth === 0 ? "mt-4 first:mt-0" : "mt-3"}
      >
        <div
          className={`flex gap-2.5 ${depth > 0 ? "ml-10 border-l-2 border-[var(--gn-divide)] pl-3" : ""}`}
        >
          <CommentAvatar
            displayName={c.author.displayName}
            avatarUrl={c.author.avatarUrl}
            size={depth === 0 ? "md" : "sm"}
          />
          <div className="min-w-0 flex-1 rounded-2xl bg-[var(--gn-surface-elevated)] px-3.5 py-3 shadow-[var(--gn-shadow-sm)] ring-1 ring-[var(--gn-ring)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-xs text-[var(--gn-text-muted)]">
                <UserProfileLink
                  userId={c.author.id}
                  className="font-semibold text-[var(--gn-text)] transition hover:text-[var(--gn-accent)] hover:underline"
                >
                  {c.author.displayName ?? "member"}
                </UserProfileLink>
                {c.parentAuthor && depth > 0 ? (
                  <>
                    <span> · </span>
                    <span>
                      replying to{" "}
                      <UserProfileLink
                        userId={c.parentAuthor.id}
                        className="font-medium text-[var(--gn-text)] hover:text-[var(--gn-accent)] hover:underline"
                      >
                        {c.parentAuthor.displayName ?? "member"}
                      </UserProfileLink>
                    </span>
                  </>
                ) : null}
                <span> · </span>
                <span title="Grower tier">{tier}</span>
                {c.author.seeds != null ? (
                  <>
                    <span> · </span>
                    <span title="Net seeds from posts and comments">
                      {formatSeeds(c.author.seeds)} seeds
                    </span>
                  </>
                ) : null}
                <span> · </span>
                <time dateTime={c.createdAt}>
                  {new Date(c.createdAt).toLocaleString()}
                </time>
              </div>
              {!viewerId && onReport ? (
                <Link
                  href={signInToReportHref}
                  className="text-xs font-medium text-[var(--gn-accent)] hover:underline"
                >
                  Sign in to report
                </Link>
              ) : viewerId && (onSaveEdit || canReport || canDelete) ? (
                <CommentActionMenu
                  ariaLabel={`Actions for comment by ${c.author.displayName ?? "member"}`}
                >
                  {isAuthor && onSaveEdit ? (
                    <MenuRow
                      onClick={() =>
                        editingId === c.id ? cancelEdit() : startEdit(c)
                      }
                    >
                      {editingId === c.id ? "Cancel edit" : "Edit"}
                    </MenuRow>
                  ) : null}
                  {canReport ? (
                    <MenuRow
                      onClick={() => {
                        setReportingId((id) => (id === c.id ? null : c.id));
                        setReportDraft("");
                        setLocalError(null);
                        setReportNotice(null);
                      }}
                    >
                      {showReportForm ? "Hide report form" : "Report"}
                    </MenuRow>
                  ) : null}
                  {canDelete ? (
                    <MenuRow
                      danger
                      onClick={() => void onDeleteComment?.(c)}
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

            {editingId === c.id && onSaveEdit ? (
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
                  className="rounded-full bg-[var(--gn-accent)] px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
                  onClick={() => void saveEdit(c)}
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                {c.body.trim() ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gn-text)]">
                    {c.body}
                  </p>
                ) : null}
                {cImgs.length > 0 ? (
                  <div
                    className={`overflow-visible ${c.body.trim() ? "mt-2.5" : "mt-1"}`}
                  >
                    <StackedDmStyleImages
                      urls={cImgs}
                      stackKey={c.id}
                      compact
                      onOpen={(index) => onOpenCommentImages(cImgs, index)}
                    />
                  </div>
                ) : null}
              </>
            )}

            {reportNotice?.commentId === c.id ? (
              <p
                className={
                  reportNotice.tone === "success"
                    ? "mt-2 text-xs text-[var(--gn-accent)]"
                    : "mt-2 text-xs text-amber-800 dark:text-amber-200"
                }
              >
                {reportNotice.text}
              </p>
            ) : null}

            {showReportForm ? (
              <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-900 dark:bg-amber-950/40">
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

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {enableVotes && onVoteComment && viewerId ? (
                <div className="flex items-center gap-1" data-interactive>
                  <VoteScoreRail
                    score={score}
                    upvotes={upvotes}
                    downvotes={downvotes}
                    viewerVote={c.viewerVote}
                    onUp={() => onVoteComment(c.id, 1)}
                    onDown={() => onVoteComment(c.id, -1)}
                    disabled={busy}
                    size="sm"
                    titles={{ up: "Seed up", down: "Seed down" }}
                  />
                </div>
              ) : null}
              {canReply ? (
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--gn-accent)] transition hover:underline"
                  onClick={() =>
                    setReplyingToId((id) => (id === c.id ? null : c.id))
                  }
                >
                  {isReplying ? "Cancel" : "Reply"}
                </button>
              ) : null}
              {canReport && viewerId ? (
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--gn-text-muted)] transition hover:text-[var(--gn-accent)] hover:underline"
                  onClick={() => {
                    setReportingId((id) => (id === c.id ? null : c.id));
                    setReportDraft("");
                    setLocalError(null);
                    setReportNotice(null);
                  }}
                >
                  {showReportForm ? "Cancel report" : "Report"}
                </button>
              ) : null}
              {!viewerId && onReport ? (
                <Link
                  href={signInToReportHref}
                  className="text-xs font-medium text-[var(--gn-text-muted)] hover:text-[var(--gn-accent)] hover:underline"
                >
                  Sign in to report
                </Link>
              ) : null}
            </div>

            {isReplying && canReply ? (
              <div className="mt-3 border-t border-[var(--gn-divide)]/60 pt-3">
                <CommentDiscussionComposer
                  viewerId={viewerId}
                  disabled={busy}
                  placeholder={`Reply to ${c.author.displayName ?? "member"}…`}
                  submitLabel="Reply"
                  onSubmit={(payload) => submitInlineReply(replyParentId, payload)}
                  onSubmitError={(msg) => setLocalError(msg)}
                />
              </div>
            ) : null}
          </div>
        </div>

        {byParent.has(c.id) ? (
          <ul className="list-none pl-0">
            {(byParent.get(c.id) ?? []).map((child) =>
              renderComment(child, depth + 1),
            )}
          </ul>
        ) : null}
      </li>
    );
  };

  const roots = byParent.get(null) ?? [];
  if (roots.length === 0) return null;

  return <ul className="list-none pl-0">{roots.map((c) => renderComment(c, 0))}</ul>;
}
