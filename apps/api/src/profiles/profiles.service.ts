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
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
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
import { AuditService } from '../audit/audit.service';
import { getDb } from '../db';
import {
  commentVotes,
  comments,
  postVotes,
  posts,
  profileReports,
  profiles,
  userNotifications,
} from '../db/schema';
import { BlocksService } from '../blocks/blocks.service';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly blocks: BlocksService,
    private readonly follows: FollowsService,
    private readonly notifications: NotificationsService,
    private readonly nameBlocklist: NameBlocklistService,
    private readonly audit: AuditService,
  ) {}

  async findById(id: string) {
    const db = getDb();
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    return row ?? null;
  }

  /** Display names for audit / admin tables (batch). */
  async getDisplayNamesByIds(ids: string[]) {
    const uniq = [...new Set(ids.filter((x) => x && /^[0-9a-f-]{36}$/i.test(x)))];
    if (uniq.length === 0) {
      return new Map<string, string | null>();
    }
    const db = getDb();
    const rows = await db
      .select({ id: profiles.id, displayName: profiles.displayName })
      .from(profiles)
      .where(inArray(profiles.id, uniq));
    const map = new Map<string, string | null>();
    for (const id of uniq) map.set(id, null);
    for (const r of rows) map.set(r.id, r.displayName);
    return map;
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
    if (
      viewerId &&
      viewerId !== profileId &&
      (await this.blocks.hasBlockBetween(viewerId, profileId))
    ) {
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
    if (
      viewerId &&
      viewerId !== profileId &&
      (await this.blocks.hasBlockBetween(viewerId, profileId))
    ) {
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
    if (
      viewerId &&
      viewerId !== profileId &&
      (await this.blocks.hasBlockBetween(viewerId, profileId))
    ) {
      throw new NotFoundException();
    }

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

    const viewerHasBlocked =
      viewerId != null && viewerId !== profileId
        ? await this.blocks.isDirectBlock(viewerId, profileId)
        : false;

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
      viewerHasBlocked,
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
    const [{ total }] = await db
      .select({ total: count() })
      .from(profileReports)
      .where(eq(profileReports.status, 'open'));
    const rows = await db
      .select({
        id: profileReports.id,
        createdAt: profileReports.createdAt,
        reason: profileReports.reason,
        reportedUserId: profileReports.reportedUserId,
        reportedName: reportedProfile.displayName,
        reportedDescription: reportedProfile.description,
        reportedProfilePublic: reportedProfile.profilePublic,
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
      .where(eq(profileReports.status, 'open'))
      .orderBy(desc(profileReports.createdAt))
      .limit(take)
      .offset(skip);
    return {
      rows: rows.map((r) => {
        const desc = r.reportedDescription?.trim() ?? '';
        return {
          id: r.id,
          createdAt: r.createdAt,
          reason: r.reason,
          reportedUserId: r.reportedUserId,
          reportedName: r.reportedName,
          reporterId: r.reporterId,
          reporterName: r.reporterName,
          reportedProfilePublic: r.reportedProfilePublic,
          reportedDescriptionPreview:
            desc.length > 200 ? `${desc.slice(0, 200)}…` : desc || null,
          reportedDescriptionFull: desc.length > 0 ? desc : null,
        };
      }),
      total: Number(total),
    };
  }

  async dismissProfileReport(
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
      .from(profileReports)
      .where(eq(profileReports.id, reportId));
    if (!report) throw new NotFoundException();
    if (report.status !== 'open') {
      throw new BadRequestException('This report is already resolved.');
    }
    const note = dto.reporterNote?.trim() ?? '';
    const reporterBody =
      note.length > 0
        ? note
        : 'Moderators reviewed your profile report and closed it with no action taken against the reported account.';
    await db
      .update(profileReports)
      .set({
        status: 'dismissed',
        resolvedAt: new Date(),
        reporterMessage: note.length > 0 ? note : null,
        notifyReported: dto.notifyReported === true,
        reportedWarning:
          dto.notifyReported === true ? dto.reportedWarning!.trim() : null,
      })
      .where(eq(profileReports.id, reportId));
    await this.notifications.createForUser(
      report.reporterId,
      'Your report was reviewed',
      reporterBody,
      {
        kind: 'report_update',
        actionUrl: `/u/${report.reportedUserId}`,
      },
    );
    if (dto.notifyReported === true && dto.reportedWarning?.trim()) {
      await this.notifications.createForUser(
        report.reportedUserId,
        'Moderation reminder',
        dto.reportedWarning.trim(),
        { kind: 'moderation_warning' },
      );
    }
    return { ok: true as const };
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
  async searchForSite(query: {
    q?: string;
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const raw = query.q?.trim() ?? '';
    const page = Math.max(1, query.page);
    const pageSize = Math.min(30, Math.max(1, query.pageSize));
    const skip = (page - 1) * pageSize;

    if (raw.length < 2) {
      return { items: [], total: 0, page, pageSize };
    }

    const term = `%${raw.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    const db = getDb();

    const notBanned = or(
      isNull(profiles.bannedAt),
      and(
        isNotNull(profiles.banExpiresAt),
        lte(profiles.banExpiresAt, sql`now()`),
      )!,
    )!;
    const activeAccount = and(
      notBanned,
      or(
        isNull(profiles.suspendedUntil),
        lte(profiles.suspendedUntil, new Date()),
      ),
    );

    const textMatch = or(
      ilike(profiles.displayName, term),
      ilike(profiles.description, term),
    );

    let blockedIds: string[] = [];
    if (query.viewerId) {
      blockedIds = await this.blocks.getHiddenUserIdsForViewer(query.viewerId);
    }
    const blockFilter =
      blockedIds.length > 0 ? notInArray(profiles.id, blockedIds) : undefined;

    const whereClause = blockFilter
      ? and(
          eq(profiles.profilePublic, true),
          activeAccount,
          textMatch,
          blockFilter,
        )
      : and(eq(profiles.profilePublic, true), activeAccount, textMatch);

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

  async clearExpiredBan(profileId: string) {
    const db = getDb();
    await db
      .update(profiles)
      .set({ bannedAt: null, banExpiresAt: null })
      .where(eq(profiles.id, profileId));
  }

  async moderationSummaryAdmin(subjectId: string) {
    const profile = await this.findById(subjectId);
    if (!profile) throw new NotFoundException();
    const db = getDb();
    const warnings = await db
      .select()
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, subjectId),
          inArray(userNotifications.kind, [
            'moderation_warning',
            'report_update',
          ]),
        ),
      )
      .orderBy(desc(userNotifications.createdAt))
      .limit(40);
    const recentAudit =
      await this.audit.listTimelineForProfile(subjectId, 20);
    return {
      profile: {
        bannedAt: profile.bannedAt?.toISOString() ?? null,
        banExpiresAt: profile.banExpiresAt?.toISOString() ?? null,
        suspendedUntil: profile.suspendedUntil?.toISOString() ?? null,
      },
      warnings: warnings.map((w) => ({
        id: w.id,
        kind: w.kind,
        title: w.title,
        body: w.body,
        createdAt: w.createdAt.toISOString(),
        readAt: w.readAt?.toISOString() ?? null,
      })),
      recentAudit: recentAudit.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: r.action,
        actorProfileId: r.actorProfileId,
        actorRole: r.actorRole,
        entityType: r.entityType,
        entityId: r.entityId,
        subjectProfileId: r.subjectProfileId,
        metadata: r.metadata,
      })),
    };
  }

  async updateAdmin(
    id: string,
    partial: Partial<{
      displayName: string | null;
      description: string | null;
      role: ProfileRole;
      avatarUrl: string | null;
      bannedAt: string | null;
      banExpiresAt: string | null;
      suspendedUntil: string | null;
    }>,
    opts?: { actorRole: ProfileRole },
  ) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException();
    const actorRole = opts?.actorRole ?? 'admin';

    if (actorRole === 'moderator') {
      if (partial.role !== undefined && partial.role !== existing.role) {
        throw new ForbiddenException('Moderators cannot change user roles.');
      }
      if (existing.role === 'admin') {
        const touchesModeration =
          partial.bannedAt !== undefined ||
          partial.banExpiresAt !== undefined ||
          partial.suspendedUntil !== undefined;
        if (touchesModeration) {
          throw new ForbiddenException(
            'Moderators cannot ban or suspend administrators.',
          );
        }
      }
    }

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
    if (partial.role !== undefined && actorRole !== 'moderator') {
      patch.role = partial.role;
    }
    if (partial.avatarUrl !== undefined) {
      patch.avatarUrl = partial.avatarUrl;
    }
    if (partial.bannedAt !== undefined) {
      patch.bannedAt =
        partial.bannedAt === null ? null : new Date(partial.bannedAt);
    }
    if (partial.banExpiresAt !== undefined) {
      patch.banExpiresAt =
        partial.banExpiresAt === null
          ? null
          : new Date(partial.banExpiresAt);
    }
    if (partial.bannedAt !== undefined && partial.bannedAt === null) {
      patch.banExpiresAt = null;
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
