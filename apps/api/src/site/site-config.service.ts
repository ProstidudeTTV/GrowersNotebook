import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { siteConfig } from '../db/schema';
import type { PatchSiteConfigDto } from './dto/patch-site-config.dto';
import type { SendMaintenanceEmailDto } from './dto/send-maintenance-email.dto';
import { MaintenanceNotifyService } from './maintenance-notify.service';

function instantMs(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === 'string') {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export type PublicSiteConfigPayload = {
  motdText: string | null;
  announcement: {
    title: string;
    body: string;
    style: 'info' | 'warning';
  } | null;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  /**
   * When true, the site may show a one-time (per session) prompt to join the mailing list
   * after bulk email issues (e.g. SMTP failures).
   */
  mailingListNudgeRecommended: boolean;
  /** Empty in DB = use built-in defaults in Next.js. */
  seoDefaultTitle: string | null;
  seoDefaultDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
};

@Injectable()
export class SiteConfigService {
  private readonly logger = new Logger(SiteConfigService.name);

  constructor(private readonly maintenanceNotify: MaintenanceNotifyService) {}

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
        mailingListNudgeRecommended: false,
        seoDefaultTitle: null,
        seoDefaultDescription: null,
        seoKeywords: null,
        ogImageUrl: null,
      };
    }
    const nowMs = Date.now();
    let announcement: PublicSiteConfigPayload['announcement'] = null;
    if (row.announcementEnabled) {
      const startMs = instantMs(row.announcementStartsAt);
      const endMs = instantMs(row.announcementEndsAt);
      const afterStart = startMs == null || startMs <= nowMs;
      const beforeEnd = endMs == null || endMs >= nowMs;
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
      mailingListNudgeRecommended: row.emailOutreachFailureAt != null,
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
      maintenanceEmailSubject: row.maintenanceEmailSubject ?? null,
      maintenanceEmailBody: row.maintenanceEmailBody ?? null,
      seoDefaultTitle: row.seoDefaultTitle ?? null,
      seoDefaultDescription: row.seoDefaultDescription ?? null,
      seoKeywords: row.seoKeywords ?? null,
      ogImageUrl: row.ogImageUrl ?? null,
      updatedAt: row.updatedAt.toISOString(),
      maintenanceEmailConfigured: this.maintenanceNotify.canSendBulkEmail(),
      emailOutreachFailureAt:
        row.emailOutreachFailureAt?.toISOString() ?? null,
    };
  }

  async patch(body: PatchSiteConfigDto) {
    const db = getDb();
    const row = await this.getRow();
    if (!row) throw new NotFoundException('site_config row missing');

    const enablingMaintenance =
      body.maintenanceEnabled === true && !row.maintenanceEnabled;
    const shouldNotifyUsers = body.notifyUsersOnMaintenance !== false;
    const messageForEmail =
      body.maintenanceMessage !== undefined
        ? body.maintenanceMessage
        : row.maintenanceMessage;

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
    if (body.maintenanceEmailSubject !== undefined)
      patch.maintenanceEmailSubject = body.maintenanceEmailSubject;
    if (body.maintenanceEmailBody !== undefined)
      patch.maintenanceEmailBody = body.maintenanceEmailBody;
    if (body.seoDefaultTitle !== undefined)
      patch.seoDefaultTitle = body.seoDefaultTitle;
    if (body.seoDefaultDescription !== undefined)
      patch.seoDefaultDescription = body.seoDefaultDescription;
    if (body.seoKeywords !== undefined) patch.seoKeywords = body.seoKeywords;
    if (body.ogImageUrl !== undefined) patch.ogImageUrl = body.ogImageUrl;
    if (body.clearEmailOutreachFailure === true) {
      patch.emailOutreachFailureAt = null;
    }

    await db.update(siteConfig).set(patch).where(eq(siteConfig.id, 1));

    if (enablingMaintenance && shouldNotifyUsers) {
      const updated = await this.getRow();
      if (updated) {
        const email = this.maintenanceNotify.composeMaintenanceEmail({
          maintenanceMessage: messageForEmail ?? null,
          maintenanceEmailSubject: updated.maintenanceEmailSubject ?? null,
          maintenanceEmailBody: updated.maintenanceEmailBody ?? null,
        });
        void this.maintenanceNotify.sendToAllAuthUsers(email).catch((e) =>
          this.logger.error(
            `Maintenance email blast failed: ${
              e instanceof Error ? e.message : String(e)
            }`,
          ),
        );
      }
    }

    return this.getStaffPayload();
  }

  /** Admin-only: send bulk maintenance email using saved config and optional body overrides. */
  async sendMaintenanceEmail(dto: SendMaintenanceEmailDto) {
    if (!this.maintenanceNotify.canSendBulkEmail()) {
      throw new BadRequestException(
        'Bulk email requires SMTP (SMTP_HOST, SMTP_FROM) and Supabase admin (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) on the API.',
      );
    }
    const row = await this.getRow();
    if (!row) throw new NotFoundException('site_config row missing');

    const merged = {
      maintenanceMessage:
        dto.maintenanceMessage !== undefined
          ? dto.maintenanceMessage
          : row.maintenanceMessage,
      maintenanceEmailSubject:
        dto.emailSubject !== undefined ? dto.emailSubject : row.maintenanceEmailSubject,
      maintenanceEmailBody:
        dto.emailBody !== undefined ? dto.emailBody : row.maintenanceEmailBody,
    };
    const email = this.maintenanceNotify.composeMaintenanceEmail(merged);
    await this.maintenanceNotify.sendToAllAuthUsers(email);
    return { ok: true as const };
  }
}
