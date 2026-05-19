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
import { BlocksService } from '../blocks/blocks.service';
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

const VOTE_MILESTONES = [50, 100, 500] as const;

function voteMilestoneCrossed(
  scoreBefore: number,
  scoreAfter: number,
): number | null {
  let crossed: number | null = null;
  for (const m of VOTE_MILESTONES) {
    if (scoreBefore < m && scoreAfter >= m) crossed = m;
  }
  return crossed;
}

async function postVoteScore(db: ReturnType<typeof getDb>, postId: string) {
  const [{ score }] = await db
    .select({
      score: sql<number>`coalesce(sum(${postVotes.value})::int, 0)`.as('score'),
    })
    .from(postVotes)
    .where(eq(postVotes.postId, postId));
  return Number(score ?? 0);
}

async function notebookVoteScore(
  db: ReturnType<typeof getDb>,
  notebookId: string,
) {
  const [{ score }] = await db
    .select({
      score: sql<number>`coalesce(sum(${notebookVotes.value})::int, 0)`.as(
        'score',
      ),
    })
    .from(notebookVotes)
    .where(eq(notebookVotes.notebookId, notebookId));
  return Number(score ?? 0);
}

@Injectable()
export class VotesService {
  constructor(
    private readonly blocks: BlocksService,
    private readonly notebooksSvc: NotebooksService,
    private readonly notifications: NotificationsService,
    private readonly profiles: ProfilesService,
  ) {}

  private async assertCanVoteOnProfileContent(
    authorId: string,
    voterId: string,
  ) {
    if (authorId !== voterId) {
      if (await this.blocks.hasBlockBetween(voterId, authorId)) {
        throw new NotFoundException('Not found');
      }
      const vis = await this.profiles.getProfileFeedVisibility(authorId, voterId);
      if (!vis.allowPosts) {
        throw new NotFoundException('Not found');
      }
    }
  }

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

    await this.assertCanVoteOnProfileContent(post.authorId, userId);

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
    const scoreBefore =
      post.authorId !== userId ? await postVoteScore(db, postId) : 0;
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
      const scoreAfter = await postVoteScore(db, postId);
      const milestone = voteMilestoneCrossed(scoreBefore, scoreAfter);
      if (milestone != null) {
        await this.notifications.createForUser(
          post.authorId,
          'Vote milestone!',
          `Your post “${truncateNotif(post.title, 80)}” reached ${milestone} seeds.`,
          {
            kind: 'vote_milestone',
            actionUrl: `/p/${postId}`,
          },
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

    await this.assertCanVoteOnProfileContent(c.authorId, userId);

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
    if (nb.ownerId !== userId) {
      if (await this.blocks.hasBlockBetween(userId, nb.ownerId)) {
        throw new NotFoundException('Notebook not found');
      }
    }

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

    const scoreBefore =
      nb.ownerId !== userId
        ? await notebookVoteScore(db, notebookId)
        : 0;
    await setNotebookVoteRow(db, userId, notebookId, value, prev !== null);

    if (nb.ownerId !== userId) {
      const scoreAfter = await notebookVoteScore(db, notebookId);
      const milestone = voteMilestoneCrossed(scoreBefore, scoreAfter);
      if (milestone != null) {
        await this.notifications.createForUser(
          nb.ownerId,
          'Vote milestone!',
          `Your journal “${truncateNotif(nb.title, 80)}” reached ${milestone} seeds.`,
          {
            kind: 'vote_milestone',
            actionUrl: `/notebooks/${notebookId}`,
          },
        );
      }
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
