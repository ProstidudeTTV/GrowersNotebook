import {
  BadRequestException,
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { InferInsertModel } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import type { DbClient } from '../db';
import { getDb } from '../db';
import { breeders, strains } from '../db/schema';
import { isNonStrainPromoCatalogRow } from './catalog-promo-exclusions';

function normalizeHeaderKey(k: string): string {
  return k
    .replace(/^\ufeff/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Trim BOM/spaces from headers; lower-case snake_case (handles Excel headers). */
export function normalizeCsvRecords(
  records: Record<string, string>[],
): Record<string, string>[] {
  return records.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeHeaderKey(k)] = v ?? '';
    }
    return out;
  });
}

/**
 * Maps CannaBot / Leafly-style CSV columns (e.g. Strain, Effects, Medical) onto the
 * field names expected by {@link importStrainCsvRecords}. Safe to run on already-GN-shaped rows.
 */
export function mapLeaflyAliasesToGnColumns(
  row: Record<string, string>,
): Record<string, string> {
  const out = { ...row };
  const strainName = (
    out.strain_name ||
    out.strain ||
    out.name ||
    ''
  ).trim();
  if (strainName) out.strain_name = strainName;

  if (!(out.effect || '').trim() && (out.effects || '').trim()) {
    out.effect = out.effects;
  }
  if (!(out.medical_strains || '').trim() && (out.medical || '').trim()) {
    out.medical_strains = out.medical;
  }
  if (!(out.medical_strains || '').trim() && (out.medical_uses || '').trim()) {
    out.medical_strains = out.medical_uses;
  }
  if (!(out.flavor || '').trim() && (out.flavors || '').trim()) {
    out.flavor = out.flavors;
  }
  if (!(out.thc || '').trim() && (out.thc_level || '').trim()) {
    out.thc = out.thc_level;
  }
  if (!(out.thc || '').trim() && (out.thc_high || '').trim()) {
    out.thc = out.thc_high;
  }
  if (!(out.cbd || '').trim() && (out.cbd_high || '').trim()) {
    out.cbd = out.cbd_high;
  }
  const typ = (out.type || '').trim();
  if (typ) {
    if (!(out.strain_type_summary || '').trim()) out.strain_type_summary = typ;
    if (!(out.indica_sativa || '').trim()) out.indica_sativa = typ;
  }
  return out;
}

/** Normalized headers + Leafly/CannaBot column aliases. Use before catalog import. */
export function normalizeStrainCatalogRows(
  records: Record<string, string>[],
): Record<string, string>[] {
  return normalizeCsvRecords(records).map(mapLeaflyAliasesToGnColumns);
}

export type StrainCsvImportResult = {
  rowsParsed: number;
  rowsSkippedNoStrainName: number;
  rowsSkippedNonStrainPromo: number;
  rowsSkippedDuplicateStrainBreeder: number;
  uniqueBreedersInCsv: number;
  strainCandidates: number;
  breedersInserted: number;
  strainsInserted: number;
};

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
  if (
    descCol &&
    overview &&
    overview !== descCol &&
    !descCol.includes(overview.slice(0, 40))
  ) {
    return truncate(`${descCol}\n\n${overview}`, 8000);
  }
  return truncate(descCol || overview || 'Strain reference entry.', 8000);
}

const LEAFLY_EFFECT_PCT_KEYS = [
  ['relaxed', 'Relaxed'],
  ['happy', 'Happy'],
  ['euphoric', 'Euphoric'],
  ['uplifted', 'Uplifted'],
  ['creative', 'Creative'],
  ['focused', 'Focused'],
  ['energetic', 'Energetic'],
  ['talkative', 'Talkative'],
  ['hungry', 'Hungry'],
  ['sleepy', 'Sleepy'],
] as const;

