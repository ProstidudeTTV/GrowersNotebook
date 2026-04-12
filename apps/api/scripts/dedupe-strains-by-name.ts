/**
 * Merges duplicate catalog strains that share the same trimmed, lower-cased name.
 * Keeps one row per name (highest review_count, then avg_rating, then oldest created_at).
 * Repoints notebooks, migrates strain_reviews without breaking (strain_id, author_id) uniqueness, deletes losers.
 *
 *   pnpm --filter @growers/api exec ts-node -r tsconfig-paths/register scripts/dedupe-strains-by-name.ts
 *   pnpm --filter @growers/api exec ts-node -r tsconfig-paths/register scripts/dedupe-strains-by-name.ts --dry-run
 */
import * as path from 'node:path';
import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import { notebooks, strainReviews, strains } from '../src/db/schema';

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

type StrainRow = typeof strains.$inferSelect;

function normName(name: string): string {
  return name.trim().toLowerCase();
}

function ratingNum(r: string | null): number {
  if (r == null) return -1;
  const n = Number.parseFloat(String(r));
  return Number.isFinite(n) ? n : -1;
}

function pickKeeper(rows: StrainRow[]): StrainRow {
  const sorted = [...rows].sort((a, b) => {
    if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
    const br = ratingNum(b.avgRating as string | null);
    const ar = ratingNum(a.avgRating as string | null);
    if (br !== ar) return br - ar;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted[0]!;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const url = databaseUrlOrExit();
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 60,
    ...(isSupabaseOrManagedHost(url) ? { ssl: 'require' as const } : {}),
  });
  const db = drizzle(client, { schema });

  const all = await db.select().from(strains);
  const byName = new Map<string, StrainRow[]>();
  for (const s of all) {
    const k = normName(s.name);
    if (!k) continue;
    const list = byName.get(k) ?? [];
    list.push(s);
    byName.set(k, list);
  }

  let groups = 0;
  let losersTotal = 0;

  for (const [nameKey, group] of byName) {
    if (group.length < 2) continue;
    groups += 1;
    const keeper = pickKeeper(group);
    const losers = group.filter((r) => r.id !== keeper.id);
    losersTotal += losers.length;

    if (dryRun) {
      console.log(
        `[dry-run] "${nameKey}" keep ${keeper.slug} (${keeper.id}), merge ${losers.length} rows`,
      );
      continue;
    }

    await db.transaction(async (tx) => {
      let k = keeper;
      for (const loser of losers) {
        await tx
          .update(notebooks)
          .set({ strainId: k.id })
          .where(eq(notebooks.strainId, loser.id));

        if (!k.breederId && loser.breederId) {
          const [updated] = await tx
            .update(strains)
            .set({
              breederId: loser.breederId,
              updatedAt: new Date(),
            })
            .where(eq(strains.id, k.id))
            .returning();
          if (updated) k = updated;
        }

        const loserReviews = await tx
          .select()
          .from(strainReviews)
          .where(eq(strainReviews.strainId, loser.id));

        for (const rev of loserReviews) {
          const [collision] = await tx
            .select()
            .from(strainReviews)
            .where(
              and(
                eq(strainReviews.strainId, k.id),
                eq(strainReviews.authorId, rev.authorId),
              ),
            );

          if (!collision) {
            await tx
              .update(strainReviews)
              .set({ strainId: k.id, updatedAt: new Date() })
              .where(eq(strainReviews.id, rev.id));
          } else {
            const rLoser = ratingNum(rev.rating as string);
            const rKeep = ratingNum(collision.rating as string);
            if (rLoser > rKeep) {
              await tx
                .delete(strainReviews)
                .where(eq(strainReviews.id, collision.id));
              await tx
                .update(strainReviews)
                .set({ strainId: k.id, updatedAt: new Date() })
                .where(eq(strainReviews.id, rev.id));
            } else {
              await tx
                .delete(strainReviews)
                .where(eq(strainReviews.id, rev.id));
            }
          }
        }

        await tx.delete(strains).where(eq(strains.id, loser.id));
      }
    });
  }

  console.log(
    JSON.stringify(
      { duplicateNameGroups: groups, strainsRemoved: dryRun ? null : losersTotal, dryRun },
      null,
      2,
    ),
  );
  await client.end({ timeout: 15 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
