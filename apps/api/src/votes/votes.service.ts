import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { growerLevelFromSeeds } from '../common/grower-seeds';
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
import { NotificationsService } from '../notifications/notifications.service';
import { ProfilesService } from '../profiles/profiles.service';

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

function truncateNotif(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

@Injectable()
export class VotesService {
  constructor(
    private readonly notebooksSvc: NotebooksService,
    private readonly notifications: NotificationsService,
    private readonly profiles: ProfilesService,
  ) {}

  async votePost(userId: string, postId: string, value: -1 | 1) {
    const db = getDb();
    const [post] = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
      })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post) throw new NotFoundException('Post not found');

    let seedsBefore = 0;
    let levelBefore = '';
    if (post.authorId !== userId) {
      const beforeMap = await this.profiles.getSeedsByUserIds([post.authorId]);
      seedsBefore = beforeMap.get(post.authorId) ?? 0;
      levelBefore = growerLevelFromSeeds(seedsBefore);
    }

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

    if (post.authorId !== userId) {
      const isUpvote = incoming === 1;
      if (isUpvote) {
        await this.notifications.createForUser(
          post.authorId,
          'Upvote on your post',
          `Someone upvoted “${truncateNotif(post.title, 100)}”.`,
          { actionUrl: `/p/${postId}` },
        );
      }
      const afterMap = await this.profiles.getSeedsByUserIds([post.authorId]);
      const seedsAfter = afterMap.get(post.authorId) ?? 0;
      const levelAfter = growerLevelFromSeeds(seedsAfter);
      if (seedsAfter > seedsBefore && levelAfter !== levelBefore) {
        await this.notifications.createForUser(
          post.authorId,
          'You leveled up!',
          `You reached ${levelAfter}.`,
          { actionUrl: `/u/${post.authorId}` },
        );
      }
    }

    return {
      ok: true as const,
      removed: false as const,
      viewerVote: incoming === 1 ? 1 : -1,
    };
  }

  async voteComment(userId: string, commentId: string, value: -1 | 1) {
    const db = getDb();
    const [c] = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        body: comments.body,
      })
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!c) throw new NotFoundException('Comment not found');

    let seedsBefore = 0;
    let levelBefore = '';
    if (c.authorId !== userId) {
      const beforeMap = await this.profiles.getSeedsByUserIds([c.authorId]);
      seedsBefore = beforeMap.get(c.authorId) ?? 0;
      levelBefore = growerLevelFromSeeds(seedsBefore);
    }

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

    if (c.authorId !== userId) {
      const isUpvote = incoming === 1;
      if (isUpvote) {
        const [postRow] = await db
          .select({ title: posts.title })
          .from(posts)
          .where(eq(posts.id, c.postId));
        const postTitle = postRow?.title ?? 'a post';
        const preview = truncateNotif(
          c.body?.trim() || '(comment)',
          80,
        );
        await this.notifications.createForUser(
          c.authorId,
          'Upvote on your comment',
          `On “${truncateNotif(postTitle, 60)}”: ${preview}`,
          { actionUrl: `/p/${c.postId}#comment-${commentId}` },
        );
      }
      const afterMap = await this.profiles.getSeedsByUserIds([c.authorId]);
      const seedsAfter = afterMap.get(c.authorId) ?? 0;
      const levelAfter = growerLevelFromSeeds(seedsAfter);
      if (seedsAfter > seedsBefore && levelAfter !== levelBefore) {
        await this.notifications.createForUser(
          c.authorId,
          'You leveled up!',
          `You reached ${levelAfter}.`,
          { actionUrl: `/u/${c.authorId}` },
        );
      }
    }

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
      .select({
        id: notebooks.id,
        ownerId: notebooks.ownerId,
        title: notebooks.title,
      })
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

    if (nb.ownerId !== userId && incoming === 1) {
      await this.notifications.createForUser(
        nb.ownerId,
        'Upvote on your notebook',
        `Someone upvoted “${truncateNotif(nb.title, 100)}”.`,
        { actionUrl: `/notebooks/${notebookId}#comments` },
      );
    }

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
