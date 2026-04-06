import { Controller, Get } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { getDb } from './db';
import { communities, profileReports, profiles } from './db/schema';

function errMessage(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const c = (e as Error & { cause?: unknown }).cause;
  if (c instanceof Error) return `${e.message} | cause: ${c.message}`;
  if (c !== undefined && c !== null) return `${e.message} | cause: ${String(c)}`;
  return e.message;
}

@Controller()
export class AppController {
  /** Root route so GET / returns a hint instead of a bare 404. */
  @Get()
  root(): { name: string; docs: string; health: string } {
    return {
      name: 'Growers Notebook API',
      docs: 'Use /health, /communities, /posts, etc.',
      health: '/health',
    };
  }

  /**
   * `/health` only used to mean “DATABASE_URL is set”, so the API looked fine while
   * every real route failed. We ping Postgres and check that migrated tables exist.
   */
  @Get('health')
  async health(): Promise<{
    status: string;
    databaseConfigured: boolean;
    databaseReachable?: boolean;
    coreTablesPresent?: boolean;
    error?: string;
    /** Extra detail in development only */
    detail?: string;
  }> {
    const configured = Boolean(process.env.DATABASE_URL?.trim());
    if (!configured) {
      return {
        status: 'degraded',
        databaseConfigured: false,
        error:
          'DATABASE_URL is not set. Add it to apps/api/.env and restart the API.',
      };
    }

    const db = getDb();

    try {
      await db.execute(sql`select 1`);
    } catch (e) {
      const msg = errMessage(e);
      return {
        status: 'degraded',
        databaseConfigured: true,
        databaseReachable: false,
        error:
          'Cannot connect to Postgres. Check DATABASE_URL, network, and SSL (Supabase often needs the URL from the dashboard).',
        detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
      };
    }

    try {
      await db.select({ id: communities.id }).from(communities).limit(1);
      await db
        .select({ description: profiles.description })
        .from(profiles)
        .limit(1);
      await db.select({ id: profileReports.id }).from(profileReports).limit(1);
      return {
        status: 'ok',
        databaseConfigured: true,
        databaseReachable: true,
        coreTablesPresent: true,
      };
    } catch (e) {
      const msg = errMessage(e);
      return {
        status: 'degraded',
        databaseConfigured: true,
        databaseReachable: true,
        coreTablesPresent: false,
        error:
          'Database is reachable but application tables are missing. From the repo root run: npm run db:migrate (then npm run db:seed if you want demo data).',
        detail: process.env.NODE_ENV !== 'production' ? msg : undefined,
      };
    }
  }
}
