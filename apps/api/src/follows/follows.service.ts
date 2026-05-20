import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { BlocksService } from '../blocks/blocks.service';
import { getDb } from '../db';
import {
  communities,
  communityFollows,
  profiles,
  userFollows,
} from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';

type ListFollowOpts = { viewerId?: string };

@Injectable()
export class FollowsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly blocks: BlocksService,
  ) {}

  private async assertFollowListsVisible(
    profileId: string,
    viewerId?: string,
  ): Promise<{
    hidden: boolean;
    hiddenReason?: 'private_lists' | 'private_profile';
  }> {
    const db = getDb();
    const [row] = await db
      .select({
        profilePublic: profiles.profilePublic,
        showFollowListsPublic: profiles.showFollowListsPublic,
      })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!row) throw new NotFoundException('User not found.');
    if (viewerId === profileId) {
      return { hidden: false };
    }
    if (row.profilePublic === false) {
      return { hidden: true, hiddenReason: 'private_profile' };
    }
    if (row.showFollowListsPublic === false) {
      return { hidden: true, hiddenReason: 'private_lists' };
    }
    return { hidden: false };
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    const db = getDb();
    const [target] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, followingId))
      .limit(1);
    if (!target) throw new NotFoundException('User not found.');
    const inserted = await db
      .insert(userFollows)
      .values({ followerId, followingId })
      .onConflictDoNothing()
      .returning({ followerId: userFollows.followerId });
    if (inserted.length > 0) {
      const [follower] = await db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, followerId))
        .limit(1);
      const label = follower?.displayName?.trim() || 'A grower';
      await this.notifications.createForUser(
        followingId,
        'New follower',
        `${label} started following you.`,
        {
          kind: 'new_follower',
          actionUrl: `/u/${followerId}`,
        },
      );
    }
    return { ok: true };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const db = getDb();
    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId),
        ),
      );
    return { ok: true };
  }

  async followCommunity(userId: string, communityId: string) {
    const db = getDb();
    const [c] = await db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);
    if (!c) throw new NotFoundException('Community not found.');
    await db
      .insert(communityFollows)
      .values({ userId, communityId })
      .onConflictDoNothing();
    return { ok: true };
  }

  async unfollowCommunity(userId: string, communityId: string) {
    const db = getDb();
    await db
      .delete(communityFollows)
      .where(
        and(
          eq(communityFollows.userId, userId),
          eq(communityFollows.communityId, communityId),
        ),
      );
    return { ok: true };
  }

  async getFollowingUserIds(
    followerId: string,
    candidateIds: string[],
  ): Promise<Set<string>> {
    const out = new Set<string>();
    if (candidateIds.length === 0) return out;
    const uniq = [...new Set(candidateIds)];
    const db = getDb();
    const rows = await db
      .select({ followingId: userFollows.followingId })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          inArray(userFollows.followingId, uniq),
        ),
      );
    for (const r of rows) out.add(r.followingId);
    return out;
  }

  async getAllFollowingUserIds(followerId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ id: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, followerId));
    return rows.map((r) => r.id);
  }

  /** People this user follows (for messaging picker). */
  async listUsersIFollowWithProfiles(followerId: string) {
    const db = getDb();
    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
      })
      .from(userFollows)
      .innerJoin(profiles, eq(profiles.id, userFollows.followingId))
      .where(eq(userFollows.followerId, followerId))
      .orderBy(asc(profiles.displayName));
    return { items: rows };
  }

  async getAllFollowingCommunityIds(userId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ id: communityFollows.communityId })
      .from(communityFollows)
      .where(eq(communityFollows.userId, userId));
    return rows.map((r) => r.id);
  }

  async listFollowers(
    userId: string,
    page: number,
    pageSize: number,
    opts: ListFollowOpts = {},
  ) {
    const visibility = await this.assertFollowListsVisible(
      userId,
      opts.viewerId,
    );
    if (visibility.hidden) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hidden: true,
        hiddenReason: visibility.hiddenReason,
      };
    }

    const db = getDb();
    const hiddenIds =
      opts.viewerId != null
        ? await this.blocks.getHiddenUserIdsForViewer(opts.viewerId)
        : [];
    const skip = (page - 1) * pageSize;
    const baseWhere = eq(userFollows.followingId, userId);
    const excludeHidden =
      hiddenIds.length > 0
        ? and(baseWhere, notInArray(userFollows.followerId, hiddenIds))
        : baseWhere;

    const [{ total }] = await db
      .select({ total: count() })
      .from(userFollows)
      .where(excludeHidden);

    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        followedAt: userFollows.createdAt,
      })
      .from(userFollows)
      .innerJoin(profiles, eq(profiles.id, userFollows.followerId))
      .where(excludeHidden)
      .orderBy(desc(userFollows.createdAt))
      .limit(pageSize)
      .offset(skip);

    return {
      items: rows,
      total: Number(total),
      page,
      pageSize,
      hidden: false,
    };
  }

  async listFollowing(
    userId: string,
    page: number,
    pageSize: number,
    opts: ListFollowOpts = {},
  ) {
    const visibility = await this.assertFollowListsVisible(
      userId,
      opts.viewerId,
    );
    if (visibility.hidden) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        hidden: true,
        hiddenReason: visibility.hiddenReason,
      };
    }

    const db = getDb();
    const hiddenIds =
      opts.viewerId != null
        ? await this.blocks.getHiddenUserIdsForViewer(opts.viewerId)
        : [];
    const skip = (page - 1) * pageSize;
    const baseWhere = eq(userFollows.followerId, userId);
    const excludeHidden =
      hiddenIds.length > 0
        ? and(baseWhere, notInArray(userFollows.followingId, hiddenIds))
        : baseWhere;

    const [{ total }] = await db
      .select({ total: count() })
      .from(userFollows)
      .where(excludeHidden);

    const rows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        followedAt: userFollows.createdAt,
      })
      .from(userFollows)
      .innerJoin(profiles, eq(profiles.id, userFollows.followingId))
      .where(excludeHidden)
      .orderBy(desc(userFollows.createdAt))
      .limit(pageSize)
      .offset(skip);

    return {
      items: rows,
      total: Number(total),
      page,
      pageSize,
      hidden: false,
    };
  }

  async getFollowingCommunityIds(
    userId: string,
    communityIds: string[],
  ): Promise<Set<string>> {
    const out = new Set<string>();
    if (communityIds.length === 0) return out;
    const uniq = [...new Set(communityIds)];
    const db = getDb();
    const rows = await db
      .select({ communityId: communityFollows.communityId })
      .from(communityFollows)
      .where(
        and(
          eq(communityFollows.userId, userId),
          inArray(communityFollows.communityId, uniq),
        ),
      );
    for (const r of rows) out.add(r.communityId);
    return out;
  }
}
