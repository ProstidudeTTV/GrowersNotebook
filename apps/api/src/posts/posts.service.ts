import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  or,
  sql,
} from 'drizzle-orm';
import { growerLevelFromSeeds } from '../common/grower-seeds';
import {
  COMMENT_VOTE_SEED_WEIGHT,
  POST_VOTE_SEED_WEIGHT,
} from '../common/seeds-score';
import {
  hasRenderablePostBody,
  htmlToExcerpt,
  sanitizePostHtml,
} from '../common/html';
import { htmlHasExpandableYouTubeLink } from '../common/youtube-embed';
import { viewerVoteFromRow } from '../common/normalize-viewer-vote';
import { getDb } from '../db';
import {
  commentVotes,
  comments,
  communities,
  communityPins,
  postVotes,
  posts,
  profiles,
  type PostMediaItem,
} from '../db/schema';
import { FollowsService } from '../follows/follows.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreatePostDto } from './dto/create-post.dto';
import type { UpdatePostDto } from './dto/update-post.dto';

const scoreExpr = sql<number>`coalesce((select sum(${postVotes.value}) from ${postVotes} where ${postVotes.postId} = ${posts.id}), 0)`;

const upVotesExpr = sql<number>`coalesce((select count(*)::int from ${postVotes} where ${postVotes.postId} = ${posts.id} and ${postVotes.value} = 1), 0)`;

const downVotesExpr = sql<number>`coalesce((select count(*)::int from ${postVotes} where ${postVotes.postId} = ${posts.id} and ${postVotes.value} = -1), 0)`;

/** Weighted seeds: post votes × post weight + comment votes × comment weight. */
const authorSeedsExpr = sql<number>`(
  ${POST_VOTE_SEED_WEIGHT}::int * coalesce((select sum(pv.value)::int from ${postVotes} pv inner join ${posts} p on p.id = pv.post_id where p.author_id = ${profiles.id}), 0)
  + ${COMMENT_VOTE_SEED_WEIGHT}::int * coalesce((select sum(cv.value)::int from ${commentVotes} cv inner join ${comments} c on c.id = cv.comment_id where c.author_id = ${profiles.id}), 0)
)`;

const MAX_POST_MEDIA = 30;

function normalizePostMedia(
  raw: { url: string; type: string }[] | undefined,
): PostMediaItem[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: PostMediaItem[] = [];
  for (const item of raw) {
    const url = item.url?.trim();
    if (!url || !/^https:\/\//i.test(url)) continue;
    if (item.type !== 'image' && item.type !== 'video') continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, type: item.type });
    if (out.length >= MAX_POST_MEDIA) break;
  }
  return out;
}

function excerptForPost(
  bodyHtml: string,
  media: PostMediaItem[],
): string {
  const fromBody = htmlToExcerpt(bodyHtml);
  if (fromBody.length > 0) return fromBody;
  if (htmlHasExpandableYouTubeLink(bodyHtml)) return 'YouTube video';
  if (media.length === 0) return '';
  const images = media.filter((m) => m.type === 'image').length;
  const videos = media.filter((m) => m.type === 'video').length;
  if (images && videos) return `${images} image(s), ${videos} video(s)`;
  if (videos) return videos === 1 ? 'Video post' : `${videos} videos`;
  return images === 1 ? 'Image post' : `${images} images`;
}

function viewerVoteSelect(viewerId: string | undefined) {
  if (!viewerId) {
    return sql<number | null>`null`.as('viewerVote');
  }
  return sql<number | null>`(
    select ${postVotes.value}::int from ${postVotes}
    where ${postVotes.postId} = ${posts.id} and ${postVotes.userId} = ${viewerId}::uuid
    limit 1
  )`.as('viewerVote');
}

