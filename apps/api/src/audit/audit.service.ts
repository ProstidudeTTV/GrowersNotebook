import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { auditEvents } from '../db/schema';

export type AuditAppendInput = {
  actorProfileId: string;
  actorRole: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  subjectProfileId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

@Injectable()
export class AuditService {
  async append(opts: AuditAppendInput) {
    const db = getDb();
    await db.insert(auditEvents).values({
      actorProfileId: opts.actorProfileId,
      actorRole: opts.actorRole,
      action: opts.action,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      subjectProfileId: opts.subjectProfileId ?? null,
      metadata: opts.metadata ?? {},
      ip: opts.ip ?? null,
    });
  }

  async listAdminPaged(opts: {
    skip: number;
    take: number;
    subjectProfileId?: string;
    actorProfileId?: string;
    action?: string;
  }) {
    const db = getDb();
    const filters = [];
    if (opts.subjectProfileId) {
      filters.push(eq(auditEvents.subjectProfileId, opts.subjectProfileId));
    }
    if (opts.actorProfileId) {
      filters.push(eq(auditEvents.actorProfileId, opts.actorProfileId));
    }
    if (opts.action?.trim()) {
      filters.push(ilike(auditEvents.action, `%${opts.action.trim()}%`));
    }
    const whereClause =
      filters.length > 0 ? and(...filters)! : sql`true`;

    const [{ total }] = await db
      .select({ total: count() })
      .from(auditEvents)
      .where(whereClause);

    const rows = await db
      .select()
      .from(auditEvents)
      .where(whereClause)
      .orderBy(desc(auditEvents.createdAt))
      .offset(opts.skip)
      .limit(opts.take);

    return { rows, total: Number(total) };
  }

  async listTimelineForProfile(profileId: string, take: number) {
    const db = getDb();
    return db
      .select()
      .from(auditEvents)
      .where(
        or(
          eq(auditEvents.subjectProfileId, profileId),
          eq(auditEvents.actorProfileId, profileId),
        )!,
      )
      .orderBy(desc(auditEvents.createdAt))
      .limit(take);
  }
}
