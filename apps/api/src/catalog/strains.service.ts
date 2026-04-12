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
  inArray,
  isNotNull,
  isNull,
  notInArray,
  or,
} from 'drizzle-orm';
import { getDb } from '../db';
import {
  breeders,
  type CatalogReviewSubRatings,
  type PostMediaItem,
  profiles,
  strainReviews,
  strains,
} from '../db/schema';
import { normalizeCatalogSubRatings } from './catalog-sub-ratings.util';
import { refreshStrainAggregates } from './catalog-aggregates';
import {
  isPublicExcludedBreederSlug,
  PUBLIC_EXCLUDED_BREEDER_SLUGS,
} from './catalog-promo-exclusions';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';

const MAX_STRAIN_REVIEW_MEDIA = 8;

function normalizeStrainReviewMedia(
  raw: { url: string; type: string }[] | undefined,
): PostMediaItem[] {
  if (!raw?.length) return [];
  const seen = new Set<string>();
  const out: PostMediaItem[] = [];
  for (const item of raw) {
    const url = item.url?.trim();
    if (!url || !/^https:\/\//i.test(url)) continue;
    if (item.type !== 'image') continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, type: 'image' });
    if (out.length >= MAX_STRAIN_REVIEW_MEDIA) break;
  }
  return out;
}

export type ListStrainsQuery = {
  q?: string;
  sort?: 'name' | 'rating';
  breederId?: string;
  /** Resolve published breeder by slug and filter strains to that breeder */
  breederSlug?: string;
  /** Minimum average rating (1–5); requires non-null avg_rating. */
  minRating?: number;
  /** Minimum review count (>= 1). */
  minReviews?: number;
  page?: number;
  pageSize?: number;
  publishedOnly?: boolean;
};

@Injectable()
export class StrainsService {
  constructor(private readonly nameBlocklist: NameBlocklistService) {}

