/**
 * Imports strains + breeders from the cannabis-strains CSV (filtered columns only).
 *
 * Place the CSV at scripts/data/cannabis-strains-final.csv or pass a path:
 *   pnpm db:import-strains
 *   pnpm db:import-strains -- /path/to/file.csv
 *
 * Admin alternative: upload the same CSV under Admin → Catalog CSV import.
 *
 * Requires DATABASE_URL in apps/api/.env. Re-running skips rows whose slugs
 * already exist (onConflictDoNothing). To replace data, truncate strains/breeders first.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { importStrainCsvRecords } from '../src/catalog/strain-csv-import.service';
import * as schema from '../src/db/schema';

config({ path: path.resolve(__dirname, '../.env') });

function databaseUrlOrExit(): string {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    console.error('DATABASE_URL is missing. Set it in apps/api/.env');
    process.exit(1);
  }
  return url.trim();
}

function isSupabaseOrManagedHost(connUrl: string): boolean {
  return /supabase\.co|pooler\.supabase\.com/i.test(connUrl);
}

async function main() {
  const argvPath = process.argv
    .slice(2)
    .find((a) => !a.startsWith('-'));
  const defaultCsv = path.join(
    __dirname,
    'data',
    'cannabis-strains-final.csv',
  );
  const csvPath = argvPath ? path.resolve(argvPath) : defaultCsv;

  let raw: string;
  try {
    raw = readFileSync(csvPath, 'utf8');
  } catch {
    console.error(`Could not read CSV: ${csvPath}`);
    console.error(
      'Copy cannabis-strains-final.csv into apps/api/scripts/data/ or pass the path as an argument.',
    );
    process.exit(1);
  }

  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  const url = databaseUrlOrExit();
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 60,
    ...(isSupabaseOrManagedHost(url) ? { ssl: 'require' as const } : {}),
  });
  const db = drizzle(client, { schema });

  const result = await importStrainCsvRecords(db, records);
  console.log(JSON.stringify(result, null, 2));
  await client.end({ timeout: 10 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
