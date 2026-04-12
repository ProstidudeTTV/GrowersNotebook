import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  notInArray,
  or,
} from 'drizzle-orm';
import { getDb } from '../db';
import {
  breederReviews,
  breeders,
  profiles,
  strainReviews,
  strains,
} from '../db/schema';
import type { CatalogReviewSubRatings, PostMediaItem } from '../db/schema';
import { normalizeCatalogSubRatings } from './catalog-sub-ratings.util';
import { refreshBreederAggregates } from './catalog-aggregates';
import {
  isPublicExcludedBreederSlug,
  PUBLIC_EXCLUDED_BREEDER_SLUGS,
} from './catalog-promo-exclusions';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';

export type ListBreedersQuery = {
  q?: string;
  sort?: 'name' | 'rating';
  /** Case-insensitive partial match on country. */
  country?: string;
  minRating?: number;
  minReviews?: number;
  page?: number;
  pageSize?: number;
  /** When false, include unpublished (admin). */
  publishedOnly?: boolean;
};

@Injectable()
export class BreedersService {
  constructor(private readonly nameBlocklist: NameBlocklistService) {}

  async listPublic(query: ListBreedersQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 24));
    const skip = (page - 1) * pageSize;
    const db = getDb();
    const q = query.q?.trim();

    const conditions = [];
    if (query.publishedOnly !== false) {
      conditions.push(eq(breeders.published, true));
      conditions.push(
        notInArray(breeders.slug, [...PUBLIC_EXCLUDED_BREEDER_SLUGS]),
      );
    }
    if (q) {
      const term = `%${q.replace(/%/g, '\\%')}%`;
      conditions.push(
        or(ilike(breeders.name, term), ilike(breeders.slug, term)),
      );
    }
    const countryQ = query.country?.trim();
    if (countryQ) {
      const term = `%${countryQ.replace(/%/g, '\\%')}%`;
      conditions.push(ilike(breeders.country, term));
    }
    const mr = query.minRating;
    if (mr != null && Number.isFinite(mr) && mr >= 1 && mr <= 5) {
      conditions.push(isNotNull(breeders.avgRating));
      conditions.push(gte(breeders.avgRating, String(mr)));
    }
    const mrev = query.minReviews;
    if (mrev != null && Number.isFinite(mrev) && mrev >= 1) {
      conditions.push(gte(breeders.reviewCount, Math.floor(mrev)));
    }
    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      query.sort === 'rating'
        ? [desc(breeders.avgRating), asc(breeders.name)]
        : [asc(breeders.name)];

    const [{ total }] = await db
      .select({ total: count() })
      .from(breeders)
      .where(whereClause);

    const rows = await db
      .select()
      .from(breeders)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(skip);

    return {
      items: rows.map((r) => this.toPublicBreed(r)),
      total: Number(total),
      page,
      pageSize,
    };
  }

  async getBySlugPublic(
    slug: string,
    viewerId?: string,
    reviewsPage = 1,
    reviewsPageSize = 20,
    strainReviewsPage = 1,
    strainReviewsPageSize = 10,
  ) {
    const db = getDb();
    if (isPublicExcludedBreederSlug(slug)) {
      throw new NotFoundException('Breeder not found');
    }
    const [row] = await db
      .select()
      .from(breeders)
      .where(eq(breeders.slug, slug));
    if (!row) throw new NotFoundException('Breeder not found');
    if (!row.published) throw new NotFoundException('Breeder not found');

    const skip = (Math.max(1, reviewsPage) - 1) * Math.min(50, reviewsPageSize);
    const take = Math.min(50, reviewsPageSize);

    const reviewWhere = and(
      eq(breederReviews.breederId, row.id),
      isNull(breederReviews.hiddenAt),
    );

    const [{ reviewTotal }] = await db
      .select({ reviewTotal: count() })
      .from(breederReviews)
      .where(reviewWhere);

    const reviewRows = await db
      .select({
        id: breederReviews.id,
        rating: breederReviews.rating,
        body: breederReviews.body,
        subRatings: breederReviews.subRatings,
        createdAt: breederReviews.createdAt,
        updatedAt: breederReviews.updatedAt,
        authorId: breederReviews.authorId,
        displayName: profiles.displayName,
      })
      .from(breederReviews)
      .innerJoin(profiles, eq(breederReviews.authorId, profiles.id))
      .where(reviewWhere)
      .orderBy(desc(breederReviews.createdAt))
      .limit(take)
      .offset(skip);

    let viewerReview: {
      id: string;
      rating: string;
      body: string;
      subRatings: CatalogReviewSubRatings;
      createdAt: Date;
      updatedAt: Date;
      hidden: boolean;
    } | null = null;
    if (viewerId) {
      const [mine] = await db
        .select()
        .from(breederReviews)
        .where(
          and(
            eq(breederReviews.breederId, row.id),
            eq(breederReviews.authorId, viewerId),
          ),
        );
      if (mine) {
        viewerReview = {
          id: mine.id,
          rating: String(mine.rating),
          body: mine.body,
          subRatings: (mine.subRatings ?? {}) as CatalogReviewSubRatings,
          createdAt: mine.createdAt,
          updatedAt: mine.updatedAt,
          hidden: mine.hiddenAt != null,
        };
      }
    }

    const srTake = Math.min(50, strainReviewsPageSize);
    const srSkip =
      (Math.max(1, strainReviewsPage) - 1) * srTake;

    const strainRevWhere = and(
      eq(strains.breederId, row.id),
      eq(strains.published, true),
      isNull(strainReviews.hiddenAt),
    );

    const [{ srTotal }] = await db
      .select({ srTotal: count() })
      .from(strainReviews)
      .innerJoin(strains, eq(strainReviews.strainId, strains.id))
      .where(strainRevWhere);

    const strainReviewRows = await db
      .select({
        id: strainReviews.id,
        rating: strainReviews.rating,
        body: strainReviews.body,
        subRatings: strainReviews.subRatings,
        media: strainReviews.media,
        createdAt: strainReviews.createdAt,
        authorId: strainReviews.authorId,
        displayName: profiles.displayName,
        strainSlug: strains.slug,
        strainName: strains.name,
      })
      .from(strainReviews)
      .innerJoin(strains, eq(strainReviews.strainId, strains.id))
      .innerJoin(profiles, eq(strainReviews.authorId, profiles.id))
      .where(strainRevWhere)
      .orderBy(desc(strainReviews.createdAt))
      .limit(srTake)
      .offset(srSkip);

    return {
      breeder: this.toPublicBreed(row),
      reviews: {
        items: reviewRows.map((r) => ({
          id: r.id,
          rating: String(r.rating),
          body: r.body,
          subRatings: (r.subRatings ?? {}) as CatalogReviewSubRatings,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          author: {
            id: r.authorId,
            displayName: r.displayName,
          },
        })),
        total: Number(reviewTotal),
        page: reviewsPage,
        pageSize: take,
      },
      /** Strain reviews for cultivars linked to this breeder (also on strain pages). */
      strainReviewsOnCatalog: {
        items: strainReviewRows.map((r) => ({
          id: r.id,
          rating: String(r.rating),
          body: r.body,
          subRatings: (r.subRatings ?? {}) as CatalogReviewSubRatings,
          media: (r.media ?? []) as PostMediaItem[],
          createdAt: r.createdAt,
          strain: { slug: r.strainSlug, name: r.strainName },
          author: {
            id: r.authorId,
            displayName: r.displayName,
          },
        })),
        total: Number(srTotal),
        page: strainReviewsPage,
        pageSize: srTake,
      },
      viewerReview,
    };
  }

  async upsertReview(
    slug: string,
    userId: string,
    rating: number,
    body: string,
    subRatingsRaw?: unknown,
  ) {
    if (rating < 1 || rating > 5)
      throw new BadRequestException('Rating must be between 1 and 5');
    const subRatings = normalizeCatalogSubRatings(subRatingsRaw);
    const db = getDb();
    const [b] = await db
      .select()
      .from(breeders)
      .where(eq(breeders.slug, slug));
    if (!b) throw new NotFoundException('Breeder not found');
    if (!b.published) throw new NotFoundException('Breeder not found');

    const [existing] = await db
      .select()
      .from(breederReviews)
      .where(
        and(
          eq(breederReviews.breederId, b.id),
          eq(breederReviews.authorId, userId),
        ),
      );

    if (existing?.hiddenAt) {
      throw new BadRequestException(
        'Your review was removed by moderators and cannot be updated.',
      );
    }

    if (existing) {
      await db
        .update(breederReviews)
        .set({
          rating: String(rating),
          body: body ?? '',
          subRatings,
          updatedAt: new Date(),
        })
        .where(eq(breederReviews.id, existing.id));
    } else {
      await db.insert(breederReviews).values({
        breederId: b.id,
        authorId: userId,
        rating: String(rating),
        body: body ?? '',
        subRatings,
      });
    }
    await refreshBreederAggregates(db, b.id);
    const [out] = await db
      .select()
      .from(breederReviews)
      .where(
        and(
          eq(breederReviews.breederId, b.id),
          eq(breederReviews.authorId, userId),
        ),
      );
    return {
      id: out!.id,
      rating: String(out!.rating),
      body: out!.body,
      subRatings: (out!.subRatings ?? {}) as CatalogReviewSubRatings,
      createdAt: out!.createdAt,
      updatedAt: out!.updatedAt,
    };
  }

  async deleteOwnReview(slug: string, userId: string) {
    const db = getDb();
    const [b] = await db
      .select()
      .from(breeders)
      .where(eq(breeders.slug, slug));
    if (!b) throw new NotFoundException('Breeder not found');
    if (!b.published) throw new NotFoundException('Breeder not found');

    const [existing] = await db
      .select()
      .from(breederReviews)
      .where(
        and(
          eq(breederReviews.breederId, b.id),
          eq(breederReviews.authorId, userId),
        ),
      );
    if (!existing) throw new NotFoundException('Review not found');
    await db.delete(breederReviews).where(eq(breederReviews.id, existing.id));
    await refreshBreederAggregates(db, b.id);
    return { ok: true as const };
  }

  async findById(id: string) {
    const db = getDb();
    const [row] = await db.select().from(breeders).where(eq(breeders.id, id));
    return row ?? null;
  }

  async findBySlug(slug: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(breeders)
      .where(eq(breeders.slug, slug));
    return row ?? null;
  }

  async listPaged(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(breeders);
    const rows = await db
      .select()
      .from(breeders)
      .orderBy(asc(breeders.name))
      .limit(take)
      .offset(skip);
    return { rows, total: Number(total) };
  }

  async createAdmin(values: {
    slug: string;
    name: string;
    description?: string | null;
    website?: string | null;
    country?: string | null;
    published?: boolean;
  }) {
    await this.nameBlocklist.assertAllowed(values.name);
    const db = getDb();
    try {
      const [row] = await db
        .insert(breeders)
        .values({
          slug: values.slug,
          name: values.name,
          description: values.description ?? null,
          website: values.website ?? null,
          country: values.country ?? null,
          published: values.published ?? true,
        })
        .returning();
      return row;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505')
        throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async updateAdmin(
    id: string,
    body: Partial<{
      slug: string;
      name: string;
      description: string | null;
      website: string | null;
      country: string | null;
      published: boolean;
    }>,
  ) {
    if (body.name) await this.nameBlocklist.assertAllowed(body.name);
    const db = getDb();
    try {
      const [row] = await db
        .update(breeders)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(breeders.id, id))
        .returning();
      if (!row) throw new NotFoundException();
      return row;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505')
        throw new ConflictException('Slug already exists');
      throw e;
    }
  }

  async deleteAdmin(id: string) {
    const db = getDb();
    const [s] = await db
      .select({ n: count() })
      .from(strains)
      .where(eq(strains.breederId, id));
    if (Number(s?.n) > 0) {
      throw new BadRequestException(
        'Cannot delete breeder that still has strains; reassign or delete strains first.',
      );
    }
    await db.delete(breeders).where(eq(breeders.id, id));
  }

  toPublicBreed(row: typeof breeders.$inferSelect) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      website: row.website,
      country: row.country,
      published: row.published,
      reviewCount: row.reviewCount,
      avgRating: row.avgRating != null ? String(row.avgRating) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