  async listPublic(query: ListStrainsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 24));
    const skip = (page - 1) * pageSize;
    const db = getDb();
    const q = query.q?.trim();

    const conditions = [];
    if (query.publishedOnly !== false) {
      conditions.push(eq(strains.published, true));
      const promoBreederIds = db
        .select({ id: breeders.id })
        .from(breeders)
        .where(inArray(breeders.slug, [...PUBLIC_EXCLUDED_BREEDER_SLUGS]));
      conditions.push(
        or(isNull(strains.breederId), notInArray(strains.breederId, promoBreederIds)),
      );
    }
    let breederIdFilter = query.breederId;
    if (query.breederSlug?.trim()) {
      const [b] = await db
        .select({ id: breeders.id })
        .from(breeders)
        .where(eq(breeders.slug, query.breederSlug.trim()));
      if (b?.id) breederIdFilter = b.id;
      else {
        return { items: [], total: 0, page, pageSize };
      }
    }
    if (breederIdFilter) {
      conditions.push(eq(strains.breederId, breederIdFilter));
    }
    if (q) {
      const term = `%${q.replace(/%/g, '\\%')}%`;
      conditions.push(
        or(ilike(strains.name, term), ilike(strains.slug, term)),
      );
    }
    const mr = query.minRating;
    if (mr != null && Number.isFinite(mr) && mr >= 1 && mr <= 5) {
      conditions.push(isNotNull(strains.avgRating));
      conditions.push(gte(strains.avgRating, String(mr)));
    }
    const mrev = query.minReviews;
    if (mrev != null && Number.isFinite(mrev) && mrev >= 1) {
      conditions.push(gte(strains.reviewCount, Math.floor(mrev)));
    }
    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      query.sort === 'rating'
        ? [desc(strains.avgRating), asc(strains.name)]
        : [asc(strains.name)];

    const [{ total }] = await db
      .select({ total: count() })
      .from(strains)
      .where(whereClause);

    const rows = await db
      .select()
      .from(strains)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(skip);

    return {
      items: rows.map((r) => this.toPublicStrain(r)),
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
  ) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(strains)
      .where(eq(strains.slug, slug));
    if (!row) throw new NotFoundException('Strain not found');
    if (!row.published) throw new NotFoundException('Strain not found');

    let breeder: ReturnType<StrainsService['toPublicBreederEmbedded']> | null =
      null;
    if (row.breederId) {
      const [b] = await db
        .select({
          id: breeders.id,
          slug: breeders.slug,
          name: breeders.name,
        })
        .from(breeders)
        .where(eq(breeders.id, row.breederId));
      if (b?.slug && isPublicExcludedBreederSlug(b.slug)) {
        throw new NotFoundException('Strain not found');
      }
      if (b && b.slug) breeder = this.toPublicBreederEmbedded(b);
    }

    const skip = (Math.max(1, reviewsPage) - 1) * Math.min(50, reviewsPageSize);
    const take = Math.min(50, reviewsPageSize);

    const reviewWhere = and(
      eq(strainReviews.strainId, row.id),
      isNull(strainReviews.hiddenAt),
    );

    const [{ reviewTotal }] = await db
      .select({ reviewTotal: count() })
      .from(strainReviews)
      .where(reviewWhere);

    const reviewRows = await db
      .select({
        id: strainReviews.id,
        rating: strainReviews.rating,
        body: strainReviews.body,
        subRatings: strainReviews.subRatings,
        media: strainReviews.media,
        createdAt: strainReviews.createdAt,
        updatedAt: strainReviews.updatedAt,
        authorId: strainReviews.authorId,
        displayName: profiles.displayName,
      })
      .from(strainReviews)
      .innerJoin(profiles, eq(strainReviews.authorId, profiles.id))
      .where(reviewWhere)
      .orderBy(desc(strainReviews.createdAt))
      .limit(take)
      .offset(skip);

    let viewerReview: {
      id: string;
      rating: string;
      body: string;
      subRatings: CatalogReviewSubRatings;
      media: PostMediaItem[];
      createdAt: Date;
      updatedAt: Date;
      hidden: boolean;
    } | null = null;
    if (viewerId) {
      const [mine] = await db
        .select()
        .from(strainReviews)
        .where(
          and(
            eq(strainReviews.strainId, row.id),
            eq(strainReviews.authorId, viewerId),
          ),
        );
      if (mine) {
        viewerReview = {
          id: mine.id,
          rating: String(mine.rating),
          body: mine.body,
          subRatings: (mine.subRatings ?? {}) as CatalogReviewSubRatings,
          media: (mine.media ?? []) as PostMediaItem[],
          createdAt: mine.createdAt,
          updatedAt: mine.updatedAt,
          hidden: mine.hiddenAt != null,
        };
      }
    }

    return {
      strain: { ...this.toPublicStrain(row), breeder },
      reviews: {
        items: reviewRows.map((r) => ({
          id: r.id,
          rating: String(r.rating),
          body: r.body,
          subRatings: (r.subRatings ?? {}) as CatalogReviewSubRatings,
          media: (r.media ?? []) as PostMediaItem[],
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
      viewerReview,
    };
  }

  async upsertReview(
    slug: string,
    userId: string,
    rating: number,
    body: string,
    subRatingsRaw?: unknown,
    media?: { url: string; type: string }[],
  ) {
    if (rating < 1 || rating > 5)
      throw new BadRequestException('Rating must be between 1 and 5');
    const subRatings = normalizeCatalogSubRatings(subRatingsRaw);
    const mediaItems = normalizeStrainReviewMedia(media);
    const db = getDb();
    const [s] = await db.select().from(strains).where(eq(strains.slug, slug));
    if (!s) throw new NotFoundException('Strain not found');
    if (!s.published) throw new NotFoundException('Strain not found');

    const [existing] = await db
      .select()
      .from(strainReviews)
      .where(
        and(
          eq(strainReviews.strainId, s.id),
          eq(strainReviews.authorId, userId),
        ),
      );

    if (existing?.hiddenAt) {
      throw new BadRequestException(
        'Your review was removed by moderators and cannot be updated.',
      );
    }

    if (existing) {
      await db
        .update(strainReviews)
        .set({
          rating: String(rating),
          body: body ?? '',
          subRatings,
          media: mediaItems,
          updatedAt: new Date(),
        })
        .where(eq(strainReviews.id, existing.id));
    } else {
      await db.insert(strainReviews).values({
        strainId: s.id,
        authorId: userId,
        rating: String(rating),
        body: body ?? '',
        subRatings,
        media: mediaItems,
      });
    }
    await refreshStrainAggregates(db, s.id);
    const [out] = await db
      .select()
      .from(strainReviews)
      .where(
        and(
          eq(strainReviews.strainId, s.id),
          eq(strainReviews.authorId, userId),
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
    const [s] = await db.select().from(strains).where(eq(strains.slug, slug));
    if (!s) throw new NotFoundException('Strain not found');
    if (!s.published) throw new NotFoundException('Strain not found');

    const [existing] = await db
      .select()
      .from(strainReviews)
      .where(
        and(
          eq(strainReviews.strainId, s.id),
          eq(strainReviews.authorId, userId),
        ),
      );
    if (!existing) throw new NotFoundException('Review not found');
    await db.delete(strainReviews).where(eq(strainReviews.id, existing.id));
    await refreshStrainAggregates(db, s.id);
    return { ok: true as const };
  }

  async findById(id: string) {
    const db = getDb();
    const [row] = await db.select().from(strains).where(eq(strains.id, id));
    return row ?? null;
  }

  async findBySlug(slug: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(strains)
      .where(eq(strains.slug, slug));
    return row ?? null;
  }

  async listPaged(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(strains);
    const rows = await db
      .select()
      .from(strains)
      .orderBy(asc(strains.name))
      .limit(take)
      .offset(skip);
    return { rows, total: Number(total) };
  }

  async createAdmin(values: {
    slug: string;
    name: string;
    description?: string | null;
    breederId?: string | null;
    effects?: string[];
    effectsNotes?: string | null;
    published?: boolean;
  }) {
    await this.nameBlocklist.assertAllowed(values.name);
    const db = getDb();
    try {
      const [row] = await db
        .insert(strains)
        .values({
          slug: values.slug,
          name: values.name,
          description: values.description ?? null,
          breederId: values.breederId ?? null,
          effects: values.effects ?? [],
          effectsNotes: values.effectsNotes ?? null,
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
      breederId: string | null;
      effects: string[];
      effectsNotes: string | null;
      published: boolean;
    }>,
  ) {
    if (body.name) await this.nameBlocklist.assertAllowed(body.name);
    const db = getDb();
    try {
      const [row] = await db
        .update(strains)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(strains.id, id))
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
    await db.delete(strains).where(eq(strains.id, id));
  }

  toPublicStrain(row: typeof strains.$inferSelect) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      breederId: row.breederId,
      effects: (row.effects ?? []) as string[],
      effectsNotes: row.effectsNotes,
      published: row.published,
      reviewCount: row.reviewCount,
      avgRating: row.avgRating != null ? String(row.avgRating) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  toPublicBreederEmbedded(b: { id: string; slug: string; name: string }) {
    return { id: b.id, slug: b.slug, name: b.name };
  }
}
