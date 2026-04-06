/**
 * Imports strains + breeders from the cannabis-strains CSV (filtered columns only).
 *
 * Place the CSV at scripts/data/cannabis-strains-final.csv or pass a path:
 *   pnpm db:import-strains
 *   pnpm db:import-strains -- /path/to/file.csv
 *
 * Requires DATABASE_URL in apps/api/.env. Re-running skips rows whose slugs
 * already exist (onConflictDoNothing). To replace data, truncate strains/breeders first.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { config } from 'dotenv';
import type { InferInsertModel } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { breeders, strains } from '../src/db/schema';

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

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'entry';
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Tags from comma / pipe separated columns */
function collectTags(
  parts: Array<string | undefined>,
  maxTags: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    if (!raw?.trim()) continue;
    for (const t of raw.split(/[|,]/)) {
      const x = t.trim().replace(/\s+/g, ' ');
      if (x.length < 2 || x.length > 48) continue;
      const key = x.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(x);
      if (out.length >= maxTags) return out;
    }
  }
  return out;
}

function buildDescription(row: Record<string, string>): string {
  const descCol = (row.description || '').trim();
  const overview = (row.overview || '').trim();
  if (descCol && overview && overview !== descCol && !descCol.includes(overview.slice(0, 40))) {
    return truncate(`${descCol}\n\n${overview}`, 8000);
  }
  return truncate(descCol || overview || 'Strain reference entry.', 8000);
}

function buildEffectsNotes(row: Record<string, string>): string | null {
  const lines: string[] = [];
  const add = (label: string, v: string | undefined) => {
    const t = v?.trim();
    if (t) lines.push(`${label}: ${t}`);
  };
  add('Genetics', row.genetic_background);
  add('Type', row.strain_type_summary || row.indica_sativa);
  if ((row.type_ratio || '').trim()) add('Ratio', row.type_ratio);
  if ((row.thc || '').trim() || (row.cbd || '').trim())
    lines.push(`THC / CBD: ${row.thc ?? '—'} / ${row.cbd ?? '—'}`);
  add('Strength', row.strength);
  add('Environment', row.environment);
  add('Climate', row.climate);
  add('Flowering', row.flowering_time || row.indoor_flowering_time);
  if ((row.outdoor_harvest_time || '').trim() || (row.harvest_month || '').trim()) {
    lines.push(
      `Harvest: ${[row.outdoor_harvest_time, row.harvest_month].filter(Boolean).join(' · ')}`,
    );
  }
  add('Seed type', row.seed_type);
  add('Flowering type', row.flowering_period_type);
  if ((row.growth_and_harvest || '').trim()) {
    lines.push(`Grow: ${row.growth_and_harvest.trim()}`);
  }
  if ((row.experience || '').trim()) {
    lines.push(`Experience: ${row.experience.trim()}`);
  }
  if (lines.length === 0) return null;
  return truncate(lines.join('\n'), 8000);
}

function allocStrainSlug(
  strainName: string,
  breederSlug: string | null,
  used: Set<string>,
): string {
  const base = slugify(strainName);
  let candidate = base;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  if (breederSlug) {
    candidate = `${base}-${breederSlug}`;
    let i = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${breederSlug}-${i}`;
      i += 1;
    }
    used.add(candidate);
    return candidate;
  }
  let j = 2;
  candidate = `${base}-${j}`;
  while (used.has(candidate)) {
    j += 1;
    candidate = `${base}-${j}`;
  }
  used.add(candidate);
  return candidate;
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
  const csvPath = argvPath
    ? path.resolve(argvPath)
    : defaultCsv;

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

  const breederCanonical = new Map<string, string>();
  for (const row of records) {
    const name = (row.breeder || '').trim();
    if (!name) continue;
    const bslug = slugify(name);
    if (!breederCanonical.has(bslug)) breederCanonical.set(bslug, name);
  }

  const breederList = Array.from(breederCanonical.entries()).map(([slug, name]) => ({
    slug,
    name,
    published: true,
  }));
  console.log(`Upserting ${breederList.length} unique breeders…`);
  for (let i = 0; i < breederList.length; i += 200) {
    const chunk = breederList.slice(i, i + 200);
    await db.insert(breeders).values(chunk).onConflictDoNothing({
      target: breeders.slug,
    });
  }

  const breederRows = await db
    .select({ id: breeders.id, slug: breeders.slug })
    .from(breeders);
  const breederIdBySlug = new Map(breederRows.map((b) => [b.slug, b.id]));

  const existingStrains = await db
    .select({ slug: strains.slug })
    .from(strains);
  const usedSlugs = new Set(existingStrains.map((s) => s.slug));

  const seenPair = new Set<string>();
  const strainValues: InferInsertModel<typeof strains>[] = [];

  for (const row of records) {
    const strainName = (row.strain_name || '').trim();
    if (!strainName) continue;
    const breederName = (row.breeder || '').trim();
    const bslug = breederName ? slugify(breederName) : null;
    const dedupeKey = `${slugify(strainName)}|${bslug ?? ''}`;
    if (seenPair.has(dedupeKey)) continue;
    seenPair.add(dedupeKey);

    const breederId = bslug ? breederIdBySlug.get(bslug) ?? null : null;
    const strainSlug = allocStrainSlug(strainName, bslug, usedSlugs);
    const effects = collectTags(
      [row.effect, row.smell_taste, row.flavor, row.medical_strains],
      22,
    );
    const effectsNotes = buildEffectsNotes(row);
    strainValues.push({
      slug: strainSlug,
      name: truncate(strainName, 200),
      description: buildDescription(row),
      breederId,
      effects,
      effectsNotes: effectsNotes ?? null,
      published: true,
    });
  }

  console.log(`Inserting ${strainValues.length} strains (new slugs only)…`);
  for (let i = 0; i < strainValues.length; i += 100) {
    const chunk = strainValues.slice(i, i + 100);
    await db.insert(strains).values(chunk).onConflictDoNothing({
      target: strains.slug,
    });
  }

  console.log('Done.');
  await client.end({ timeout: 10 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
