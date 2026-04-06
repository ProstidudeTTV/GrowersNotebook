import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'path';

/** drizzle-kit spawns this file without going through Nest; load the same env files as the API. */
for (const rel of [
  resolve(__dirname, '..', '..', '.env'),
  resolve(__dirname, '..', '..', '.env.local'),
  resolve(__dirname, '.env'),
  resolve(__dirname, '.env.local'),
]) {
  config({ path: rel, override: true });
}

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    'drizzle.config: DATABASE_URL is missing after loading .env files. Set it in apps/api/.env.',
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  /** Match legacy journal on hosted DBs: default in drizzle-kit is schema `drizzle`, which re-runs 0000 and fails. */
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
