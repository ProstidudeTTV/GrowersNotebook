import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asc, count, desc, eq, sql } from 'drizzle-orm';
import { isAllowedPostMediaPublicUrl } from '../common/post-media-public-url';
import { growerLevelFromSeeds } from '../common/grower-seeds';
import { viewerVoteFromRow } from '../common/normalize-viewer-vote';
import { getDb } from '../db';
import { ProfilesService } from '../profiles/profiles.service';
import {
  commentReports,
  commentVotes,
  comments,
  communities,
  posts,
  profiles,
} from '../db/schema';

const commentUpVotesExpr = sql<number>`coalesce((select count(*)::int from ${commentVotes} where ${commentVotes.commentId} = ${comments.id} and ${commentVotes.value} = 1), 0)`;

const commentDownVotesExpr = sql<number>`coalesce((select count(*)::int from ${commentVotes} where ${commentVotes.commentId} = ${comments.id} and ${commentVotes.value} = -1), 0)`;

const commentScoreExpr = sql<number>`coalesce((select sum(${commentVotes.value})::int from ${commentVotes} where ${commentVotes.commentId} = ${comments.id}), 0)`;

const COMMENT_IMAGE_MAX = 8;

function parseStoredCommentImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const u = raw.filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  return u.map((s) => s.trim());
}

