import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { getDb } from '../db';
import {
  breederReviews,
  breeders,
  profiles,
  strains,
} from '../db/schema';
import { refreshBreederAggregates } from './catalog-aggregates';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';

export type ListBreedersQuery = {
  q?: string;
  sort?: 'name' | 'rating';
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
    }
    if (q) {
      const term = `%${q.replace(/%/g, '\\%')}%`;
      conditions.push(
        or(ilike(breeders.name, term), ilike(breeders.slug, term)),
      );
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
  ) {
    const db = getDb();
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
          createdAt: mine.createdAt,
          updatedAt: mine.updatedAt,
          hidden: mine.hiddenAt != null,
        };
      }
    }

    return {
      breeder: this.toPublicBreed(row),
      reviews: {
        items: reviewRows.map((r) => ({
          id: r.id,
          rating: String(r.rating),
          body: r.body,
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

  async upsertReview(slug: string, userId: string, rating: number, body: string) {
    if (rating < 1 || rating > 5)
      throw new BadRequestException('Rating must be between 1 and 5');
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
          updatedAt: new Date(),
        })
        .where(eq(breederReviews.id, existing.id));
    } else {
      await db.insert(breederReviews).values({
        breederId: b.id,
        authorId: userId,
        rating: String(rating),
        body: body ?? '',
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
      createdAt: out!.createdAt,
      updatedAt: out!.updatedAt,
    };
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
