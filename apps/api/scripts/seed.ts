/**
 * Loads drizzle/seed_data.sql against DATABASE_URL (Supabase pooler or direct).
 * Run from apps/api: pnpm db:seed
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { config } from 'dotenv';
import postgres = require('postgres');

config({ path: path.resolve(__dirname, '../.env') });

function databaseUrlOrExit(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is missing. Set it in apps/api/.env');
    process.exit(1);
  }
  return url;
}

async function main() {
  const databaseUrl = databaseUrlOrExit();
  const file = path.join(__dirname, '../drizzle/seed_data.sql');
  const sqlText = await readFile(file, 'utf8');
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql.unsafe(sqlText);
    console.log('Seed applied:', file);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
