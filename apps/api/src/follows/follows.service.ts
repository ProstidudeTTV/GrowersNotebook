import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db';
import {
  communities,
  communityFollows,
  profiles,
  userFollows,
} from '../db/schema';

@Injectable()
export class FollowsService {
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
    await db
      .insert(userFollows)
      .values({ followerId, followingId })
      .onConflictDoNothing();
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

  async getAllFollowingCommunityIds(userId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ id: communityFollows.communityId })
      .from(communityFollows)
      .where(eq(communityFollows.userId, userId));
    return rows.map((r) => r.id);
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
