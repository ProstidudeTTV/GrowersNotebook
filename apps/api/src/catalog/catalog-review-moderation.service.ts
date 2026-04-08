import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '../db';
import { breederReviews, breeders, profiles, strainReviews, strains } from '../db/schema';
import { refreshBreederAggregates, refreshStrainAggregates } from './catalog-aggregates';

@Injectable()
export class CatalogReviewModerationService {
  async listStrainReviewsPaged(
    skip: number,
    take: number,
    filters?: { hiddenOnly?: boolean; strainId?: string },
  ) {
    const db = getDb();
    const conditions = [];
    if (filters?.strainId) {
      conditions.push(eq(strainReviews.strainId, filters.strainId));
    }
    if (filters?.hiddenOnly) {
      conditions.push(isNotNull(strainReviews.hiddenAt));
    }
    const where =
      conditions.length > 0 ? and(...conditions) : undefined;

    const listQuery = db
      .select({
        id: strainReviews.id,
        strainId: strainReviews.strainId,
        authorId: strainReviews.authorId,
        rating: strainReviews.rating,
        body: strainReviews.body,
        hiddenAt: strainReviews.hiddenAt,
        hiddenReason: strainReviews.hiddenReason,
        createdAt: strainReviews.createdAt,
        strainSlug: strains.slug,
        strainName: strains.name,
        authorName: profiles.displayName,
      })
      .from(strainReviews)
      .innerJoin(strains, eq(strainReviews.strainId, strains.id))
      .innerJoin(profiles, eq(strainReviews.authorId, profiles.id))
      .orderBy(desc(strainReviews.createdAt))
      .limit(take)
      .offset(skip);

    if (where !== undefined) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(strainReviews)
        .where(where);
      const rows = await listQuery.where(where);
      return { rows, total: Number(total) };
    }
    const [{ total }] = await db
      .select({ total: count() })
      .from(strainReviews);
    const rows = await listQuery;

    return { rows, total: Number(total) };
  }

  async listBreederReviewsPaged(
    skip: number,
    take: number,
    filters?: { hiddenOnly?: boolean; breederId?: string },
  ) {
    const db = getDb();
    const conditions = [];
    if (filters?.breederId) {
      conditions.push(eq(breederReviews.breederId, filters.breederId));
    }
    if (filters?.hiddenOnly) {
      conditions.push(isNotNull(breederReviews.hiddenAt));
    }
    const where =
      conditions.length > 0 ? and(...conditions) : undefined;

    const listQuery = db
      .select({
        id: breederReviews.id,
        breederId: breederReviews.breederId,
        authorId: breederReviews.authorId,
        rating: breederReviews.rating,
        body: breederReviews.body,
        hiddenAt: breederReviews.hiddenAt,
        hiddenReason: breederReviews.hiddenReason,
        createdAt: breederReviews.createdAt,
        breederSlug: breeders.slug,
        breederName: breeders.name,
        authorName: profiles.displayName,
      })
      .from(breederReviews)
      .innerJoin(breeders, eq(breederReviews.breederId, breeders.id))
      .innerJoin(profiles, eq(breederReviews.authorId, profiles.id))
      .orderBy(desc(breederReviews.createdAt))
      .limit(take)
      .offset(skip);

    if (where !== undefined) {
      const [{ total }] = await db
        .select({ total: count() })
        .from(breederReviews)
        .where(where);
      const rows = await listQuery.where(where);
      return { rows, total: Number(total) };
    }
    const [{ total }] = await db
      .select({ total: count() })
      .from(breederReviews);
    const rows = await listQuery;

    return { rows, total: Number(total) };
  }

  async hideStrainReview(
    reviewId: string,
    moderatorId: string,
    reason?: string | null,
  ) {
    const db = getDb();
    const [r] = await db
      .select()
      .from(strainReviews)
      .where(eq(strainReviews.id, reviewId));
    if (!r) throw new NotFoundException();
    await db
      .update(strainReviews)
      .set({
        hiddenAt: new Date(),
        hiddenBy: moderatorId,
        hiddenReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(strainReviews.id, reviewId));
    await refreshStrainAggregates(db, r.strainId);
    return { ok: true };
  }

  async restoreStrainReview(reviewId: string) {
    const db = getDb();
    const [r] = await db
      .select()
      .from(strainReviews)
      .where(eq(strainReviews.id, reviewId));
    if (!r) throw new NotFoundException();
    await db
      .update(strainReviews)
      .set({
        hiddenAt: null,
        hiddenBy: null,
        hiddenReason: null,
        updatedAt: new Date(),
      })
      .where(eq(strainReviews.id, reviewId));
    await refreshStrainAggregates(db, r.strainId);
    return { ok: true };
  }

  async hideBreederReview(
    reviewId: string,
    moderatorId: string,
    reason?: string | null,
  ) {
    const db = getDb();
    const [r] = await db
      .select()
      .from(breederReviews)
      .where(eq(breederReviews.id, reviewId));
    if (!r) throw new NotFoundException();
    await db
      .update(breederReviews)
      .set({
        hiddenAt: new Date(),
        hiddenBy: moderatorId,
        hiddenReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(breederReviews.id, reviewId));
    await refreshBreederAggregates(db, r.breederId);
    return { ok: true };
  }

  async restoreBreederReview(reviewId: string) {
    const db = getDb();
    const [r] = await db
      .select()
      .from(breederReviews)
      .where(eq(breederReviews.id, reviewId));
    if (!r) throw new NotFoundException();
    await db
      .update(breederReviews)
      .set({
        hiddenAt: null,
        hiddenBy: null,
        hiddenReason: null,
        updatedAt: new Date(),
      })
      .where(eq(breederReviews.id, reviewId));
    await refreshBreederAggregates(db, r.breederId);
    return { ok: true };
  }
}
