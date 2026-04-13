import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * Server-side SMTP only — credentials from env, never sent to clients.
 * Prefer TLS on port 587; set SMTP_SECURE=true only for port 465.
 */
@Injectable()
export class SmtpMailService {
  private readonly logger = new Logger(SmtpMailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    return Boolean(host && from);
  }

  private transport(): nodemailer.Transporter | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) return null;
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587') || 587;
    const secure =
      String(this.config.get<string>('SMTP_SECURE') ?? '')
        .trim()
        .toLowerCase() === 'true' || port === 465;
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();

    const opts: SMTPTransport.Options = {
      host,
      port,
      secure,
    };
    if (user && pass) {
      opts.auth = { user, pass };
    }

    return nodemailer.createTransport(opts);
  }

  /**
   * @returns true if send succeeded
   */
  async sendText(opts: {
    to: string;
    subject: string;
    text: string;
  }): Promise<boolean> {
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!from) {
      this.logger.warn('SMTP_FROM not set');
      return false;
    }
    const t = this.transport();
    if (!t) {
      this.logger.warn('SMTP_HOST not set');
      return false;
    }
    try {
      await t.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`SMTP send failed for ${opts.to}: ${msg}`);
      return false;
    }
  }
}
