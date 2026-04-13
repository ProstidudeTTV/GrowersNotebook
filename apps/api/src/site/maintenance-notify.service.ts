import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { SmtpMailService } from '../email/smtp-mail.service';
import { getDb } from '../db';
import { siteConfig } from '../db/schema';

/** Optional bulk email when maintenance mode is turned on (SMTP + Supabase Admin API). */
@Injectable()
export class MaintenanceNotifyService {
  private readonly logger = new Logger(MaintenanceNotifyService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly smtp: SmtpMailService,
  ) {}

  /** True when SMTP env is set so a blast can run (secrets stay on the server). */
  isEmailConfigured(): boolean {
    return this.smtp.isConfigured();
  }

  private siteOrigin(): string {
    const raw = this.config.get<string>('WEB_ORIGIN')?.trim();
    const first = raw?.split(',')[0]?.trim();
    return first || 'https://growersnotebook.com';
  }

  private async *eachAuthUserEmail(
    supabaseUrl: string,
    serviceRoleKey: string,
  ): AsyncGenerator<string, void, unknown> {
    const base = supabaseUrl.replace(/\/+$/, '');
    let page = 1;
    const perPage = 200;
    for (;;) {
      const url = `${base}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Supabase admin list users failed (${res.status}): ${text.slice(0, 240)}`,
        );
      }
      const data = (await res.json()) as {
        users?: Array<{ email?: string | null }>;
      };
      const users = data.users ?? [];
      for (const u of users) {
        const e = u.email?.trim();
        if (e) yield e;
      }
      if (users.length < perPage) break;
      page += 1;
    }
  }

  private async setEmailOutreachFailure(failed: boolean): Promise<void> {
    const db = getDb();
    await db
      .update(siteConfig)
      .set({
        emailOutreachFailureAt: failed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(siteConfig.id, 1));
  }

  /**
   * Send one email per auth user. Fire-and-forget from site patch; errors are logged only.
   */
  async notifyAllUsers(maintenanceMessage: string | null): Promise<void> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    const serviceRoleKey = this.config
      .get<string>('SUPABASE_SERVICE_ROLE_KEY')
      ?.trim();
    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.warn(
        'Maintenance email skipped: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      );
      return;
    }
    if (!this.smtp.isConfigured()) {
      this.logger.warn(
        'Maintenance email skipped: configure SMTP (SMTP_HOST, SMTP_FROM, and optional SMTP_USER/SMTP_PASS)',
      );
      await this.setEmailOutreachFailure(true);
      return;
    }

    const site = this.siteOrigin();
    const msg = maintenanceMessage?.trim();
    const text = [
      'Growers Notebook is going into maintenance mode. You may see a maintenance page when visiting the site until we are done.',
      msg ? `\n\n${msg}` : '',
      `\n\n${site}`,
    ].join('');

    const subject = 'Growers Notebook — maintenance notice';

    const seen = new Set<string>();
    let sent = 0;
    let failed = 0;

    for await (const to of this.eachAuthUserEmail(
      supabaseUrl,
      serviceRoleKey,
    )) {
      if (seen.has(to)) continue;
      seen.add(to);
      const ok = await this.smtp.sendText({ to, subject, text });
      if (ok) {
        sent += 1;
      } else {
        failed += 1;
      }
      if ((sent + failed) % 25 === 0) {
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }

    await this.setEmailOutreachFailure(failed > 0);

    this.logger.log(
      `Maintenance email blast finished: ${sent} sent, ${failed} failed, ${seen.size} unique addresses`,
    );
  }
}
