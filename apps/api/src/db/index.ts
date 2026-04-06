import { ServiceUnavailableException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Options } from 'postgres';
import * as schema from './schema';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let cached:
  | { client: postgres.Sql; db: DbClient }
  | undefined;

/** Supabase / managed Postgres: postgres.js often needs explicit TLS; sslmode= in URL is not always enough. */
function isSupabaseOrManagedHost(connUrl: string): boolean {
  return /supabase\.co|pooler\.supabase\.com/i.test(connUrl);
}

export function getDb(): DbClient {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new ServiceUnavailableException(
      'DATABASE_URL is not set. Add it to apps/api/.env or a .env file at the repo root (see env.example). Restart the API after saving.',
    );
  }
  if (!cached) {
    const options: Options<Record<string, never>> = {
      max: 10,
      prepare: false,
      connect_timeout: 25,
      ...(isSupabaseOrManagedHost(url)
        ? { ssl: 'require' as const }
        : {}),
    };
    const client = postgres(url, options);
    const db = drizzle(client, { schema });
    cached = { client, db };
  }
  return cached.db;
}

export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.client.end({ timeout: 5 });
    cached = undefined;
  }
}

export { schema };