@Injectable()
export class PostsService {
  constructor(
    private readonly follows: FollowsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Paginated feed: posts from the last 7 days, highest net vote score first (then newest).
   */
  async listHotWeek(query: {
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const db = getDb();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekWhere = gte(posts.createdAt, weekAgo);
    const offset = (query.page - 1) * query.pageSize;

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(weekWhere);

    const rows = await db
      .select({
        post: posts,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        community: {
          slug: communities.slug,
          name: communities.name,
        },
        authorSeeds: authorSeedsExpr.as('author_seeds'),
        score: scoreExpr.as('score'),
        upvotes: upVotesExpr.as('upvotes'),
        downvotes: downVotesExpr.as('downvotes'),
        viewerVote: viewerVoteSelect(query.viewerId),
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(weekWhere)
      .orderBy(desc(scoreExpr), desc(posts.createdAt))
      .offset(offset)
      .limit(query.pageSize);

    const rowAuthorIds = rows.map((r) => r.author.id);
    const followedAuthors = query.viewerId
      ? await this.follows.getFollowingUserIds(query.viewerId, rowAuthorIds)
      : null;

    return {
      items: rows.map((r) => {
        const seeds = Number(r.authorSeeds);
        const raw = r as unknown as Record<string, unknown>;
        const community =
          r.community?.slug != null
            ? { slug: r.community.slug, name: r.community.name }
            : null;
        const authorFollowing = followedAuthors?.has(r.author.id) ?? false;
        return {
          ...r.post,
          author: {
            ...r.author,
            seeds,
            growerLevel: growerLevelFromSeeds(seeds),
            viewerFollowing: authorFollowing,
          },
          community,
          score: Number(r.score),
          upvotes: Number(r.upvotes),
          downvotes: Number(r.downvotes),
          viewerVote: viewerVoteFromRow(raw),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async create(authorId: string, dto: CreatePostDto) {
    const db = getDb();
    const mediaItems = normalizePostMedia(dto.media);
    const bodyHtml = sanitizePostHtml(dto.bodyHtml);
    if (!hasRenderablePostBody(bodyHtml, mediaItems)) {
      throw new BadRequestException(
        'Add body text, attached media (image or video), or a table.',
      );
    }
    const excerpt = excerptForPost(bodyHtml, mediaItems);
    const [row] = await db
      .insert(posts)
      .values({
        communityId: dto.communityId ?? null,
        authorId,
        title: dto.title.trim(),
        bodyJson: dto.bodyJson,
        bodyHtml,
        media: mediaItems,
        excerpt,
      })
      .returning();
    return row;
  }

  async updateOwn(authorId: string, id: string, dto: UpdatePostDto) {
    const hasAnyChange =
      dto.title !== undefined ||
      dto.bodyHtml !== undefined ||
      dto.bodyJson !== undefined ||
      dto.media !== undefined;
    if (!hasAnyChange) {
      throw new BadRequestException('No changes to save.');
    }
    if (
      (dto.bodyHtml !== undefined) !== (dto.bodyJson !== undefined)
    ) {
      throw new BadRequestException(
        'bodyHtml and bodyJson must both be sent when updating body.',
      );
    }

    const db = getDb();
    const [existing] = await db.select().from(posts).where(eq(posts.id, id));
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own posts.');
    }

    let title = existing.title;
    if (dto.title !== undefined) title = dto.title.trim();

    let bodyHtml = existing.bodyHtml;
    let bodyJson = existing.bodyJson;
    let mediaItems = (existing.media as PostMediaItem[]) ?? [];

    if (dto.bodyHtml !== undefined && dto.bodyJson !== undefined) {
      bodyHtml = sanitizePostHtml(dto.bodyHtml);
      bodyJson = dto.bodyJson as Record<string, unknown>;
    }
    if (dto.media !== undefined) {
      mediaItems = normalizePostMedia(dto.media);
    }

    const bodyOrMediaTouched =
      dto.bodyHtml !== undefined || dto.media !== undefined;
    if (bodyOrMediaTouched) {
      if (!hasRenderablePostBody(bodyHtml, mediaItems)) {
        throw new BadRequestException(
          'Add body text, attached media (image or video), or a table.',
        );
      }
    }

    const excerpt = excerptForPost(bodyHtml, mediaItems);
    const [row] = await db
      .update(posts)
      .set({
        title,
        bodyHtml,
        bodyJson,
        media: mediaItems,
        excerpt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    if (!row) throw new NotFoundException();
    return row;
  }

  async deleteOwn(authorId: string, id: string) {
    const db = getDb();
    const [existing] = await db.select().from(posts).where(eq(posts.id, id));
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts.');
    }
    await db.delete(posts).where(eq(posts.id, id));
    return { ok: true as const };
  }

  async getById(id: string, viewerId?: string) {
    const db = getDb();
    const [row] = await db
      .select({
        post: posts,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        communitySlug: communities.slug,
        communityName: communities.name,
        authorSeeds: authorSeedsExpr.as('author_seeds'),
        score: scoreExpr.as('score'),
        upvotes: upVotesExpr.as('upvotes'),
        downvotes: downVotesExpr.as('downvotes'),
        viewerVote: viewerVoteSelect(viewerId),
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(eq(posts.id, id));
    if (!row) throw new NotFoundException('Post not found');

    const seeds = Number(row.authorSeeds);
    const r = row as unknown as Record<string, unknown>;
    const authorFollowing = viewerId
      ? (
          await this.follows.getFollowingUserIds(viewerId, [row.author.id])
        ).has(row.author.id)
      : false;
    const community =
      row.communitySlug != null
        ? { slug: row.communitySlug, name: row.communityName ?? '' }
        : null;
    return {
      ...row.post,
      community,
      author: {
        ...row.author,
        seeds,
        growerLevel: growerLevelFromSeeds(seeds),
        viewerFollowing: authorFollowing,
      },
      score: Number(row.score),
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
      viewerVote: viewerVoteFromRow(r),
    };
  }

  async list(query: {
    communityId: string;
    sort: 'new' | 'top';
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const db = getDb();
    const offset = (query.page - 1) * query.pageSize;

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(eq(posts.communityId, query.communityId));

    const pinThenExpr = sql`(case when ${communityPins.pinnedAt} is null then 1 else 0 end)`;
    const orderBy =
      query.sort === 'top'
        ? [
            pinThenExpr,
            asc(communityPins.pinnedAt),
            desc(scoreExpr),
            desc(posts.createdAt),
          ]
        : [
            pinThenExpr,
            asc(communityPins.pinnedAt),
            desc(posts.createdAt),
          ];

    const rows = await db
      .select({
        post: posts,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        pinnedAt: communityPins.pinnedAt,
        authorSeeds: authorSeedsExpr.as('author_seeds'),
        score: scoreExpr.as('score'),
        upvotes: upVotesExpr.as('upvotes'),
        downvotes: downVotesExpr.as('downvotes'),
        viewerVote: viewerVoteSelect(query.viewerId),
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .leftJoin(
        communityPins,
        and(
          eq(communityPins.postId, posts.id),
          eq(communityPins.communityId, query.communityId),
        ),
      )
      .where(eq(posts.communityId, query.communityId))
      .orderBy(...orderBy)
      .offset(offset)
      .limit(query.pageSize);

    const authorIds = rows.map((r) => r.author.id);
    const followedAuthors = query.viewerId
      ? await this.follows.getFollowingUserIds(query.viewerId, authorIds)
      : null;

    return {
      items: rows.map((r) => {
        const seeds = Number(r.authorSeeds);
        const raw = r as unknown as Record<string, unknown>;
        const authorFollowing = followedAuthors?.has(r.author.id) ?? false;
        return {
          ...r.post,
          pinnedAt: r.pinnedAt ? r.pinnedAt.toISOString() : null,
          author: {
            ...r.author,
            seeds,
            growerLevel: growerLevelFromSeeds(seeds),
            viewerFollowing: authorFollowing,
          },
          score: Number(r.score),
          upvotes: Number(r.upvotes),
          downvotes: Number(r.downvotes),
          viewerVote: viewerVoteFromRow(raw),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Posts from growers you follow or communities you joined (Reddit-style home feed).
   */
  async listFollowing(query: {
    viewerId?: string;
    sort: 'new' | 'top';
    page: number;
    pageSize: number;
  }) {
    if (!query.viewerId) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    const authorIds = await this.follows.getAllFollowingUserIds(
      query.viewerId,
    );
    const communityIds = await this.follows.getAllFollowingCommunityIds(
      query.viewerId,
    );

    if (authorIds.length === 0 && communityIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    let whereSql;
    if (authorIds.length > 0 && communityIds.length > 0) {
      whereSql = or(
        inArray(posts.authorId, authorIds),
        inArray(posts.communityId, communityIds),
      )!;
    } else if (authorIds.length > 0) {
      whereSql = inArray(posts.authorId, authorIds);
    } else {
      whereSql = inArray(posts.communityId, communityIds);
    }

    const db = getDb();
    const offset = (query.page - 1) * query.pageSize;

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(whereSql);

    const orderBy =
      query.sort === 'top'
        ? [desc(scoreExpr), desc(posts.createdAt)]
        : [desc(posts.createdAt)];

    const rows = await db
      .select({
        post: posts,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        community: {
          slug: communities.slug,
          name: communities.name,
        },
        authorSeeds: authorSeedsExpr.as('author_seeds'),
        score: scoreExpr.as('score'),
        upvotes: upVotesExpr.as('upvotes'),
        downvotes: downVotesExpr.as('downvotes'),
        viewerVote: viewerVoteSelect(query.viewerId),
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(whereSql)
      .orderBy(...orderBy)
      .offset(offset)
      .limit(query.pageSize);

    const rowAuthorIds = rows.map((r) => r.author.id);
    const followedAuthors = await this.follows.getFollowingUserIds(
      query.viewerId,
      rowAuthorIds,
    );

    return {
      items: rows.map((r) => {
        const seeds = Number(r.authorSeeds);
        const raw = r as unknown as Record<string, unknown>;
        const community =
          r.community?.slug != null
            ? { slug: r.community.slug, name: r.community.name }
            : null;
        return {
          ...r.post,
          author: {
            ...r.author,
            seeds,
            growerLevel: growerLevelFromSeeds(seeds),
            viewerFollowing: followedAuthors.has(r.author.id),
          },
          community,
          score: Number(r.score),
          upvotes: Number(r.upvotes),
          downvotes: Number(r.downvotes),
          viewerVote: viewerVoteFromRow(raw),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listByAuthor(query: {
    authorId: string;
    sort: 'new' | 'top';
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const db = getDb();
    const offset = (query.page - 1) * query.pageSize;
    const authorWhere = eq(posts.authorId, query.authorId);

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(authorWhere);

    const orderBy =
      query.sort === 'top'
        ? [desc(scoreExpr), desc(posts.createdAt)]
        : [desc(posts.createdAt)];

    const rows = await db
      .select({
        post: posts,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        community: {
          slug: communities.slug,
          name: communities.name,
        },
        authorSeeds: authorSeedsExpr.as('author_seeds'),
        score: scoreExpr.as('score'),
        upvotes: upVotesExpr.as('upvotes'),
        downvotes: downVotesExpr.as('downvotes'),
        viewerVote: viewerVoteSelect(query.viewerId),
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .where(authorWhere)
      .orderBy(...orderBy)
      .offset(offset)
      .limit(query.pageSize);

    const rowAuthorIds = rows.map((r) => r.author.id);
    const followedAuthors = query.viewerId
      ? await this.follows.getFollowingUserIds(query.viewerId, rowAuthorIds)
      : null;

    return {
      items: rows.map((r) => {
        const seeds = Number(r.authorSeeds);
        const raw = r as unknown as Record<string, unknown>;
        const community =
          r.community?.slug != null
            ? { slug: r.community.slug, name: r.community.name }
            : null;
        const authorFollowing = followedAuthors?.has(r.author.id) ?? false;
        return {
          ...r.post,
          author: {
            ...r.author,
            seeds,
            growerLevel: growerLevelFromSeeds(seeds),
            viewerFollowing: authorFollowing,
          },
          community,
          score: Number(r.score),
          upvotes: Number(r.upvotes),
          downvotes: Number(r.downvotes),
          viewerVote: viewerVoteFromRow(raw),
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listPaged(skip: number, take: number, communityId?: string) {
    const db = getDb();
    const whereCommunity = communityId
      ? eq(posts.communityId, communityId)
      : undefined;
    const countBase = db.select({ total: count() }).from(posts);
    const [{ total }] = whereCommunity
      ? await countBase.where(whereCommunity)
      : await countBase;
    const pinThenExpr = sql`(case when ${communityPins.pinnedAt} is null then 1 else 0 end)`;
    const listBase = db
      .select({
        post: posts,
        communitySlug: communities.slug,
        authorName: profiles.displayName,
        pinnedAt: communityPins.pinnedAt,
      })
      .from(posts)
      .innerJoin(profiles, eq(posts.authorId, profiles.id))
      .leftJoin(communities, eq(posts.communityId, communities.id))
      .leftJoin(communityPins, eq(communityPins.postId, posts.id))
      .orderBy(pinThenExpr, asc(communityPins.pinnedAt), desc(posts.createdAt))
      .offset(skip)
      .limit(take);
    const rows = whereCommunity
      ? await listBase.where(whereCommunity)
      : await listBase;
    return {
      rows: rows.map((r) => ({
        ...r.post,
        communitySlug: r.communitySlug,
        authorName: r.authorName,
        pinnedAt: r.pinnedAt ? r.pinnedAt.toISOString() : null,
      })),
      total,
    };
  }

  async updateAdmin(
    id: string,
    partial: Partial<{ title: string; bodyHtml: string; bodyJson: object }>,
  ) {
    const db = getDb();
    const bodyHtml =
      partial.bodyHtml !== undefined
        ? sanitizePostHtml(partial.bodyHtml)
        : undefined;
    const excerpt =
      bodyHtml !== undefined ? htmlToExcerpt(bodyHtml) : undefined;
    const [row] = await db
      .update(posts)
      .set({
        ...(partial.title !== undefined ? { title: partial.title } : {}),
        ...(partial.bodyJson !== undefined
          ? { bodyJson: partial.bodyJson as Record<string, unknown> }
          : {}),
        ...(bodyHtml !== undefined ? { bodyHtml } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }

  async deleteAdmin(id: string) {
    const db = getDb();
    const [row] = await db.delete(posts).where(eq(posts.id, id)).returning();
    if (!row) throw new NotFoundException();
    return { ok: true };
  }

  /** Remove post and optionally notify the author (moderation). */
  async removePostAdmin(
    id: string,
    options: { notifyAuthor: boolean; reason?: string },
  ) {
    const db = getDb();
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) throw new NotFoundException();
    await db.delete(posts).where(eq(posts.id, id));
    if (options.notifyAuthor && options.reason?.trim()) {
      await this.notifications.createForUser(
        post.authorId,
        'Your post was removed',
        `An administrator removed your post "${post.title}". Reason: ${options.reason.trim()}`,
      );
    }
    return { ok: true };
  }
}
