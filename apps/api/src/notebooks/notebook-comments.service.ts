import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { asc, eq } from 'drizzle-orm';
import { isAllowedPostMediaPublicUrl } from '../common/post-media-public-url';
import { growerLevelFromSeeds } from '../common/grower-seeds';
import { getDb } from '../db';
import { notebookComments, notebooks, profiles } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfilesService } from '../profiles/profiles.service';

const NOTEBOOK_COMMENT_IMAGE_MAX = 8;

function parseImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
}

@Injectable()
export class NotebookCommentsService {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  private normalizeImageUrls(urls: string[] | undefined): string[] {
    if (!urls?.length) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of urls) {
      const t = u.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= NOTEBOOK_COMMENT_IMAGE_MAX) break;
    }
    for (const u of out) {
      if (!isAllowedPostMediaPublicUrl(this.config, u)) {
        throw new BadRequestException('Invalid image URL.');
      }
    }
    return out;
  }

  async listForNotebook(notebookId: string, viewerId?: string) {
    const db = getDb();
    const [nb] = await db
      .select({ ownerId: notebooks.ownerId })
      .from(notebooks)
      .where(eq(notebooks.id, notebookId));
    if (!nb) throw new NotFoundException('Notebook not found');
    await this.assertNotebookReadable(nb.ownerId, viewerId);

    const rows = await db
      .select({
        comment: notebookComments,
        author: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
      })
      .from(notebookComments)
      .innerJoin(profiles, eq(notebookComments.authorId, profiles.id))
      .where(eq(notebookComments.notebookId, notebookId))
      .orderBy(asc(notebookComments.createdAt));

    const authorIds = [...new Set(rows.map((r) => r.author.id))];
    const seedsByUser = await this.profiles.getSeedsByUserIds(authorIds);

    return rows.map((r) => {
      const seeds = seedsByUser.get(r.author.id) ?? 0;
      return {
        ...r.comment,
        imageUrls: parseImages(r.comment.imageUrls),
        author: {
          ...r.author,
          seeds,
          growerLevel: growerLevelFromSeeds(seeds),
        },
      };
    });
  }

  async create(
    notebookId: string,
    authorId: string,
    dto: {
      parentId: string | null;
      body?: string;
      imageUrls?: string[];
    },
  ) {
    const db = getDb();
    const [nb] = await db
      .select({
        ownerId: notebooks.ownerId,
        title: notebooks.title,
      })
      .from(notebooks)
      .where(eq(notebooks.id, notebookId));
    if (!nb) throw new NotFoundException('Notebook not found');
    await this.assertNotebookReadable(nb.ownerId, authorId);

    let parentAuthorId: string | null = null;
    if (dto.parentId) {
      const [parent] = await db
        .select({
          id: notebookComments.id,
          notebookId: notebookComments.notebookId,
          authorId: notebookComments.authorId,
        })
        .from(notebookComments)
        .where(eq(notebookComments.id, dto.parentId));
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.notebookId !== notebookId) {
        throw new BadRequestException('Parent is on a different notebook');
      }
      parentAuthorId = parent.authorId;
    }

    const text = (dto.body ?? '').trim();
    const imageUrls = this.normalizeImageUrls(dto.imageUrls);
    if (!text && imageUrls.length === 0) {
      throw new BadRequestException('Comment must include text or an image.');
    }

    const [row] = await db
      .insert(notebookComments)
      .values({
        notebookId,
        authorId,
        parentId: dto.parentId ?? null,
        body: text,
        imageUrls,
      })
      .returning();

    let notifyUserId: string | null = null;
    let isReply = false;
    if (dto.parentId && parentAuthorId) {
      if (parentAuthorId !== authorId) {
        notifyUserId = parentAuthorId;
        isReply = true;
      }
    } else if (nb.ownerId !== authorId) {
      notifyUserId = nb.ownerId;
    }
    if (notifyUserId) {
      const nt = nb.title.trim();
      const titleShort = nt.length > 70 ? `${nt.slice(0, 70)}…` : nt;
      const preview =
        text.length > 0
          ? text.length > 120
            ? `${text.slice(0, 120)}…`
            : text
          : imageUrls.length > 0
            ? 'New comment with image'
            : 'New comment';
      const title = isReply
        ? 'Reply on a notebook thread'
        : 'New comment on your notebook';
      const body = `“${titleShort}”: ${preview}`;
      await this.notifications.createForUser(notifyUserId, title, body);
    }

    return row;
  }

  async deleteComment(userId: string, notebookId: string, commentId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(notebookComments)
      .where(eq(notebookComments.id, commentId));
    if (!row || row.notebookId !== notebookId) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();
    await db.delete(notebookComments).where(eq(notebookComments.id, commentId));
    return { ok: true as const };
  }

  async deleteCommentAdmin(commentId: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(notebookComments)
      .where(eq(notebookComments.id, commentId));
    if (!row) throw new NotFoundException();
    await db.delete(notebookComments).where(eq(notebookComments.id, commentId));
    return { ok: true as const };
  }

  private async assertNotebookReadable(ownerId: string, viewerId?: string) {
    if (viewerId === ownerId) return;
    const [p] = await getDb()
      .select({
        profilePublic: profiles.profilePublic,
        showNotebooksPublic: profiles.showNotebooksPublic,
      })
      .from(profiles)
      .where(eq(profiles.id, ownerId));
    if (!p || !p.profilePublic || !p.showNotebooksPublic) {
      throw new NotFoundException('Notebook not found');
    }
  }
}
