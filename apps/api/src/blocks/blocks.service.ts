import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { profiles, userBlocks, userFollows } from '../db/schema';

@Injectable()
export class BlocksService {
  /** True if either user blocked the other (symmetric for feed hiding). */
  async hasBlockBetween(a: string, b: string): Promise<boolean> {
    if (a === b) return false;
    const db = getDb();
    const [r] = await db
      .select({ x: sql`1` })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
          and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
        ),
      )
      .limit(1);
    return !!r;
  }

  /** `blocker` has an active block on `blocked` (one-way). */
  async isDirectBlock(blockerId: string, blockedId: string): Promise<boolean> {
    if (blockerId === blockedId) return false;
    const db = getDb();
    const [r] = await db
      .select({ x: sql`1` })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId),
        ),
      )
      .limit(1);
    return !!r;
  }

  /** Users to exclude from feeds / comments when `viewerId` is browsing. */
  async getHiddenUserIdsForViewer(viewerId: string): Promise<string[]> {
    const db = getDb();
    const blocked = await db
      .select({ id: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, viewerId));
    const blockers = await db
      .select({ id: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, viewerId));
    return [
      ...new Set([
        ...blocked.map((r) => r.id),
        ...blockers.map((r) => r.id),
      ]),
    ];
  }

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself.');
    }
    const db = getDb();
    const target = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, blockedId))
      .limit(1);
    if (!target.length) throw new NotFoundException('User not found.');

    await db
      .insert(userBlocks)
      .values({ blockerId, blockedId })
      .onConflictDoNothing({
        target: [userBlocks.blockerId, userBlocks.blockedId],
      });

    await db.delete(userFollows).where(
      or(
        and(
          eq(userFollows.followerId, blockerId),
          eq(userFollows.followingId, blockedId),
        ),
        and(
          eq(userFollows.followerId, blockedId),
          eq(userFollows.followingId, blockerId),
        ),
      ),
    );
    return { ok: true as const };
  }

  async unblock(blockerId: string, blockedId: string) {
    const db = getDb();
    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId),
        ),
      );
    return { ok: true as const };
  }

  async listBlockedWithDisplay(blockerId: string) {
    const db = getDb();
    const rows = await db
      .select({
        userId: userBlocks.blockedId,
        createdAt: userBlocks.createdAt,
        displayName: profiles.displayName,
      })
      .from(userBlocks)
      .innerJoin(profiles, eq(profiles.id, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, blockerId))
      .orderBy(desc(userBlocks.createdAt));
    return {
      items: rows.map((r) => ({
        userId: r.userId,
        displayName: r.displayName,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
