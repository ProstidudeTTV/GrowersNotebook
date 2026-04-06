import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { InferInsertModel } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import type { DbClient } from '../db';
import { getDb } from '../db';
import { breeders, strains } from '../db/schema';

export type StrainCsvImportResult = {
  rowsParsed: number;
  rowsSkippedNoStrainName: number;
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
  let rowsSkippedNoStrainName = 0;
  let rowsSkippedDuplicateStrainBreeder = 0;

  const [{ total: bcBefore }] = await db
    .select({ total: count() })
    .from(breeders);
  const [{ total: scBefore }] = await db
    .select({ total: count() })
    .from(strains);

  const breederCanonical = new Map<string, string>();
  for (const row of records) {
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

  for (let i = 0; i < strainValues.length; i += 100) {
    const chunk = strainValues.slice(i, i + 100);
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
    rowsParsed: records.length,
    rowsSkippedNoStrainName,
    rowsSkippedDuplicateStrainBreeder,
    uniqueBreedersInCsv: breederCanonical.size,
    strainCandidates: strainValues.length,
    breedersInserted: Number(bcAfter) - Number(bcBefore),
    strainsInserted: Number(scAfter) - Number(scBefore),
  };
}

function parseCsvText(text: string): Record<string, string>[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
}

@Injectable()
export class StrainCsvImportService {
  async importFromCsvText(text: string): Promise<StrainCsvImportResult> {
    const records = parseCsvText(text);
    if (records.length === 0) {
      return {
        rowsParsed: 0,
        rowsSkippedNoStrainName: 0,
        rowsSkippedDuplicateStrainBreeder: 0,
        uniqueBreedersInCsv: 0,
        strainCandidates: 0,
        breedersInserted: 0,
        strainsInserted: 0,
      };
    }
    const headerKeys = Object.keys(records[0]!);
    if (!headerKeys.some((k) => k.toLowerCase() === 'strain_name')) {
      throw new BadRequestException(
        'CSV must include a strain_name column (header row required).',
      );
    }
    return importStrainCsvRecords(getDb(), records);
  }
}
