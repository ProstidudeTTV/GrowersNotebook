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
  DEFAULT_NOTIFICATION_PREFERENCES,
  commentVotes,
  comments,
  notebookComments,
  notebooks,
  postVotes,
  posts,
  profileReports,
  profiles,
  userFollows,
  userNotifications,
} from '../db/schema';
import { BlocksService } from '../blocks/blocks.service';
import { isAllowedAvatarPublicUrl } from '../common/post-media-public-url';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { NotificationsService } from '../notifications/notifications.service';

const LAST_SEEN_TOUCH_MS = 120_000;

function normalizeNotificationPreferences(
  raw: UpdateProfileDto['notificationPreferences'],
) {
  if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw.new_comment !== undefined ? { new_comment: raw.new_comment } : {}),
    ...(raw.new_follower !== undefined
      ? { new_follower: raw.new_follower }
      : {}),
    ...(raw.vote_milestone !== undefined
      ? { vote_milestone: raw.vote_milestone }
      : {}),
    ...(raw.direct_message !== undefined
      ? { direct_message: raw.direct_message }
      : {}),
  };
}

@Injectable()
export class ProfilesService {
  private readonly lastSeenTouchAt = new Map<string, number>();

  constructor(
    private readonly blocks: BlocksService,
    private readonly follows: FollowsService,
    private readonly notifications: NotificationsService,
    private readonly nameBlocklist: NameBlocklistService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async findById(id: string) {
    const db = getDb();
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
    return row ?? null;
  }

  /** Rolling activity for `growers_online_count()` — throttled to reduce write load. */
  async touchLastSeen(userId: string): Promise<void> {
    const now = Date.now();
    const prev = this.lastSeenTouchAt.get(userId) ?? 0;
    if (now - prev < LAST_SEEN_TOUCH_MS) return;
    this.lastSeenTouchAt.set(userId, now);
    await getDb()
      .update(profiles)
      .set({ lastSeen: new Date() })
      .where(eq(profiles.id, userId));
  }

  /** Admin Refine edit forms — ISO date strings + ban/suspend flags. */
  serializeAdminProfile(
    r: NonNullable<Awaited<ReturnType<ProfilesService['findById']>>>,
  ) {
    const now = Date.now();
    const bannedActive =
      !!r.bannedAt && (!r.banExpiresAt || r.banExpiresAt.getTime() > now);
    const suspendedActive =
      !!r.suspendedUntil && r.suspendedUntil.getTime() > now;
    return {
      ...r,
      createdAt: r.createdAt.toISOString(),
      bannedAt: r.bannedAt?.toISOString() ?? null,
      banExpiresAt: r.banExpiresAt?.toISOString() ?? null,
      suspendedUntil: r.suspendedUntil?.toISOString() ?? null,
      isBanned: bannedActive,
      isSuspended: suspendedActive,
    };
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
    mailingListOptIn?: boolean,
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
        mailingListOptIn: mailingListOptIn === true,
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
      bannerUrl: row.bannerUrl,
      profilePublic: row.profilePublic,
      showGrowerStatsPublic: row.showGrowerStatsPublic,
      showNotebooksPublic: row.showNotebooksPublic,
      showFollowListsPublic: row.showFollowListsPublic,
      mailingListOptIn: row.mailingListOptIn,
      notificationPreferences:
        row.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
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
    const followListsHiddenFromViewer =
      !isOwner &&
      (row.profilePublic === false || row.showFollowListsPublic === false);

    const viewerHasBlocked =
      viewerId != null && viewerId !== profileId
        ? await this.blocks.isDirectBlock(viewerId, profileId)
        : false;

    const db = getDb();
    const [[{ followerCount }], [{ followingCount }]] = await Promise.all([
      db
        .select({ followerCount: count() })
        .from(userFollows)
        .where(eq(userFollows.followingId, profileId)),
      db
        .select({ followingCount: count() })
        .from(userFollows)
        .where(eq(userFollows.followerId, profileId)),
    ]);

    const feedVisible = !profileFeedHiddenFromViewer;
    const notebooksVisible =
      isOwner ||
      (row.profilePublic !== false && row.showNotebooksPublic !== false);

    let postCount: number | null = null;
    let commentCount: number | null = null;
    let notebookCount: number | null = null;

    if (feedVisible) {
      const [[{ postCt }], [{ commentPostCt }], [{ commentNbCt }]] =
        await Promise.all([
          db
            .select({ postCt: count() })
            .from(posts)
            .where(eq(posts.authorId, profileId)),
          db
            .select({ commentPostCt: count() })
            .from(comments)
            .where(eq(comments.authorId, profileId)),
          db
            .select({ commentNbCt: count() })
            .from(notebookComments)
            .where(eq(notebookComments.authorId, profileId)),
        ]);
      postCount = Number(postCt ?? 0);
      commentCount =
        Number(commentPostCt ?? 0) + Number(commentNbCt ?? 0);
    }

    if (notebooksVisible) {
      const [{ nbCt }] = await db
        .select({ nbCt: count() })
        .from(notebooks)
        .where(eq(notebooks.ownerId, profileId));
      notebookCount = Number(nbCt ?? 0);
    }

    const staffRole =
      row.role === 'owner' || row.role === 'admin' || row.role === 'moderator'
        ? row.role
        : null;

    return {
      id: row.id,
      displayName: row.displayName,
      description: row.description,
      avatarUrl: row.avatarUrl,
      bannerUrl: row.bannerUrl,
      createdAt: row.createdAt,
      role: staffRole,
      seeds: statsPublic ? seeds : null,
      growerLevel: statsPublic ? growerLevelFromSeeds(seeds) : null,
      followerCount: Number(followerCount ?? 0),
      followingCount: Number(followingCount ?? 0),
      postCount,
      commentCount,
      notebookCount,
      viewerFollowing,
      viewerHasBlocked,
      showFollowListsPublic: row.showFollowListsPublic !== false,
      ...(profileFeedHiddenFromViewer
        ? { profileFeedHiddenFromViewer: true as const }
        : {}),
      ...(followListsHiddenFromViewer
        ? { followListsHiddenFromViewer: true as const }
        : {}),
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const db = getDb();
    const patch: Partial<typeof profiles.$inferInsert> = {};
    if (dto.displayName !== undefined) {
      const v = dto.displayName?.trim();
      if (v) await this.nameBlocklist.assertAllowed(v);
      patch.displayName = !v ? null : v;
    }
    if (dto.description !== undefined) {
      const v = dto.description?.trim();
      patch.description = !v ? null : v;
    }
    if (dto.avatarUrl !== undefined) {
      const v = dto.avatarUrl?.trim();
      if (v && !isAllowedAvatarPublicUrl(this.config, v)) {
        throw new BadRequestException('Invalid avatar URL.');
      }
      patch.avatarUrl = !v ? null : v;
    }
    if (dto.bannerUrl !== undefined) {
      const v = dto.bannerUrl?.trim();
      if (v && !isAllowedAvatarPublicUrl(this.config, v)) {
        throw new BadRequestException('Invalid banner URL.');
      }
      patch.bannerUrl = !v ? null : v;
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
    if (dto.showFollowListsPublic !== undefined) {
      patch.showFollowListsPublic = dto.showFollowListsPublic;
    }
    if (dto.mailingListOptIn !== undefined) {
      patch.mailingListOptIn = dto.mailingListOptIn;
    }
    if (dto.notificationPreferences !== undefined) {
      patch.notificationPreferences = normalizeNotificationPreferences(
        dto.notificationPreferences,
      );
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
      .leftJoin(
        reportedProfile,
        eq(reportedProfile.id, profileReports.reportedUserId),
      )
      .leftJoin(
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
          createdAt: r.createdAt.toISOString(),
          reason: r.reason,
          reportedUserId: r.reportedUserId,
          reportedName: r.reportedName ?? '(deleted user)',
          reporterId: r.reporterId,
          reporterName: r.reporterName ?? '(deleted user)',
          reportedProfilePublic: r.reportedProfilePublic ?? false,
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
        role: profiles.role,
      })
      .from(profiles)
      .where(whereClause)
      .orderBy(asc(profiles.displayName))
      .limit(pageSize)
      .offset(skip);

    const ids = rows.map((r) => r.id);
    const [seedsMap, followed] = await Promise.all([
      this.getSeedsByUserIds(ids),
      query.viewerId
        ? this.follows.getFollowingUserIds(query.viewerId, ids)
        : Promise.resolve(null),
    ]);

    return {
      items: rows.map((r) => {
        const seeds = seedsMap.get(r.id) ?? 0;
        const staffRole =
          r.role === 'owner' || r.role === 'admin' || r.role === 'moderator'
            ? r.role
            : null;
        return {
          id: r.id,
          displayName: r.displayName,
          description: r.description,
          avatarUrl: r.avatarUrl,
          seeds,
          growerLevel: growerLevelFromSeeds(seeds),
          role: staffRole,
          isFollowing: followed?.has(r.id) ?? false,
        };
      }),
      total: Number(total),
      page,
      pageSize,
    };
  }

  async listPaged(
    skip: number,
    take: number,
    opts?: { q?: string; role?: string },
  ) {
    const db = getDb();
    const q = opts?.q?.trim();
    const role =
      opts?.role === 'admin' ||
      opts?.role === 'moderator' ||
      opts?.role === 'member'
        ? opts.role
        : undefined;
    const conditions = [];
    if (q) {
      if (/^[0-9a-f-]{36}$/i.test(q)) {
        conditions.push(eq(profiles.id, q));
      } else {
        conditions.push(ilike(profiles.displayName, `%${q}%`));
      }
    }
    if (role) {
      conditions.push(eq(profiles.role, role));
    }
    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);
    const [{ total }] = await db
      .select({ total: count() })
      .from(profiles)
      .where(where);
    const rows = await db
      .select()
      .from(profiles)
      .where(where)
      .orderBy(asc(profiles.createdAt))
      .offset(skip)
      .limit(take);
    const now = Date.now();
    const mapped = rows.map((r) => {
      const bannedActive =
        !!r.bannedAt &&
        (!r.banExpiresAt || r.banExpiresAt.getTime() > now);
      const suspendedActive =
        !!r.suspendedUntil && r.suspendedUntil.getTime() > now;
      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        bannedAt: r.bannedAt?.toISOString() ?? null,
        banExpiresAt: r.banExpiresAt?.toISOString() ?? null,
        suspendedUntil: r.suspendedUntil?.toISOString() ?? null,
        isBanned: bannedActive,
        isSuspended: suspendedActive,
      };
    });
    return { rows: mapped, total: Number(total) };
  }

  async clearExpiredBan(profileId: string) {
    const db = getDb();
    await db
      .update(profiles)
      .set({ bannedAt: null, banExpiresAt: null })
      .where(eq(profiles.id, profileId));
  }

  /**
   * Ban / temporary suspension checks for authenticated routes (shared by auth guards).
   */
  async enforceActiveAccountOrThrow(userId: string): Promise<void> {
    let row = await this.findById(userId);
    if (
      row?.bannedAt &&
      row.banExpiresAt &&
      row.banExpiresAt.getTime() <= Date.now()
    ) {
      await this.clearExpiredBan(userId);
      row = await this.findById(userId);
    }
    if (
      row?.bannedAt &&
      (!row.banExpiresAt || row.banExpiresAt.getTime() > Date.now())
    ) {
      throw new ForbiddenException('This account has been banned.');
    }
    if (row?.suspendedUntil && row.suspendedUntil.getTime() > Date.now()) {
      throw new ForbiddenException(
        `This account is suspended until ${row.suspendedUntil.toISOString()}.`,
      );
    }
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
      if (partial.avatarUrl === null || partial.avatarUrl === '') {
        patch.avatarUrl = null;
      } else {
        const v = String(partial.avatarUrl).trim();
        if (v && !isAllowedAvatarPublicUrl(this.config, v)) {
          throw new BadRequestException('Invalid avatar URL.');
        }
        patch.avatarUrl = v || null;
      }
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