function commentViewerVoteSelect(viewerId: string | undefined) {
  if (!viewerId) {
    return sql<number | null>`null`.as('viewerVote');
  }
  return sql<number | null>`(
    select ${commentVotes.value}::int from ${commentVotes}
    where ${commentVotes.commentId} = ${comments.id} and ${commentVotes.userId} = ${viewerId}::uuid
    limit 1
  )`.as('viewerVote');
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly config: ConfigService,
  ) {}

  private normalizeIncomingImageUrls(urls: string[] | undefined): string[] {
    if (!urls?.length) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of urls) {
      const t = u.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= COMMENT_IMAGE_MAX) break;
    }
    for (const u of out) {
      if (!isAllowedPostMediaPublicUrl(this.config, u)) {
        throw new BadRequestException('Invalid image URL.');
      }
    }
    return out;
  }

  async create(
    authorId: string,
    dto: {
      postId: string;
      parentId: string | null;
      body?: string;
      imageUrls?: string[];
    },
  ) {
    const db = getDb();
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, dto.postId));
    if (!post) throw new NotFoundException('Post not found');

    if (dto.parentId) {
      const [parent] = await db
        .select({ id: comments.id, postId: comments.postId })
        .from(comments)
        .where(eq(comments.id, dto.parentId));
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.postId !== dto.postId) {
        throw new BadRequestException('Parent is on a different post');
      }
    }

    const text = (dto.body ?? '').trim();
    const imageUrls = this.normalizeIncomingImageUrls(dto.imageUrls);
    if (!text && imageUrls.length === 0) {
      throw new BadRequestException('Comment must include text or an image.');
    }

    const [row] = await db
      .insert(comments)
      .values({
        postId: dto.postId,
        authorId,
        parentId: dto.parentId ?? null,
        body: text,
        imageUrls,
      })
      .returning();
    return row;
  }

  async listByAuthor(query: {
    authorId: string;
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const db = getDb();
    const offset = (query.page - 1) * query.pageSize;
    const authorWhere = eq(comments.authorId, query.authorId);

    const [{ total }] = await db
      .select({ total: count() })
      .from(comments)
      .where(authorWhere);

    const rows = await db
      .select({
        comment: comments,
        postId: posts.id,
        postTitle: posts.title,
        communitySlug: communities.slug,
        communityName: communities.name,
        upvotes: commentUpVotesExpr.as('upvotes'),
        downvotes: commentDownVotesExpr.as('downvotes'),
        score: commentScoreExpr.as('score'),
        viewerVote: commentViewerVoteSelect(query.viewerId),
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(authorWhere)
      .orderBy(desc(comments.createdAt))
      .offset(offset)
      .limit(query.pageSize);

    return {
      items: rows.map((r) => {
        const raw = r as unknown as Record<string, unknown>;
        const community =
          r.communitySlug != null
            ? { slug: r.communitySlug, name: r.communityName ?? '' }
            : null;
        return {
          id: r.comment.id,
          postId: r.postId,
          postTitle: r.postTitle,
          community,
          body: r.comment.body,
          imageUrls: parseStoredCommentImages(r.comment.imageUrls),
          createdAt: r.comment.createdAt,
          parentId: r.comment.parentId,
          upvotes: Number(r.upvotes),
          downvotes: Number(r.downvotes),
          score: Number(r.score),
          viewerVote: viewerVoteFromRow(raw),
        };
      }),
      total: Number(total),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listForPost(postId: string, viewerId?: string) {
    const db = getDb();
    const rows = await db
      .select({
        comment: comments,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        upvotes: commentUpVotesExpr.as('upvotes'),
        downvotes: commentDownVotesExpr.as('downvotes'),
        score: commentScoreExpr.as('score'),
        viewerVote: commentViewerVoteSelect(viewerId),
      })
      .from(comments)
      .innerJoin(profiles, eq(comments.authorId, profiles.id))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));

    const authorIds = [...new Set(rows.map((r) => r.author.id))];
    const seedsByUser = await this.profiles.getSeedsByUserIds(authorIds);

    return rows.map((r) => {
      const seeds = seedsByUser.get(r.author.id) ?? 0;
      const raw = r as unknown as Record<string, unknown>;
      return {
        ...r.comment,
        upvotes: Number(r.upvotes),
        downvotes: Number(r.downvotes),
        score: Number(r.score),
        viewerVote: viewerVoteFromRow(raw),
        author: {
          ...r.author,
          seeds,
          growerLevel: growerLevelFromSeeds(seeds),
        },
      };
    });
  }

  /** Same shape as `listForPost` rows, for one comment (after voting). */
  async getCommentWithMetrics(commentId: string, viewerId?: string) {
    const db = getDb();
    const rows = await db
      .select({
        comment: comments,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        upvotes: commentUpVotesExpr.as('upvotes'),
        downvotes: commentDownVotesExpr.as('downvotes'),
        score: commentScoreExpr.as('score'),
        viewerVote: commentViewerVoteSelect(viewerId),
      })
      .from(comments)
      .innerJoin(profiles, eq(comments.authorId, profiles.id))
      .where(eq(comments.id, commentId))
      .limit(1);
    const [r] = rows;
    if (!r) return null;
    const seedsByUser = await this.profiles.getSeedsByUserIds([r.author.id]);
    const seeds = seedsByUser.get(r.author.id) ?? 0;
    const raw = r as unknown as Record<string, unknown>;
    return {
      ...r.comment,
      upvotes: Number(r.upvotes),
      downvotes: Number(r.downvotes),
      score: Number(r.score),
      viewerVote: viewerVoteFromRow(raw),
      author: {
        ...r.author,
        seeds,
        growerLevel: growerLevelFromSeeds(seeds),
      },
    };
  }

  /** Author only (public API). Staff removal uses `deleteCommentAdmin`. Cascades to replies. */
  async deleteComment(userId: string, postId: string, commentId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!row || row.postId !== postId) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();
    await db.delete(comments).where(eq(comments.id, commentId));
    return { ok: true as const };
  }

  /** Admin panel only (`RolesGuard`). */
  async deleteCommentAdmin(commentId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!row) throw new NotFoundException();
    await db.delete(comments).where(eq(comments.id, commentId));
    return { ok: true as const };
  }

  async updateComment(
    userId: string,
    postId: string,
    commentId: string,
    patch: { body?: string; imageUrls?: string[] },
  ) {
    const hasBody = patch.body !== undefined;
    const hasImages = patch.imageUrls !== undefined;
    if (!hasBody && !hasImages) {
      throw new BadRequestException('No changes.');
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!row || row.postId !== postId) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();

    const nextBody = hasBody ? patch.body!.trim() : row.body;
    const nextUrls = hasImages
      ? this.normalizeIncomingImageUrls(patch.imageUrls)
      : parseStoredCommentImages(row.imageUrls);

    if (!nextBody.trim() && nextUrls.length === 0) {
      throw new BadRequestException('Comment must include text or an image.');
    }

    const [updated] = await db
      .update(comments)
      .set({ body: nextBody, imageUrls: nextUrls })
      .where(eq(comments.id, commentId))
      .returning();
    return updated;
  }

  async reportComment(
    reporterId: string,
    postId: string,
    commentId: string,
    reason?: string,
  ) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!row || row.postId !== postId) throw new NotFoundException();
    if (row.authorId === reporterId) {
      throw new BadRequestException('You cannot report your own comment');
    }
    const r = reason?.trim() || null;
    const inserted = await db
      .insert(commentReports)
      .values({
        commentId,
        postId,
        reporterId,
        reason: r,
      })
      .onConflictDoNothing({
        target: [commentReports.commentId, commentReports.reporterId],
      })
      .returning({ id: commentReports.id });
    return {
      ok: true,
      alreadyReported: inserted.length === 0,
    };
  }

  async listReportsPaged(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(commentReports);
    const rows = await db
      .select({
        id: commentReports.id,
        createdAt: commentReports.createdAt,
        reason: commentReports.reason,
        commentId: commentReports.commentId,
        commentBody: comments.body,
        postId: commentReports.postId,
        postTitle: posts.title,
        reporterId: commentReports.reporterId,
        reporterName: profiles.displayName,
      })
      .from(commentReports)
      .innerJoin(comments, eq(comments.id, commentReports.commentId))
      .innerJoin(posts, eq(posts.id, commentReports.postId))
      .innerJoin(profiles, eq(profiles.id, commentReports.reporterId))
      .orderBy(desc(commentReports.createdAt))
      .limit(take)
      .offset(skip);
    return {
      rows: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        reason: r.reason,
        commentId: r.commentId,
        postId: r.postId,
        postTitle: r.postTitle,
        reporterId: r.reporterId,
        reporterName: r.reporterName,
        commentPreview:
          r.commentBody.length > 120
            ? `${r.commentBody.slice(0, 120)}…`
            : r.commentBody,
      })),
      total: Number(total),
    };
  }
}
