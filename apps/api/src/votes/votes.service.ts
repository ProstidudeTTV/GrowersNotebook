import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import {
  commentVotes,
  comments,
  notebookVotes,
  notebooks,
  postVotes,
  posts,
} from '../db/schema';
import { NotebooksService } from '../notebooks/notebooks.service';

async function setPostVoteRow(
  db: ReturnType<typeof getDb>,
  userId: string,
  postId: string,
  value: -1 | 1,
  hadRow: boolean,
) {
  if (!hadRow) {
    await db.insert(postVotes).values({ userId, postId, value });
  } else {
    await db
      .update(postVotes)
      .set({ value })
      .where(
        and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)),
      );
  }
}

async function setNotebookVoteRow(
  db: ReturnType<typeof getDb>,
  userId: string,
  notebookId: string,
  value: -1 | 1,
  hadRow: boolean,
) {
  if (!hadRow) {
    await db
      .insert(notebookVotes)
      .values({ userId, notebookId, value });
  } else {
    await db
      .update(notebookVotes)
      .set({ value })
      .where(
        and(
          eq(notebookVotes.userId, userId),
          eq(notebookVotes.notebookId, notebookId),
        ),
      );
  }
}

async function setCommentVoteRow(
  db: ReturnType<typeof getDb>,
  userId: string,
  commentId: string,
  postId: string,
  value: -1 | 1,
  hadRow: boolean,
) {
  if (!hadRow) {
    await db
      .insert(commentVotes)
      .values({ userId, commentId, postId, value });
  } else {
    await db
      .update(commentVotes)
      .set({ value })
      .where(
        and(
          eq(commentVotes.userId, userId),
          eq(commentVotes.commentId, commentId),
        ),
      );
  }
}

@Injectable()
export class VotesService {
  constructor(private readonly notebooksSvc: NotebooksService) {}

  async votePost(userId: string, postId: string, value: -1 | 1) {
    const db = getDb();
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post) throw new NotFoundException('Post not found');

    const [existing] = await db
      .select({ value: postVotes.value })
      .from(postVotes)
      .where(and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)));

    const prev = existing?.value === undefined ? null : Number(existing.value);
    const incoming = Number(value);
    if (prev === incoming) {
      await db
        .delete(postVotes)
        .where(and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)));
      return {
        ok: true as const,
        removed: true as const,
        viewerVote: null,
      };
    }

    await setPostVoteRow(db, userId, postId, value, prev !== null);
    return {
      ok: true as const,
      removed: false as const,
      viewerVote: incoming === 1 ? 1 : -1,
    };
  }

  async voteComment(userId: string, commentId: string, value: -1 | 1) {
    const db = getDb();
    const [c] = await db
      .select({ id: comments.id, postId: comments.postId })
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!c) throw new NotFoundException('Comment not found');

    const [existing] = await db
      .select({ value: commentVotes.value })
      .from(commentVotes)
      .where(
        and(
          eq(commentVotes.userId, userId),
          eq(commentVotes.commentId, commentId),
        ),
      );

    const prev = existing?.value === undefined ? null : Number(existing.value);
    const incoming = Number(value);
    if (prev === incoming) {
      await db
        .delete(commentVotes)
        .where(
          and(
            eq(commentVotes.userId, userId),
            eq(commentVotes.commentId, commentId),
          ),
        );
      return {
        ok: true as const,
        removed: true as const,
        viewerVote: null,
      };
    }

    await setCommentVoteRow(
      db,
      userId,
      commentId,
      c.postId,
      value,
      prev !== null,
    );
    return {
      ok: true as const,
      removed: false as const,
      viewerVote: incoming === 1 ? 1 : -1,
    };
  }

  async removePostVote(userId: string, postId: string) {
    const db = getDb();
    await db
      .delete(postVotes)
      .where(
        and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)),
      );
    return { ok: true };
  }

  async voteNotebook(userId: string, notebookId: string, value: -1 | 1) {
    const db = getDb();
    const [nb] = await db
      .select({ id: notebooks.id, ownerId: notebooks.ownerId })
      .from(notebooks)
      .where(eq(notebooks.id, notebookId));
    if (!nb) throw new NotFoundException('Notebook not found');
    await this.notebooksSvc.assertNotebookReadableByOwnerSettings(
      nb.ownerId,
      userId,
    );

    const [existing] = await db
      .select({ value: notebookVotes.value })
      .from(notebookVotes)
      .where(
        and(
          eq(notebookVotes.userId, userId),
          eq(notebookVotes.notebookId, notebookId),
        ),
      );

    const prev = existing?.value === undefined ? null : Number(existing.value);
    const incoming = Number(value);
    if (prev === incoming) {
      await db
        .delete(notebookVotes)
        .where(
          and(
            eq(notebookVotes.userId, userId),
            eq(notebookVotes.notebookId, notebookId),
          ),
        );
      const m = await this.notebookVoteMetrics(notebookId, userId);
      return {
        ok: true as const,
        removed: true as const,
        ...m,
      };
    }

    await setNotebookVoteRow(db, userId, notebookId, value, prev !== null);
    const m = await this.notebookVoteMetrics(notebookId, userId);
    return {
      ok: true as const,
      removed: false as const,
      ...m,
    };
  }

  private async notebookVoteMetrics(notebookId: string, viewerId: string) {
    const db = getDb();
    const [{ score, upvotes, downvotes }] = await db
      .select({
        score: sql<number>`coalesce(sum(${notebookVotes.value})::int, 0)`.as(
          'score',
        ),
        upvotes: sql<number>`coalesce(sum(case when ${notebookVotes.value} = 1 then 1 else 0 end)::int, 0)`.as(
          'upvotes',
        ),
        downvotes: sql<number>`coalesce(sum(case when ${notebookVotes.value} = -1 then 1 else 0 end)::int, 0)`.as(
          'downvotes',
        ),
      })
      .from(notebookVotes)
      .where(eq(notebookVotes.notebookId, notebookId));

    const [vrow] = await db
      .select({ value: notebookVotes.value })
      .from(notebookVotes)
      .where(
        and(
          eq(notebookVotes.notebookId, notebookId),
          eq(notebookVotes.userId, viewerId),
        ),
      );

    return {
      score: Number(score ?? 0),
      upvotes: Number(upvotes ?? 0),
      downvotes: Number(downvotes ?? 0),
      viewerVote:
        vrow?.value === undefined ? null : (Number(vrow.value) as -1 | 1),
    };
  }
}
