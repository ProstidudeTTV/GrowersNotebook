import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  asc,
  count,
  desc,
  eq,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import { isAllowedPostMediaPublicUrl } from '../common/post-media-public-url';
import { growerLevelFromSeeds } from '../common/grower-seeds';
import { viewerVoteFromRow } from '../common/normalize-viewer-vote';
import { getDb } from '../db';
import { BlocksService } from '../blocks/blocks.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly blocks: BlocksService,
    private readonly profiles: ProfilesService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
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
      .select({
        id: posts.id,
        authorId: posts.authorId,
        title: posts.title,
      })
      .from(posts)
      .where(eq(posts.id, dto.postId));
    if (!post) throw new NotFoundException('Post not found');

    if (await this.blocks.hasBlockBetween(authorId, post.authorId)) {
      throw new ForbiddenException('You cannot comment on this post.');
    }

    let parentCommentAuthorId: string | null = null;
    if (dto.parentId) {
      const [parent] = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          authorId: comments.authorId,
        })
        .from(comments)
        .where(eq(comments.id, dto.parentId));
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.postId !== dto.postId) {
        throw new BadRequestException('Parent is on a different post');
      }
      parentCommentAuthorId = parent.authorId;
      if (
        await this.blocks.hasBlockBetween(authorId, parentCommentAuthorId)
      ) {
        throw new ForbiddenException('You cannot reply to this user.');
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

    let notifyUserId: string | null = null;
    let isReply = false;
    if (dto.parentId && parentCommentAuthorId) {
      if (parentCommentAuthorId !== authorId) {
        notifyUserId = parentCommentAuthorId;
        isReply = true;
      }
    } else if (post.authorId !== authorId) {
      notifyUserId = post.authorId;
    }
    if (notifyUserId) {
      const preview =
        text.length > 0
          ? text.length > 120
            ? `${text.slice(0, 120)}…`
            : text
          : imageUrls.length > 0
            ? 'New comment with image'
            : 'New comment';
      const title = isReply
        ? 'Reply to your comment'
        : 'New comment on your post';
      const body = isReply
        ? `On “${post.title.length > 70 ? `${post.title.slice(0, 70)}…` : post.title}”: ${preview}`
        : `On “${post.title.length > 70 ? `${post.title.slice(0, 70)}…` : post.title}”: ${preview}`;
      await this.notifications.createForUser(notifyUserId, title, body);
    }

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
    let commentWhere: SQL = eq(comments.postId, postId);
    if (viewerId) {
      const hidden = await this.blocks.getHiddenUserIdsForViewer(viewerId);
      if (hidden.length > 0) {
        commentWhere = and(
          eq(comments.postId, postId),
          notInArray(comments.authorId, hidden),
        )!;
      }
    }
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
      .where(commentWhere)
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
    const [{ total }] = await db
      .select({ total: count() })
      .from(commentReports)
      .where(eq(commentReports.status, 'open'));
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
      .where(eq(commentReports.status, 'open'))
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
        commentBody: r.commentBody,
        commentPreview:
          r.commentBody.length > 120
            ? `${r.commentBody.slice(0, 120)}…`
            : r.commentBody,
      })),
      total: Number(total),
    };
  }

  /** Mark report as reviewed with no moderation action; notifies reporter (and optionally warned user). */
  async dismissCommentReport(
    reportId: string,
    dto: {
      reporterNote?: string;
      notifyReported: boolean;
      reportedWarning?: string;
    },
  ) {
    if (dto.notifyReported === true && !dto.reportedWarning?.trim()) {
      throw new BadRequestException(
        'A warning message is required when notifying the reported user.',
      );
    }
    const db = getDb();
    const [report] = await db
      .select()
      .from(commentReports)
      .where(eq(commentReports.id, reportId));
    if (!report) throw new NotFoundException();
    if (report.status !== 'open') {
      throw new BadRequestException('This report is already resolved.');
    }
    const [commentRow] = await db
      .select({ authorId: comments.authorId })
      .from(comments)
      .where(eq(comments.id, report.commentId));
    if (!commentRow) throw new NotFoundException('Comment not found.');
    const note = dto.reporterNote?.trim() ?? '';
    const reporterBody =
      note.length > 0
        ? note
        : 'Moderators reviewed your report and closed it with no action taken against the reported content.';
    await db
      .update(commentReports)
      .set({
        status: 'dismissed',
        resolvedAt: new Date(),
        reporterMessage: note.length > 0 ? note : null,
        notifyReported: dto.notifyReported === true,
        reportedWarning:
          dto.notifyReported === true ? dto.reportedWarning!.trim() : null,
      })
      .where(eq(commentReports.id, reportId));
    await this.notifications.createForUser(
      report.reporterId,
      'Your report was reviewed',
      reporterBody,
      'report_update',
    );
    if (dto.notifyReported === true && dto.reportedWarning?.trim()) {
      await this.notifications.createForUser(
        commentRow.authorId,
        'Moderation reminder',
        dto.reportedWarning.trim(),
        'moderation_warning',
      );
    }
    return { ok: true as const };
  }
}
