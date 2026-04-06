import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db';
import {
  communityModerators,
  communityPins,
  posts,
} from '../db/schema';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class CommunityPinsService {
  constructor(private readonly profiles: ProfilesService) {}

  /** Site admins, or users listed for this community, may pin. */
  async assertCanModerateCommunity(
    communityId: string,
    userId: string,
  ): Promise<void> {
    const profile = await this.profiles.findById(userId);
    if (!profile) throw new ForbiddenException();

    if (profile.role === 'admin') return;

    const db = getDb();
    const [row] = await db
      .select()
      .from(communityModerators)
      .where(
        and(
          eq(communityModerators.communityId, communityId),
          eq(communityModerators.moderatorId, userId),
        ),
      );
    if (!row) {
      throw new ForbiddenException(
        'You are not assigned to moderate this community.',
      );
    }
  }

  async pinPost(postId: string, userId: string): Promise<{ ok: true }> {
    const db = getDb();
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new NotFoundException('Post not found');
    if (!post.communityId) {
      throw new BadRequestException(
        'Only posts in a community can be pinned to that community feed.',
      );
    }

    await this.assertCanModerateCommunity(post.communityId, userId);

    try {
      await db.insert(communityPins).values({
        communityId: post.communityId,
        postId,
        pinnedBy: userId,
      });
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505') {
        throw new ConflictException('This post is already pinned in this community.');
      }
      throw e;
    }
  }

  async unpinPost(postId: string, userId: string): Promise<{ ok: true }> {
    const db = getDb();
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post?.communityId) throw new NotFoundException('Post not found');

    await this.assertCanModerateCommunity(post.communityId, userId);

    await db
      .delete(communityPins)
      .where(
        and(
          eq(communityPins.postId, postId),
          eq(communityPins.communityId, post.communityId),
        ),
      );
    return { ok: true };
  }
}
