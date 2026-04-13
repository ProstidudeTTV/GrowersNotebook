import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/** Optional bulk email when maintenance mode is turned on (Resend + Supabase Admin API). */
@Injectable()
export class MaintenanceNotifyService {
  private readonly logger = new Logger(MaintenanceNotifyService.name);

  constructor(private readonly config: ConfigService) {}

  /** True when env is set so a blast can run (no secrets exposed to clients). */
  isConfigured(): boolean {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from = this.config.get<string>('RESEND_FROM_EMAIL')?.trim();
    return Boolean(url && key && resendKey && from);
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

  /**
   * Send one email per auth user. Fire-and-forget from site patch; errors are logged only.
   */
  async notifyAllUsers(maintenanceMessage: string | null): Promise<void> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    const serviceRoleKey = this.config
      .get<string>('SUPABASE_SERVICE_ROLE_KEY')
      ?.trim();
    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    const from = this.config.get<string>('RESEND_FROM_EMAIL')?.trim();
    if (!supabaseUrl || !serviceRoleKey || !resendKey || !from) {
      this.logger.warn(
        'Maintenance email skipped: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL',
      );
      return;
    }

    const site = this.siteOrigin();
    const msg = maintenanceMessage?.trim();
    const text = [
      'Growers Notebook is going into maintenance mode. You may see a maintenance page when visiting the site until we are done.',
      msg ? `\n\n${msg}` : '',
      `\n\n${site}`,
    ].join('');

    const resend = new Resend(resendKey);
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
      try {
        const { error } = await resend.emails.send({
          from,
          to: [to],
          subject,
          text,
        });
        if (error) {
          failed += 1;
          this.logger.warn(`Resend failed for ${to}: ${error.message}`);
        } else {
          sent += 1;
        }
      } catch (e) {
        failed += 1;
        const m = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Resend error for ${to}: ${m}`);
      }
      if ((sent + failed) % 25 === 0) {
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }

    this.logger.log(
      `Maintenance email blast finished: ${sent} sent, ${failed} failed, ${seen.size} unique addresses`,
    );
  }
}