function appendLeaflyEffectProfileLine(
  row: Record<string, string>,
  lines: string[],
): void {
  const parts: string[] = [];
  for (const [key, label] of LEAFLY_EFFECT_PCT_KEYS) {
    const t = row[key]?.trim();
    if (t && !/^n\/a|null|\[null\]$/i.test(t)) {
      parts.push(`${label} ${t}`);
    }
  }
  if (parts.length > 0) {
    lines.push(`Reported effects (Leafly-style): ${parts.join(', ')}`);
  }
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
  add('Rating', row.rating);
  add('Terpenes', row.terpenes);
  add('Dominant terpene', row.most_common_terpene);
  add('Image URL', row.img_url);
  appendLeaflyEffectProfileLine(row, lines);
  add('Strength', row.strength);
  add('Environment', row.environment);
  add('Climate', row.climate);
  add('Flowering', row.flowering_time || row.indoor_flowering_time);
  if (
    (row.outdoor_harvest_time || '').trim() ||
    (row.harvest_month || '').trim()
  ) {
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

/**
 * Core import used by the CLI script and admin upload (same rules as before).
 */
export async function importStrainCsvRecords(
  db: DbClient,
  records: Record<string, string>[],
): Promise<StrainCsvImportResult> {
  const normalized = normalizeStrainCatalogRows(records);
  let rowsSkippedNoStrainName = 0;
  let rowsSkippedNonStrainPromo = 0;
  let rowsSkippedDuplicateStrainBreeder = 0;

  const [{ total: bcBefore }] = await db
    .select({ total: count() })
    .from(breeders);
  const [{ total: scBefore }] = await db
    .select({ total: count() })
    .from(strains);

  const breederCanonical = new Map<string, string>();
  for (const row of normalized) {
    if (isNonStrainPromoCatalogRow(row)) continue;
    const name = (row.breeder || '').trim();
    if (!name) continue;
    const bslug = slugify(name);
    if (!breederCanonical.has(bslug)) breederCanonical.set(bslug, name);
  }

  const breederList = Array.from(breederCanonical.entries()).map(
    ([slug, name]) => ({
      slug,
      name,
      published: true,
    }),
  );

  for (let i = 0; i < breederList.length; i += 500) {
    const chunk = breederList.slice(i, i + 500);
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

  for (const row of normalized) {
    if (isNonStrainPromoCatalogRow(row)) {
      rowsSkippedNonStrainPromo += 1;
      continue;
    }
    const strainName = (row.strain_name || '').trim();
    if (!strainName) {
      rowsSkippedNoStrainName += 1;
      continue;
    }
    const breederName = (row.breeder || '').trim();
    const bslug = breederName ? slugify(breederName) : null;
    const dedupeKey = `${slugify(strainName)}|${bslug ?? ''}`;
    if (seenPair.has(dedupeKey)) {
      rowsSkippedDuplicateStrainBreeder += 1;
      continue;
    }
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

  for (let i = 0; i < strainValues.length; i += 400) {
    const chunk = strainValues.slice(i, i + 400);
    await db.insert(strains).values(chunk).onConflictDoNothing({
      target: strains.slug,
    });
  }

  const [{ total: bcAfter }] = await db
    .select({ total: count() })
    .from(breeders);
  const [{ total: scAfter }] = await db
    .select({ total: count() })
    .from(strains);

  return {
    rowsParsed: normalized.length,
    rowsSkippedNoStrainName,
    rowsSkippedNonStrainPromo,
    rowsSkippedDuplicateStrainBreeder,
    uniqueBreedersInCsv: breederCanonical.size,
    strainCandidates: strainValues.length,
    breedersInserted: Number(bcAfter) - Number(bcBefore),
    strainsInserted: Number(scAfter) - Number(scBefore),
  };
}

function parseCsvRaw(text: string): Record<string, string>[] {
  try {
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
  } catch (e) {
    throw new BadRequestException(
      `Invalid CSV: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

@Injectable()
export class StrainCsvImportService {
  private readonly log = new Logger(StrainCsvImportService.name);

  async importFromCsvText(text: string): Promise<StrainCsvImportResult> {
    if (!text || !text.trim()) {
      throw new BadRequestException('CSV file is empty.');
    }
    const records = parseCsvRaw(text);
    if (records.length === 0) {
      return {
        rowsParsed: 0,
        rowsSkippedNoStrainName: 0,
        rowsSkippedNonStrainPromo: 0,
        rowsSkippedDuplicateStrainBreeder: 0,
        uniqueBreedersInCsv: 0,
        strainCandidates: 0,
        breedersInserted: 0,
        strainsInserted: 0,
      };
    }
    const headerKeys = new Set(
      Object.keys(records[0]!).map((k) => normalizeHeaderKey(k)),
    );
    const hasStrainHeader =
      headerKeys.has('strain_name') ||
      headerKeys.has('strain') ||
      headerKeys.has('name');
    if (!hasStrainHeader) {
      const sample = Object.keys(records[0]!)
        .slice(0, 15)
        .join(', ');
      throw new BadRequestException(
        `CSV must include a strain column (strain_name, or Leafly Strain / name). Raw headers (first 15): ${sample}`,
      );
    }
    try {
      return await importStrainCsvRecords(getDb(), records);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`Strain CSV import failed: ${msg}`, e instanceof Error ? e.stack : undefined);
      const isProd = process.env.NODE_ENV === 'production';
      throw new InternalServerErrorException(
        isProd
          ? 'Import failed. Check API service logs on your host.'
          : `Import failed: ${msg.slice(0, 320)}`,
      );
    }
  }
}
