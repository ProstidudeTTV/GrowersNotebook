import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '../db';
import { userNotifications } from '../db/schema';

export type CreateUserNotificationOptions = {
  kind?: string;
  /** Site-relative URL (e.g. /p/uuid#comment-id). Omit for modal-only (moderation_warning). */
  actionUrl?: string | null;
};

@Injectable()
export class NotificationsService {
  async createForUser(
    userId: string,
    title: string,
    body: string,
    options?: CreateUserNotificationOptions,
  ) {
    const kind = options?.kind ?? 'general';
    const actionUrl = options?.actionUrl ?? null;
    const db = getDb();
    const [row] = await db
      .insert(userNotifications)
      .values({ userId, title, body, kind, actionUrl })
      .returning();
    return row;
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

  async deleteOne(userId: string, id: string) {
    const db = getDb();
    const [row] = await db
      .select({ id: userNotifications.id })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.id, id),
          eq(userNotifications.userId, userId),
        ),
      )
      .limit(1);
    if (!row) return null;
    await db
      .delete(userNotifications)
      .where(
        and(
          eq(userNotifications.id, id),
          eq(userNotifications.userId, userId),
        ),
      );
    return { ok: true as const };
  }

  async deleteAllForUser(userId: string) {
    const db = getDb();
    await db
      .delete(userNotifications)
      .where(eq(userNotifications.userId, userId));
    return { ok: true as const };
  }
}
