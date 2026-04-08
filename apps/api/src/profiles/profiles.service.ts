import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { growerLevelFromSeeds } from '../common/grower-seeds';
import { FollowsService } from '../follows/follows.service';
import {
  COMMENT_VOTE_SEED_WEIGHT,
  POST_VOTE_SEED_WEIGHT,
} from '../common/seeds-score';
import type { ProfileRole } from '../auth/roles.decorator';
import { getDb } from '../db';
import {
  commentVotes,
  comments,
  postVotes,
  posts,
  profileReports,
  profiles,
} from '../db/schema';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly follows: FollowsService,
    private readonly notifications: NotificationsService,
    private readonly nameBlocklist: NameBlocklistService,
  ) {}

  async findById(id: string) {
    const db = getDb();
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    return row ?? null;
  }

  /** Create a profile row on first auth only — never overwrite an existing name. */
  async ensureProfile(
    id: string,
    email: string | null,
    preferredDisplayName?: string | null,
  ) {
    const db = getDb();
    const fromMeta = preferredDisplayName?.trim();
    const emailLocal = email?.split('@')[0]?.trim();
    const candidates: string[] = [];
    if (fromMeta && fromMeta.length > 0) candidates.push(fromMeta);
    if (emailLocal && emailLocal.length > 0) candidates.push(emailLocal);
    candidates.push('Grower');

    let displayName = 'Grower';
    for (const c of candidates) {
      if (await this.nameBlocklist.isAllowed(c)) {
        displayName = c;
        break;
      }
    }

    await db
      .insert(profiles)
      .values({
        id,
        displayName,
      })
      .onConflictDoNothing({ target: profiles.id });
  }

  async getMe(userId: string) {
    const row = await this.findById(userId);
    if (!row) throw new NotFoundException();
    const seedsMap = await this.getSeedsByUserIds([userId]);
    const seeds = seedsMap.get(userId) ?? 0;
    const unreadNotificationCount =
      await this.notifications.countUnread(userId);
    return {
      id: row.id,
      displayName: row.displayName,
      description: row.description,
      avatarUrl: row.avatarUrl,
      profilePublic: row.profilePublic,
      showGrowerStatsPublic: row.showGrowerStatsPublic,
      showNotebooksPublic: row.showNotebooksPublic,
      role: row.role,
      createdAt: row.createdAt,
      seeds,
      growerLevel: growerLevelFromSeeds(seeds),
      unreadNotificationCount,
    };
  }

  /**
   * Whether profile-scoped feeds should load for this viewer.
   * Missing profile → caller should 404.
   * Private profile: non-owners get empty posts and comments lists (card still loads).
   */
  async getProfileFeedVisibility(
    profileId: string,
    viewerId?: string,
  ): Promise<{
    exists: boolean;
    allowPosts: boolean;
    allowComments: boolean;
  }> {
    const row = await this.findById(profileId);
    if (!row) {
      return { exists: false, allowPosts: false, allowComments: false };
    }
    if (row.profilePublic === false && viewerId !== profileId) {
      return { exists: true, allowPosts: false, allowComments: false };
    }
    return { exists: true, allowPosts: true, allowComments: true };
  }

  /**
   * Whether the profile owner's NOTEBOOK list should load for this viewer.
   * Owner always sees their own; non-owners need a public profile and `show_notebooks_public`.
   */
  async getProfileNotebookVisibility(
    profileId: string,
    viewerId?: string,
  ): Promise<{ exists: boolean; allow: boolean }> {
    const row = await this.findById(profileId);
    if (!row) {
      return { exists: false, allow: false };
    }
    if (viewerId === profileId) {
      return { exists: true, allow: true };
    }
    if (row.profilePublic === false || row.showNotebooksPublic === false) {
      return { exists: true, allow: false };
    }
    return { exists: true, allow: true };
  }

  /** Public profile card (no email). Posts/comments lists are empty when private for non-owners. */
  async getPublicProfile(profileId: string, viewerId?: string) {
    const row = await this.findById(profileId);
    if (!row) throw new NotFoundException();

    const seedsMap = await this.getSeedsByUserIds([profileId]);
    const seeds = seedsMap.get(profileId) ?? 0;
    const viewerFollowing =
      viewerId != null && viewerId !== profileId
        ? (await this.follows.getFollowingUserIds(viewerId, [profileId])).has(
            profileId,
          )
        : false;
    const isOwner = viewerId === profileId;
    const statsPublic =
      isOwner || row.showGrowerStatsPublic !== false;
    const profileFeedHiddenFromViewer =
      row.profilePublic === false && viewerId !== profileId;

    return {
      id: row.id,
      displayName: row.displayName,
      description: row.description,
      avatarUrl: row.avatarUrl,
      role: row.role,
      createdAt: row.createdAt,
      seeds: statsPublic ? seeds : null,
      growerLevel: statsPublic ? growerLevelFromSeeds(seeds) : null,
      viewerFollowing,
      ...(profileFeedHiddenFromViewer
        ? { profileFeedHiddenFromViewer: true as const }
        : {}),
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const db = getDb();
    const patch: Partial<typeof profiles.$inferInsert> = {};
    if (dto.displayName !== undefined) {
      const v = dto.displayName?.trim();
      patch.displayName = !v ? null : v;
    }
    if (dto.description !== undefined) {
      const v = dto.description?.trim();
      patch.description = !v ? null : v;
    }
    if (dto.avatarUrl !== undefined) {
      const v = dto.avatarUrl?.trim();
      patch.avatarUrl = !v ? null : v;
    }
    if (dto.profilePublic !== undefined) {
      patch.profilePublic = dto.profilePublic;
    }
    if (dto.showGrowerStatsPublic !== undefined) {
      patch.showGrowerStatsPublic = dto.showGrowerStatsPublic;
    }
    if (dto.showNotebooksPublic !== undefined) {
      patch.showNotebooksPublic = dto.showNotebooksPublic;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(profiles).set(patch).where(eq(profiles.id, userId));
    }
    return this.getMe(userId);
  }

  async reportProfile(
    reporterId: string,
    reportedUserId: string,
    reason?: string,
  ) {
    if (reporterId === reportedUserId) {
      throw new BadRequestException('You cannot report your own profile');
    }
    const target = await this.findById(reportedUserId);
    if (!target) throw new NotFoundException();
    const db = getDb();
    const r = reason?.trim() || null;
    const inserted = await db
      .insert(profileReports)
      .values({
        reportedUserId,
        reporterId,
        reason: r,
      })
      .onConflictDoNothing({
        target: [
          profileReports.reportedUserId,
          profileReports.reporterId,
        ],
      })
      .returning({ id: profileReports.id });
    return {
      ok: true,
      alreadyReported: inserted.length === 0,
    };
  }

  async listProfileReportsPaged(skip: number, take: number) {
    const db = getDb();
    const reportedProfile = alias(profiles, 'reported_profile');
    const reporterProfile = alias(profiles, 'reporter_profile');
    const [{ total }] = await db.select({ total: count() }).from(profileReports);
    const rows = await db
      .select({
        id: profileReports.id,
        createdAt: profileReports.createdAt,
        reason: profileReports.reason,
        reportedUserId: profileReports.reportedUserId,
        reportedName: reportedProfile.displayName,
        reporterId: profileReports.reporterId,
        reporterName: reporterProfile.displayName,
      })
      .from(profileReports)
      .innerJoin(
        reportedProfile,
        eq(reportedProfile.id, profileReports.reportedUserId),
      )
      .innerJoin(
        reporterProfile,
        eq(reporterProfile.id, profileReports.reporterId),
      )
      .orderBy(desc(profileReports.createdAt))
      .limit(take)
      .offset(skip);
    return { rows, total: Number(total) };
  }

  /** Net seeds: votes on authored posts + votes on authored comments. */
  async getSeedsByUserIds(userIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (userIds.length === 0) return map;
    const unique = [...new Set(userIds)];
    for (const id of unique) map.set(id, 0);

    const db = getDb();
    const postRows = await db
      .select({
        authorId: posts.authorId,
        sum: sql<number>`coalesce(sum(${postVotes.value}), 0)`,
      })
      .from(postVotes)
      .innerJoin(posts, eq(posts.id, postVotes.postId))
      .where(inArray(posts.authorId, unique))
      .groupBy(posts.authorId);

    const commentRows = await db
      .select({
        authorId: comments.authorId,
        sum: sql<number>`coalesce(sum(${commentVotes.value}), 0)`,
      })
      .from(commentVotes)
      .innerJoin(comments, eq(comments.id, commentVotes.commentId))
      .where(inArray(comments.authorId, unique))
      .groupBy(comments.authorId);

    for (const r of postRows) {
      map.set(
        r.authorId,
        (map.get(r.authorId) ?? 0) +
          POST_VOTE_SEED_WEIGHT * Number(r.sum),
      );
    }
    for (const r of commentRows) {
      map.set(
        r.authorId,
        (map.get(r.authorId) ?? 0) +
          COMMENT_VOTE_SEED_WEIGHT * Number(r.sum),
      );
    }
    return map;
  }

  /** Public directory search (display name + bio). Min 2 chars on q. */
  async searchForSite(query: { q?: string; page: number; pageSize: number }) {
    const raw = query.q?.trim() ?? '';
    const page = Math.max(1, query.page);
    const pageSize = Math.min(30, Math.max(1, query.pageSize));
    const skip = (page - 1) * pageSize;

    if (raw.length < 2) {
      return { items: [], total: 0, page, pageSize };
    }

    const term = `%${raw.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    const db = getDb();

    const activeAccount = and(
      isNull(profiles.bannedAt),
      or(
        isNull(profiles.suspendedUntil),
        lte(profiles.suspendedUntil, new Date()),
      ),
    );

    const textMatch = or(
      ilike(profiles.displayName, term),
      ilike(profiles.description, term),
    );

    const whereClause = and(
      eq(profiles.profilePublic, true),
      activeAccount,
      textMatch,
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(profiles)
      .where(whereClause);

    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        description: profiles.description,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(whereClause)
      .orderBy(asc(profiles.displayName))
      .limit(pageSize)
      .offset(skip);

    return {
      items: rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        description: r.description,
        avatarUrl: r.avatarUrl,
      })),
      total: Number(total),
      page,
      pageSize,
    };
  }

  async listPaged(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(profiles);
    const rows = await db
      .select()
      .from(profiles)
      .orderBy(asc(profiles.createdAt))
      .offset(skip)
      .limit(take);
    return { rows, total };
  }

  async updateAdmin(
    id: string,
    partial: Partial<{
      displayName: string | null;
      description: string | null;
      role: ProfileRole;
      avatarUrl: string | null;
      bannedAt: string | null;
      suspendedUntil: string | null;
    }>,
  ) {
    const db = getDb();
    const patch: Partial<typeof profiles.$inferInsert> = {};
    if (partial.displayName !== undefined) {
      if (partial.displayName === null) {
        patch.displayName = null;
      } else {
        const v = partial.displayName.trim();
        if (v) await this.nameBlocklist.assertAllowed(v);
        patch.displayName = v || null;
      }
    }
    if (partial.description !== undefined) {
      if (partial.description === null) {
        patch.description = null;
      } else {
        const v = partial.description.trim();
        patch.description = v ? v.slice(0, 2000) : null;
      }
    }
    if (partial.role !== undefined) {
      patch.role = partial.role;
    }
    if (partial.avatarUrl !== undefined) {
      patch.avatarUrl = partial.avatarUrl;
    }
    if (partial.bannedAt !== undefined) {
      patch.bannedAt =
        partial.bannedAt === null ? null : new Date(partial.bannedAt);
    }
    if (partial.suspendedUntil !== undefined) {
      patch.suspendedUntil =
        partial.suspendedUntil === null
          ? null
          : new Date(partial.suspendedUntil);
    }
    if (Object.keys(patch).length === 0) {
      const row = await this.findById(id);
      if (!row) throw new NotFoundException();
      return row;
    }
    const [row] = await db
      .update(profiles)
      .set(patch)
      .where(eq(profiles.id, id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
}
