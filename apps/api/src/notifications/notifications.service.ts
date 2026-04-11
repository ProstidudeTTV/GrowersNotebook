import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '../db';
import { userNotifications } from '../db/schema';

@Injectable()
export class NotificationsService {
  async createForUser(userId: string, title: string, body: string) {
    const db = getDb();
    const [row] = await db
      .insert(userNotifications)
      .values({ userId, title, body })
      .returning();
    return row;
  }

  /** Fan-out the same notification to many users (e.g. community followers). */
  async createForManyUsers(userIds: string[], title: string, body: string) {
    const uniq = [...new Set(userIds)].filter(Boolean);
    if (uniq.length === 0) return;
    const db = getDb();
    await db.insert(userNotifications).values(
      uniq.map((userId) => ({ userId, title, body })),
    );
  }

  async listForUser(userId: string, skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db
      .select({ total: count() })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));
    const rows = await db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .offset(skip)
      .limit(take);
    return { rows, total };
  }

  async countUnread(userId: string): Promise<number> {
    const db = getDb();
    const [{ c }] = await db
      .select({ c: count() })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          isNull(userNotifications.readAt),
        ),
      );
    return Number(c);
  }

  async markRead(userId: string, id: string) {
    const db = getDb();
    const [row] = await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(userNotifications.id, id),
          eq(userNotifications.userId, userId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async markAllRead(userId: string) {
    const db = getDb();
    await db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(userNotifications.userId, userId),
          isNull(userNotifications.readAt),
        ),
      );
  }
}
