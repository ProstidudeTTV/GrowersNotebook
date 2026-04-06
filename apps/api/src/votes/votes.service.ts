import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { commentVotes, comments, postVotes, posts } from '../db/schema';

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
}
