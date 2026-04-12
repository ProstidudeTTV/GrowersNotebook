import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { siteConfig } from '../db/schema';
import type { PatchSiteConfigDto } from './dto/patch-site-config.dto';

export type PublicSiteConfigPayload = {
  motdText: string | null;
  announcement: {
    title: string;
    body: string;
    style: 'info' | 'warning';
  } | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  /** Empty in DB = use built-in defaults in Next.js. */
  seoDefaultTitle: string | null;
  seoDefaultDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
};

@Injectable()
export class SiteConfigService {
  private async getRow() {
    const db = getDb();
    const [row] = await db.select().from(siteConfig).where(eq(siteConfig.id, 1));
    return row ?? null;
  }

  async getPublicPayload(): Promise<PublicSiteConfigPayload> {
    const row = await this.getRow();
    if (!row) {
      return {
        motdText: null,
        announcement: null,
        maintenanceEnabled: false,
        maintenanceMessage: null,
        seoDefaultTitle: null,
        seoDefaultDescription: null,
        seoKeywords: null,
        ogImageUrl: null,
      };
    }
    const now = new Date();
    let announcement: PublicSiteConfigPayload['announcement'] = null;
    if (row.announcementEnabled) {
      const afterStart =
        !row.announcementStartsAt || row.announcementStartsAt <= now;
      const beforeEnd =
        !row.announcementEndsAt || row.announcementEndsAt >= now;
      const title = row.announcementTitle?.trim() ?? '';
      const body = row.announcementBody?.trim() ?? '';
      if (afterStart && beforeEnd && (title.length > 0 || body.length > 0)) {
        announcement = {
          title,
          body,
          style: row.announcementStyle === 'warning' ? 'warning' : 'info',
        };
      }
    }
    return {
      motdText: row.motdText?.trim() || null,
      announcement,
      maintenanceEnabled: row.maintenanceEnabled,
      maintenanceMessage: row.maintenanceMessage?.trim() || null,
      seoDefaultTitle: row.seoDefaultTitle?.trim() || null,
      seoDefaultDescription: row.seoDefaultDescription?.trim() || null,
      seoKeywords: row.seoKeywords?.trim() || null,
      ogImageUrl: row.ogImageUrl?.trim() || null,
    };
  }

  async getStaffPayload() {
    const row = await this.getRow();
    if (!row) throw new NotFoundException('site_config row missing');
    return {
      motdText: row.motdText,
      announcementTitle: row.announcementTitle,
      announcementBody: row.announcementBody,
      announcementStyle: row.announcementStyle,
      announcementStartsAt: row.announcementStartsAt?.toISOString() ?? null,
      announcementEndsAt: row.announcementEndsAt?.toISOString() ?? null,
      announcementEnabled: row.announcementEnabled,
      maintenanceEnabled: row.maintenanceEnabled,
      maintenanceMessage: row.maintenanceMessage,
      seoDefaultTitle: row.seoDefaultTitle ?? null,
      seoDefaultDescription: row.seoDefaultDescription ?? null,
      seoKeywords: row.seoKeywords ?? null,
      ogImageUrl: row.ogImageUrl ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async patch(body: PatchSiteConfigDto) {
    const db = getDb();
    const row = await this.getRow();
    if (!row) throw new NotFoundException('site_config row missing');

    const patch: Partial<typeof siteConfig.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.motdText !== undefined) patch.motdText = body.motdText;
    if (body.announcementTitle !== undefined)
      patch.announcementTitle = body.announcementTitle;
    if (body.announcementBody !== undefined)
      patch.announcementBody = body.announcementBody;
    if (body.announcementStyle !== undefined)
      patch.announcementStyle = body.announcementStyle;
    if (body.announcementStartsAt !== undefined) {
      patch.announcementStartsAt =
        body.announcementStartsAt === null
          ? null
          : new Date(body.announcementStartsAt);
    }
    if (body.announcementEndsAt !== undefined) {
      patch.announcementEndsAt =
        body.announcementEndsAt === null
          ? null
          : new Date(body.announcementEndsAt);
    }
    if (body.announcementEnabled !== undefined)
      patch.announcementEnabled = body.announcementEnabled;
    if (body.maintenanceEnabled !== undefined)
      patch.maintenanceEnabled = body.maintenanceEnabled;
    if (body.maintenanceMessage !== undefined)
      patch.maintenanceMessage = body.maintenanceMessage;
    if (body.seoDefaultTitle !== undefined)
      patch.seoDefaultTitle = body.seoDefaultTitle;
    if (body.seoDefaultDescription !== undefined)
      patch.seoDefaultDescription = body.seoDefaultDescription;
    if (body.seoKeywords !== undefined) patch.seoKeywords = body.seoKeywords;
    if (body.ogImageUrl !== undefined) patch.ogImageUrl = body.ogImageUrl;

    await db.update(siteConfig).set(patch).where(eq(siteConfig.id, 1));
    return this.getStaffPayload();
  }
}
