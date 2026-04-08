import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  desc,
  eq,
  inArray,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { getDb } from '../db';
import {
  dmMessages,
  dmThreadReads,
  dmThreads,
  profiles,
} from '../db/schema';
import { FollowsService } from '../follows/follows.service';
import { ProfilesService } from '../profiles/profiles.service';

const DM_MESSAGE_IMAGE_MAX = 8;

function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function normalizeStoredMessageImages(
  imageUrlsJson: unknown,
  legacyImageUrl: string | null | undefined,
): string[] {
  if (Array.isArray(imageUrlsJson)) {
    const u = imageUrlsJson.filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0,
    );
    if (u.length) return u;
  }
  const one = legacyImageUrl?.trim();
  return one ? [one] : [];
}

@Injectable()
export class DirectMessagesService {
  constructor(
    private readonly follows: FollowsService,
    private readonly profiles: ProfilesService,
    private readonly config: ConfigService,
  ) {}

  /** Only our Supabase `post-media` public URLs (same client upload path as posts). */
  private isAllowedDmImageUrl(url: string): boolean {
    const raw =
      this.config.get<string>('SUPABASE_URL')?.trim() ||
      this.config.get<string>('NEXT_PUBLIC_SUPABASE_URL')?.trim();
    const base = raw?.replace(/\/+$/, '');
    if (!base) return false;
    const prefix = `${base}/storage/v1/object/public/post-media/`;
    return url.startsWith(prefix);
  }

