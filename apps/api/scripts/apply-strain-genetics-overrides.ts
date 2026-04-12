/**
 * 1) Strips the erroneous default CSV genetics line "Genetics: Northern Lights x Haze" (bulk SQL).
 * 2) Applies per-slug genetics from scripts/data/strain-genetics-overrides.json.
 *
 *   pnpm --filter @growers/api exec ts-node -r tsconfig-paths/register scripts/apply-strain-genetics-overrides.ts
 *   pnpm --filter @growers/api exec ts-node -r tsconfig-paths/register scripts/apply-strain-genetics-overrides.ts --dry-run
 *   pnpm --filter @growers/api exec ts-node -r tsconfig-paths/register scripts/apply-strain-genetics-overrides.ts --no-strip-nl-haze
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { strains } from '../src/db/schema';

config({ path: path.resolve(__dirname, '../.env') });

const OVERRIDES_PATH = path.join(
  __dirname,
  'data',
  'strain-genetics-overrides.json',
);

type OverridesFile = Record<string, { genetics: string; source?: string }>;

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

/** Remove first Genetics: line (multiline). */
function stripGeneticsLine(text: string): string {
  return text.replace(/^Genetics:\s[^\n\r]*/m, '').replace(/^\s*\n/, '').trim();
}

function applyGeneticsLine(notes: string | null, genetics: string): string {
  const rest = stripGeneticsLine(notes ?? '');
  const g = `Genetics: ${genetics}`;
  return rest ? `${g}\n${rest}` : g;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const stripNl = !process.argv.includes('--no-strip-nl-haze');

  let overrides: OverridesFile = {};
  try {
    const raw = readFileSync(OVERRIDES_PATH, 'utf8');
    overrides = JSON.parse(raw) as OverridesFile;
  } catch (e) {
    console.error(`Could not read ${OVERRIDES_PATH}`, e);
    process.exit(1);
  }

  const url = databaseUrlOrExit();
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 120,
    ...(isSupabaseOrManagedHost(url) ? { ssl: 'require' as const } : {}),
  });
  const db = drizzle(client, { schema });

  let strippedCount = 0;

  if (stripNl) {
    const [{ n }] = await client<{ n: string }[]>`
      SELECT count(*)::text AS n FROM public.strains
      WHERE effects_notes LIKE ${'%Genetics: Northern Lights x Haze%'}
    `;
    strippedCount = Number.parseInt(n, 10) || 0;
    if (dryRun) {
      console.log(
        JSON.stringify({ dryRun: true, wouldStripNlHazeRows: strippedCount }, null, 2),
      );
    } else {
      await client.unsafe(`
        UPDATE public.strains
        SET
          effects_notes = NULLIF(
            trim(both from regexp_replace(
              coalesce(effects_notes, ''),
              'Genetics: Northern Lights x Haze\\s*\\n?',
              '',
              'g'
            )),
            ''
          ),
          updated_at = now()
        WHERE effects_notes LIKE '%Genetics: Northern Lights x Haze%'
      `);
      console.log(JSON.stringify({ stripNlHazeRowsUpdated: strippedCount }, null, 2));
    }
  }

  let overridesApplied = 0;
  const slugList = Object.keys(overrides).filter((k) => overrides[k]?.genetics?.trim());

  for (const slug of slugList) {
    const gen = overrides[slug]!.genetics.trim();
    const [row] = await db
      .select({
        id: strains.id,
        effectsNotes: strains.effectsNotes,
      })
      .from(strains)
      .where(eq(strains.slug, slug));
    if (!row) {
      console.warn(`Override for unknown slug skipped: ${slug}`);
      continue;
    }
    const next = applyGeneticsLine(row.effectsNotes, gen);
    if ((row.effectsNotes ?? '') === next) continue;
    if (dryRun) {
      console.log(
        `[dry-run] override ${slug}: -> ${next.slice(0, 160)}${next.length > 160 ? '…' : ''}`,
      );
      overridesApplied += 1;
      continue;
    }
    await db
      .update(strains)
      .set({ effectsNotes: next, updatedAt: new Date() })
      .where(eq(strains.id, row.id));
    overridesApplied += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        stripNlHaze: stripNl,
        overridesApplied,
      },
      null,
      2,
    ),
  );
  await client.end({ timeout: 20 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
