import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db';
import { communities, communityModerators, profiles } from '../db/schema';
import { FollowsService } from '../follows/follows.service';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';
import { assertCommunityIconKey } from './community-icon-keys';
import type { CreateCommunityDto } from './dto/create-community.dto';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly follows: FollowsService,
    private readonly nameBlocklist: NameBlocklistService,
  ) {}

  async create(dto: CreateCommunityDto) {
    await this.nameBlocklist.assertAllowed(dto.name);
    const db = getDb();
    try {
      const [row] = await db
        .insert(communities)
        .values({
          slug: dto.slug,
          name: dto.name,
          description: dto.description ?? null,
          iconKey: assertCommunityIconKey(dto.iconKey ?? null),
        })
        .returning();
      return row;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505') throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  /** Communities the user has joined (community follows), sorted by name. */
  async listFollowed(userId: string) {
    const ids = await this.follows.getAllFollowingCommunityIds(userId);
    if (ids.length === 0) return [];
    const db = getDb();
    const rows = await db
      .select()
      .from(communities)
      .where(inArray(communities.id, ids))
      .orderBy(asc(communities.name));
    return rows.map((r) => ({ ...r, viewerFollowing: true }));
  }

  async list(viewerId?: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(communities)
      .orderBy(asc(communities.name));
    if (!viewerId) {
      return rows.map((r) => ({ ...r, viewerFollowing: false }));
    }
    const ids = rows.map((r) => r.id);
    const followed = await this.follows.getFollowingCommunityIds(
      viewerId,
      ids,
    );
    return rows.map((r) => ({
      ...r,
      viewerFollowing: followed.has(r.id),
    }));
  }

  async getBySlug(slug: string, viewerId?: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(communities)
      .where(eq(communities.slug, slug));
    if (!row) throw new NotFoundException('Community not found');
    if (!viewerId) {
      return { ...row, viewerFollowing: false };
    }
    const following = await this.follows.getFollowingCommunityIds(viewerId, [
      row.id,
    ]);
    return { ...row, viewerFollowing: following.has(row.id) };
  }

  async findById(id: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, id));
    return row ?? null;
  }

  async listPaged(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(communities);
    const rows = await db
      .select()
      .from(communities)
      .orderBy(asc(communities.createdAt))
      .offset(skip)
      .limit(take);
    return { rows, total };
  }

  async update(
    id: string,
    partial: Partial<{
      name: string;
      description: string | null;
      iconKey: string | null;
    }>,
  ) {
    if (partial.name !== undefined) {
      await this.nameBlocklist.assertAllowed(partial.name);
    }
    const db = getDb();
    const toSet: {
      name?: string;
      description?: string | null;
      iconKey?: string | null;
    } = {};
    if (partial.name !== undefined) toSet.name = partial.name;
    if (partial.description !== undefined)
      toSet.description = partial.description;
    if (partial.iconKey !== undefined) {
      toSet.iconKey = assertCommunityIconKey(partial.iconKey);
    }
    const [row] = await db
      .update(communities)
      .set(toSet)
      .where(eq(communities.id, id))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }

  async listCommunityModerators(communityId: string) {
    const c = await this.findById(communityId);
    if (!c) throw new NotFoundException('Community not found');
    const db = getDb();
    return db
      .select({
        communityId: communityModerators.communityId,
        moderatorId: communityModerators.moderatorId,
        assignedAt: communityModerators.assignedAt,
        displayName: profiles.displayName,
      })
      .from(communityModerators)
      .innerJoin(profiles, eq(communityModerators.moderatorId, profiles.id))
      .where(eq(communityModerators.communityId, communityId))
      .orderBy(asc(communityModerators.assignedAt));
  }

  async addCommunityModerator(communityId: string, moderatorId: string) {
    const c = await this.findById(communityId);
    if (!c) throw new NotFoundException('Community not found');
    const db = getDb();
    const [user] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, moderatorId));
    if (!user) throw new NotFoundException('User not found');
    await db
      .insert(communityModerators)
      .values({ communityId, moderatorId })
      .onConflictDoNothing();
    return { ok: true as const };
  }

  async removeCommunityModerator(communityId: string, moderatorId: string) {
    const db = getDb();
    await db
      .delete(communityModerators)
      .where(
        and(
          eq(communityModerators.communityId, communityId),
          eq(communityModerators.moderatorId, moderatorId),
        ),
      );
    return { ok: true as const };
  }

  /**
   * Hard-delete a community. DB cascades remove community posts (and their
   * comments, votes, etc.), follows, moderators, and pins.
   */
  async deleteById(id: string) {
    const c = await this.findById(id);
    if (!c) throw new NotFoundException('Community not found');
    const db = getDb();
    await db.delete(communities).where(eq(communities.id, id));
    return { ok: true as const };
  }
}
