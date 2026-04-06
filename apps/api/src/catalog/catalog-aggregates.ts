import { and, avg, count, eq, isNull } from 'drizzle-orm';
import type { DbClient } from '../db';
import { breederReviews, breeders, strainReviews, strains } from '../db/schema';

export async function refreshBreederAggregates(db: DbClient, breederId: string) {
  const [agg] = await db
    .select({
      c: count(),
      avg: avg(breederReviews.rating),
    })
    .from(breederReviews)
    .where(
      and(
        eq(breederReviews.breederId, breederId),
        isNull(breederReviews.hiddenAt),
      ),
    );
  const n = Number(agg?.c ?? 0);
  const avgVal = agg?.avg != null ? String(agg.avg) : null;
  await db
    .update(breeders)
    .set({
      reviewCount: n,
      avgRating: n > 0 && avgVal != null ? avgVal : null,
      updatedAt: new Date(),
    })
    .where(eq(breeders.id, breederId));
}

export async function refreshStrainAggregates(db: DbClient, strainId: string) {
  const [agg] = await db
    .select({
      c: count(),
      avg: avg(strainReviews.rating),
    })
    .from(strainReviews)
    .where(
      and(eq(strainReviews.strainId, strainId), isNull(strainReviews.hiddenAt)),
    );
  const n = Number(agg?.c ?? 0);
  const avgVal = agg?.avg != null ? String(agg.avg) : null;
  await db
    .update(strains)
    .set({
      reviewCount: n,
      avgRating: n > 0 && avgVal != null ? avgVal : null,
      updatedAt: new Date(),
    })
    .where(eq(strains.id, strainId));
}