  async openThread(userId: string, peerProfileId: string) {
    if (peerProfileId === userId) {
      throw new BadRequestException('Cannot open a chat with yourself.');
    }
    const peer = await this.profiles.findById(peerProfileId);
    if (!peer) throw new NotFoundException('User not found.');
    const allowed = await this.follows.getFollowingUserIds(userId, [
      peerProfileId,
    ]);
    if (!allowed.has(peerProfileId)) {
      throw new ForbiddenException(
        'You can only start a chat with someone you follow.',
      );
    }
    const [low, high] = canonicalPair(userId, peerProfileId);
    const db = getDb();
    const [existing] = await db
      .select({ id: dmThreads.id })
      .from(dmThreads)
      .where(
        and(eq(dmThreads.userLow, low), eq(dmThreads.userHigh, high)),
      )
      .limit(1);
    if (existing) {
      return {
        threadId: existing.id,
        peer: { id: peer.id, displayName: peer.displayName ?? null },
      };
    }
    try {
      const [created] = await db
        .insert(dmThreads)
        .values({ userLow: low, userHigh: high })
        .returning({ id: dmThreads.id });
      return {
        threadId: created.id,
        peer: { id: peer.id, displayName: peer.displayName ?? null },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (!/unique|duplicate/i.test(msg)) throw e;
      const [again] = await db
        .select({ id: dmThreads.id })
        .from(dmThreads)
        .where(
          and(eq(dmThreads.userLow, low), eq(dmThreads.userHigh, high)),
        )
        .limit(1);
      if (!again) throw e;
      return {
        threadId: again.id,
        peer: { id: peer.id, displayName: peer.displayName ?? null },
      };
    }
  }

  async listThreads(userId: string) {
    const db = getDb();
    const rows = await db.execute<{
      id: string;
      user_low: string;
      user_high: string;
      last_message_at: string | null;
      created_at: string;
      last_body: string | null;
      last_image_url: string | null;
      last_image_urls: unknown;
      last_sender_id: string | null;
      last_created_at: string | null;
      last_message_id: string | null;
    }>(sql`
      SELECT
        t.id,
        t.user_low,
        t.user_high,
        t.last_message_at,
        t.created_at,
        lm.body AS last_body,
        lm.image_url AS last_image_url,
        lm.image_urls AS last_image_urls,
        lm.sender_id AS last_sender_id,
        lm.created_at AS last_created_at,
        lm.id AS last_message_id
      FROM ${dmThreads} AS t
      LEFT JOIN LATERAL (
        SELECT m.id, m.body, m.image_url, m.image_urls, m.sender_id, m.created_at
        FROM ${dmMessages} AS m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) AS lm ON true
      WHERE t.user_low = ${userId}::uuid OR t.user_high = ${userId}::uuid
      ORDER BY COALESCE(t.last_message_at, t.created_at) DESC NULLS LAST
    `);

    const out = [...rows];
    const threadIds = out.map((r) => r.id);
    if (threadIds.length === 0) return { items: [] as const };

    const reads = await db
      .select({
        threadId: dmThreadReads.threadId,
        lastReadAt: dmThreadReads.lastReadAt,
      })
      .from(dmThreadReads)
      .where(
        and(
          eq(dmThreadReads.profileId, userId),
          inArray(dmThreadReads.threadId, threadIds),
        ),
      );
    const readMap = new Map(reads.map((x) => [x.threadId, x.lastReadAt]));

    const peerIds = [...new Set(out.map((r) => (r.user_low === userId ? r.user_high : r.user_low)))];
    const profRows =
      peerIds.length === 0
        ? []
        : await db
            .select({
              id: profiles.id,
              displayName: profiles.displayName,
            })
            .from(profiles)
            .where(inArray(profiles.id, peerIds));
    const peerMap = new Map(
      profRows.map((p) => [p.id, p.displayName ?? null]),
    );

    const items = out.map((r) => {
      const peerId = r.user_low === userId ? r.user_high : r.user_low;
      const lastAt = r.last_created_at
        ? new Date(r.last_created_at)
        : null;
      const readAtRaw = readMap.get(r.id);
      const readAt =
        readAtRaw instanceof Date
          ? readAtRaw
          : readAtRaw != null
            ? new Date(readAtRaw as unknown as string)
            : null;
      const hasInboundLast =
        r.last_sender_id != null &&
        r.last_sender_id !== userId &&
        lastAt != null;
      const unread =
        hasInboundLast &&
        (readAt == null || readAt.getTime() < lastAt.getTime());
      const lastImages = normalizeStoredMessageImages(
        r.last_image_urls,
        r.last_image_url,
      );
      return {
        id: r.id,
        peer: {
          id: peerId,
          displayName: peerMap.get(peerId) ?? null,
        },
        lastMessage:
          r.last_message_id && r.last_sender_id && r.last_created_at
            ? {
                id: r.last_message_id,
                body: r.last_body ?? '',
                imageUrls: lastImages,
                imageUrl: lastImages[0] ?? null,
                senderId: r.last_sender_id,
                createdAt: r.last_created_at,
              }
            : null,
        unread,
        lastMessageAt: r.last_message_at,
      };
    });
    return { items };
  }

  private async ensureParticipant(threadId: string, userId: string) {
    const db = getDb();
    const [t] = await db
      .select({
        userLow: dmThreads.userLow,
        userHigh: dmThreads.userHigh,
      })
      .from(dmThreads)
      .where(eq(dmThreads.id, threadId))
      .limit(1);
    if (!t) throw new NotFoundException('Thread not found.');
    if (t.userLow !== userId && t.userHigh !== userId) {
      throw new ForbiddenException();
    }
  }

  async listMessages(
    threadId: string,
    userId: string,
    limit: number,
    before?: string,
  ) {
    await this.ensureParticipant(threadId, userId);
    const db = getDb();
    let beforeRow:
      | { createdAt: Date; id: string }
      | undefined;
    if (before) {
      const [m] = await db
        .select({
          threadId: dmMessages.threadId,
          createdAt: dmMessages.createdAt,
          id: dmMessages.id,
        })
        .from(dmMessages)
        .where(eq(dmMessages.id, before))
        .limit(1);
      if (!m || m.threadId !== threadId) {
        throw new BadRequestException('Invalid before cursor.');
      }
      beforeRow = m;
    }
    const conditions = [eq(dmMessages.threadId, threadId)];
    if (beforeRow) {
      conditions.push(
        or(
          lt(dmMessages.createdAt, beforeRow.createdAt),
          and(
            eq(dmMessages.createdAt, beforeRow.createdAt),
            lt(dmMessages.id, beforeRow.id),
          )!,
        )!,
      );
    }
    const rows = await db
      .select({
        id: dmMessages.id,
        senderId: dmMessages.senderId,
        body: dmMessages.body,
        imageUrl: dmMessages.imageUrl,
        imageUrls: dmMessages.imageUrls,
        createdAt: dmMessages.createdAt,
      })
      .from(dmMessages)
      .where(and(...conditions))
      .orderBy(desc(dmMessages.createdAt), desc(dmMessages.id))
      .limit(limit);
    const chronological = [...rows].reverse();
    const oldest = chronological[0];
    let hasMore = false;
    if (oldest) {
      const older = await db
        .select({ id: dmMessages.id })
        .from(dmMessages)
        .where(
          and(
            eq(dmMessages.threadId, threadId),
            or(
              lt(dmMessages.createdAt, oldest.createdAt),
              and(
                eq(dmMessages.createdAt, oldest.createdAt),
                lt(dmMessages.id, oldest.id),
              ),
            ),
          ),
        )
        .limit(1);
      hasMore = older.length > 0;
    }
    const oldestId = oldest?.id ?? null;
    return {
      items: chronological.map((m) => {
        const urls = normalizeStoredMessageImages(m.imageUrls, m.imageUrl);
        return {
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          imageUrls: urls,
          imageUrl: urls[0] ?? null,
          createdAt: m.createdAt.toISOString(),
        };
      }),
      oldestId: oldestId ?? null,
      hasMore,
    };
  }

  async postMessage(
    threadId: string,
    userId: string,
    payload: { body: string; imageUrl?: string; imageUrls?: string[] },
  ) {
    await this.ensureParticipant(threadId, userId);
    const text = (payload.body ?? '').trim();
    const fromList = (payload.imageUrls ?? [])
      .map((u) => u.trim())
      .filter(Boolean);
    const single = payload.imageUrl?.trim();
    const merged =
      fromList.length > 0 ? fromList : single ? [single] : [];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const u of merged) {
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      if (urls.length >= DM_MESSAGE_IMAGE_MAX) break;
    }
    if (!text && urls.length === 0) {
      throw new BadRequestException('Message must include text or an image.');
    }
    for (const u of urls) {
      if (!this.isAllowedDmImageUrl(u)) {
        throw new BadRequestException('Invalid image URL.');
      }
    }
    const db = getDb();
    const [msg] = await db
      .insert(dmMessages)
      .values({
        threadId,
        senderId: userId,
        body: text,
        imageUrl: urls[0] ?? null,
        imageUrls: urls,
      })
      .returning({
        id: dmMessages.id,
        senderId: dmMessages.senderId,
        body: dmMessages.body,
        imageUrl: dmMessages.imageUrl,
        imageUrls: dmMessages.imageUrls,
        createdAt: dmMessages.createdAt,
      });
    await db
      .update(dmThreads)
      .set({ lastMessageAt: msg.createdAt })
      .where(eq(dmThreads.id, threadId));
    const outUrls = normalizeStoredMessageImages(msg.imageUrls, msg.imageUrl);
    return {
      id: msg.id,
      senderId: msg.senderId,
      body: msg.body,
      imageUrls: outUrls,
      imageUrl: outUrls[0] ?? null,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  async markRead(threadId: string, userId: string) {
    await this.ensureParticipant(threadId, userId);
    const db = getDb();
    const now = new Date();
    await db
      .insert(dmThreadReads)
      .values({ threadId, profileId: userId, lastReadAt: now })
      .onConflictDoUpdate({
        target: [dmThreadReads.threadId, dmThreadReads.profileId],
        set: { lastReadAt: now },
      });
  }
}
