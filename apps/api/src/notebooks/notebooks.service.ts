import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  max,
  or,
  sql,
} from 'drizzle-orm';
import { isAllowedPostMediaPublicUrl } from '../common/post-media-public-url';
import { getDb } from '../db';
import {
  notebookVotes,
  notebookWeekNutrients,
  notebookWeeks,
  notebooks,
  nutrientProducts,
  profiles,
  strains,
} from '../db/schema';
import type { CreateNotebookWeekDto, UpdateNotebookWeekDto } from './dto/create-week.dto';
import type { CreateNotebookDto, UpdateNotebookDto } from './dto/create-notebook.dto';
import type { WeekNutrientLineDto } from './dto/week-nutrient-line.dto';

const WEEK_IMAGE_MAX = 8;

const notebookUpVotesExpr = sql<number>`coalesce((select count(*)::int from ${notebookVotes} where ${notebookVotes.notebookId} = ${notebooks.id} and ${notebookVotes.value} = 1), 0)`;

const notebookDownVotesExpr = sql<number>`coalesce((select count(*)::int from ${notebookVotes} where ${notebookVotes.notebookId} = ${notebooks.id} and ${notebookVotes.value} = -1), 0)`;

const notebookScoreExpr = sql<number>`coalesce((select sum(${notebookVotes.value})::int from ${notebookVotes} where ${notebookVotes.notebookId} = ${notebooks.id}), 0)`;

function viewerNotebookVoteSelect(viewerId: string | undefined) {
  if (!viewerId) {
    return sql<number | null>`null`.as('viewerVote');
  }
  return sql<number | null>`(
    select ${notebookVotes.value}::int from ${notebookVotes}
    where ${notebookVotes.notebookId} = ${notebooks.id} and ${notebookVotes.userId} = ${viewerId}::uuid
    limit 1
  )`.as('viewerVote');
}

function harvestDerived(
  dry: string | null | undefined,
  watts: string | null | undefined,
  plants: number | null | undefined,
): { gPerWatt: string | null; gPerWattPerPlant: string | null } {
  const w = watts != null && watts !== '' ? Number(watts) : NaN;
  const g = dry != null && dry !== '' ? Number(dry) : NaN;
  const p = plants != null ? Number(plants) : NaN;
  let gPerWatt: string | null = null;
  let gPerWattPerPlant: string | null = null;
  if (Number.isFinite(w) && w > 0 && Number.isFinite(g) && g >= 0) {
    gPerWatt = (g / w).toFixed(6);
  }
  if (gPerWatt != null && Number.isFinite(p) && p > 0) {
    gPerWattPerPlant = (Number(gPerWatt) / p).toFixed(6);
  }
  return { gPerWatt, gPerWattPerPlant };
}

@Injectable()
export class NotebooksService {
  constructor(private readonly config: ConfigService) {}

  private normalizeWeekImages(urls: string[] | undefined): string[] {
    if (!urls?.length) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of urls) {
      const t = u.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= WEEK_IMAGE_MAX) break;
    }
    for (const u of out) {
      if (!isAllowedPostMediaPublicUrl(this.config, u)) {
        throw new BadRequestException('Invalid image URL.');
      }
    }
    return out;
  }

  private async assertNotebookGrowthTransition(
    notebookId: string,
    existing: typeof notebooks.$inferSelect,
    dto: UpdateNotebookDto,
  ) {
    const nextStage = dto.growthStage;
    if (nextStage === undefined || nextStage === existing.growthStage) return;

    const db = getDb();
    const rows = await db
      .select({ weekIndex: notebookWeeks.weekIndex })
      .from(notebookWeeks)
      .where(eq(notebookWeeks.notebookId, notebookId));
    const maxIdx = rows.length ? Math.max(...rows.map((r) => r.weekIndex)) : 0;

    if (nextStage === 'vegetation' && existing.growthStage === 'germination') {
      if (rows.length < 2) {
        throw new BadRequestException(
          'Add and save at least two germination weeks before starting vegetation.',
        );
      }
      if (dto.vegPhaseStartedAfterWeekIndex !== maxIdx) {
        throw new BadRequestException(
          'Start vegetation from the latest week — refresh and try again.',
        );
      }
    }

    if (nextStage === 'flower' && existing.growthStage === 'vegetation') {
      const boundary = existing.vegPhaseStartedAfterWeekIndex ?? 0;
      const vegWeeks = rows.filter((r) => r.weekIndex > boundary);
      if (vegWeeks.length < 2) {
        throw new BadRequestException(
          'Add at least two vegetation weeks before starting flower.',
        );
      }
      if (dto.flowerPhaseStartedAfterWeekIndex !== maxIdx) {
        throw new BadRequestException(
          'Start flowering from the latest week — refresh and try again.',
        );
      }
    }

    if (
      nextStage === 'harvest' &&
      existing.growthStage !== 'flower' &&
      existing.growthStage !== 'harvest'
    ) {
      throw new BadRequestException(
        'Harvest logging unlocks after the flowering stage.',
      );
    }
  }

  private async assertStrainExists(strainId: string | null | undefined) {
    if (!strainId) return;
    const db = getDb();
    const [s] = await db
      .select({ id: strains.id })
      .from(strains)
      .where(eq(strains.id, strainId));
    if (!s) throw new BadRequestException('Unknown strain.');
  }

  async assertNotebookReadableByOwnerSettings(
    ownerId: string,
    viewerId?: string,
  ) {
    if (viewerId === ownerId) return;
    const [p] = await getDb()
      .select({
        profilePublic: profiles.profilePublic,
        showNotebooksPublic: profiles.showNotebooksPublic,
      })
      .from(profiles)
      .where(eq(profiles.id, ownerId));
    if (!p || !p.profilePublic || !p.showNotebooksPublic) {
      throw new NotFoundException('Notebook not found');
    }
  }

  async listPublic(opts: {
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const db = getDb();
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize));
    const skip = (page - 1) * pageSize;

    const visibility = and(
      eq(profiles.profilePublic, true),
      eq(profiles.showNotebooksPublic, true),
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(notebooks)
      .innerJoin(profiles, eq(notebooks.ownerId, profiles.id))
      .where(visibility);

    const rows = await db
      .select({
        notebook: notebooks,
        owner: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        strainSlug: strains.slug,
        strainName: strains.name,
        score: notebookScoreExpr.as('score'),
        upvotes: notebookUpVotesExpr.as('upvotes'),
        downvotes: notebookDownVotesExpr.as('downvotes'),
        viewerVote: viewerNotebookVoteSelect(opts.viewerId),
      })
      .from(notebooks)
      .innerJoin(profiles, eq(notebooks.ownerId, profiles.id))
      .leftJoin(strains, eq(notebooks.strainId, strains.id))
      .where(visibility)
      .orderBy(desc(notebooks.updatedAt))
      .offset(skip)
      .limit(pageSize);

    return {
      items: rows.map((r) => this.mapListRow(r)),
      total: Number(total),
      page,
      pageSize,
    };
  }

  async listByOwner(opts: {
    ownerId: string;
    viewerId?: string;
    page: number;
    pageSize: number;
  }) {
    if (opts.viewerId !== opts.ownerId) {
      await this.assertNotebookReadableByOwnerSettings(
        opts.ownerId,
        opts.viewerId,
      );
    }

    const db = getDb();
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize));
    const skip = (page - 1) * pageSize;

    const [{ total }] = await db
      .select({ total: count() })
      .from(notebooks)
      .where(eq(notebooks.ownerId, opts.ownerId));

    const rows = await db
      .select({
        notebook: notebooks,
        owner: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        strainSlug: strains.slug,
        strainName: strains.name,
        score: notebookScoreExpr.as('score'),
        upvotes: notebookUpVotesExpr.as('upvotes'),
        downvotes: notebookDownVotesExpr.as('downvotes'),
        viewerVote: viewerNotebookVoteSelect(opts.viewerId),
      })
      .from(notebooks)
      .innerJoin(profiles, eq(notebooks.ownerId, profiles.id))
      .leftJoin(strains, eq(notebooks.strainId, strains.id))
      .where(eq(notebooks.ownerId, opts.ownerId))
      .orderBy(desc(notebooks.updatedAt))
      .offset(skip)
      .limit(pageSize);

    return {
      items: rows.map((r) => this.mapListRow(r)),
      total: Number(total),
      page,
      pageSize,
    };
  }

  private mapListRow(r: {
    notebook: typeof notebooks.$inferSelect;
    owner: { id: string; displayName: string | null; avatarUrl: string | null };
    strainSlug: string | null;
    strainName: string | null;
    score: number;
    upvotes: number;
    downvotes: number;
    viewerVote: number | null;
  }) {
    return {
      ...r.notebook,
      owner: r.owner,
      strain: r.strainSlug
        ? { slug: r.strainSlug, name: r.strainName }
        : null,
      score: Number(r.score),
      upvotes: Number(r.upvotes),
      downvotes: Number(r.downvotes),
      viewerVote: r.viewerVote,
    };
  }

  async getById(id: string, viewerId?: string) {
    const db = getDb();
    const [row] = await db
      .select({
        notebook: notebooks,
        owner: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        strainSlug: strains.slug,
        strainName: strains.name,
        score: notebookScoreExpr.as('score'),
        upvotes: notebookUpVotesExpr.as('upvotes'),
        downvotes: notebookDownVotesExpr.as('downvotes'),
        viewerVote: viewerNotebookVoteSelect(viewerId),
      })
      .from(notebooks)
      .innerJoin(profiles, eq(notebooks.ownerId, profiles.id))
      .leftJoin(strains, eq(notebooks.strainId, strains.id))
      .where(eq(notebooks.id, id));
    if (!row) throw new NotFoundException('Notebook not found');
    await this.assertNotebookReadableByOwnerSettings(
      row.notebook.ownerId,
      viewerId,
    );

    const weeks = await db
      .select()
      .from(notebookWeeks)
      .where(eq(notebookWeeks.notebookId, id))
      .orderBy(asc(notebookWeeks.weekIndex));

    const weekIds = weeks.map((w) => w.id);
    const nutrients =
      weekIds.length === 0
        ? []
        : await db
            .select({
              n: notebookWeekNutrients,
              productName: nutrientProducts.name,
              productBrand: nutrientProducts.brand,
            })
            .from(notebookWeekNutrients)
            .leftJoin(
              nutrientProducts,
              eq(notebookWeekNutrients.productId, nutrientProducts.id),
            )
            .where(inArray(notebookWeekNutrients.weekId, weekIds))
            .orderBy(
              asc(notebookWeekNutrients.weekId),
              asc(notebookWeekNutrients.sortOrder),
            );

    const nutrientsByWeek = new Map<
      string,
      {
        id: string;
        weekId: string;
        productId: string | null;
        productName: string | null;
        productBrand: string | null;
        customLabel: string | null;
        dosage: string | null;
        sortOrder: number;
      }[]
    >();
    for (const { n, productName, productBrand } of nutrients) {
      const list = nutrientsByWeek.get(n.weekId) ?? [];
      list.push({
        id: n.id,
        weekId: n.weekId,
        productId: n.productId,
        productName,
        productBrand,
        customLabel: n.customLabel,
        dosage: n.dosage,
        sortOrder: n.sortOrder,
      });
      nutrientsByWeek.set(n.weekId, list);
    }

    return {
      ...row.notebook,
      owner: row.owner,
      strain: row.strainSlug
        ? { slug: row.strainSlug, name: row.strainName }
        : null,
      score: Number(row.score),
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
      viewerVote: row.viewerVote,
      weeks: weeks.map((w) => ({
        ...w,
        imageUrls: Array.isArray(w.imageUrls)
          ? (w.imageUrls as string[])
          : [],
        nutrients: nutrientsByWeek.get(w.id) ?? [],
      })),
    };
  }

  /** Staff: same as getById but skips owner privacy. */
  async getByIdAdmin(id: string) {
    const db = getDb();
    const [row] = await db
      .select({
        notebook: notebooks,
        owner: {
          id: profiles.id,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        },
        strainSlug: strains.slug,
        strainName: strains.name,
        score: notebookScoreExpr.as('score'),
        upvotes: notebookUpVotesExpr.as('upvotes'),
        downvotes: notebookDownVotesExpr.as('downvotes'),
        viewerVote: sql<number | null>`null`.as('viewerVote'),
      })
      .from(notebooks)
      .innerJoin(profiles, eq(notebooks.ownerId, profiles.id))
      .leftJoin(strains, eq(notebooks.strainId, strains.id))
      .where(eq(notebooks.id, id));
    if (!row) throw new NotFoundException('Notebook not found');

    const weeks = await db
      .select()
      .from(notebookWeeks)
      .where(eq(notebookWeeks.notebookId, id))
      .orderBy(asc(notebookWeeks.weekIndex));

    const weekIds = weeks.map((w) => w.id);
    const nutrients =
      weekIds.length === 0
        ? []
        : await db
            .select({
              n: notebookWeekNutrients,
              productName: nutrientProducts.name,
              productBrand: nutrientProducts.brand,
            })
            .from(notebookWeekNutrients)
            .leftJoin(
              nutrientProducts,
              eq(notebookWeekNutrients.productId, nutrientProducts.id),
            )
            .where(inArray(notebookWeekNutrients.weekId, weekIds))
            .orderBy(
              asc(notebookWeekNutrients.weekId),
              asc(notebookWeekNutrients.sortOrder),
            );

    const nutrientsByWeek = new Map<
      string,
      {
        id: string;
        weekId: string;
        productId: string | null;
        productName: string | null;
        productBrand: string | null;
        customLabel: string | null;
        dosage: string | null;
        sortOrder: number;
      }[]
    >();
    for (const { n, productName, productBrand } of nutrients) {
      const list = nutrientsByWeek.get(n.weekId) ?? [];
      list.push({
        id: n.id,
        weekId: n.weekId,
        productId: n.productId,
        productName,
        productBrand,
        customLabel: n.customLabel,
        dosage: n.dosage,
        sortOrder: n.sortOrder,
      });
      nutrientsByWeek.set(n.weekId, list);
    }

    return {
      ...row.notebook,
      owner: row.owner,
      strain: row.strainSlug
        ? { slug: row.strainSlug, name: row.strainName }
        : null,
      score: Number(row.score),
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
      viewerVote: null,
      weeks: weeks.map((w) => ({
        ...w,
        imageUrls: Array.isArray(w.imageUrls)
          ? (w.imageUrls as string[])
          : [],
        nutrients: nutrientsByWeek.get(w.id) ?? [],
      })),
    };
  }

  async listPagedAdmin(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(notebooks);
    const rows = await db
      .select({
        notebook: notebooks,
        ownerDisplay: profiles.displayName,
      })
      .from(notebooks)
      .innerJoin(profiles, eq(notebooks.ownerId, profiles.id))
      .orderBy(desc(notebooks.updatedAt))
      .offset(skip)
      .limit(take);
    return {
      rows: rows.map((r) => ({
        ...r.notebook,
        ownerDisplayName: r.ownerDisplay,
      })),
      total: Number(total),
    };
  }

  async create(ownerId: string, dto: CreateNotebookDto) {
    await this.assertStrainExists(dto.strainId ?? null);
    const db = getDb();
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Title is required.');
    }

    const [row] = await db
      .insert(notebooks)
      .values({
        ownerId,
        title,
        strainId: dto.strainId ?? null,
        customStrainLabel: dto.customStrainLabel?.trim() || null,
        status: dto.status ?? 'active',
      })
      .returning();

    await this.createWeek(row.id, ownerId, {
      weekIndex: 1,
      notes: null,
      imageUrls: [],
      copyNutrientsFromPreviousWeek: false,
      nutrients: [],
    }, false);

    return row;
  }

  async updateOwn(ownerId: string, id: string, dto: UpdateNotebookDto) {
    return this.patchNotebook(id, dto, ownerId, false);
  }

  async updateAdmin(id: string, dto: UpdateNotebookDto) {
    return this.patchNotebook(id, dto, null, true);
  }

  private async patchNotebook(
    id: string,
    dto: UpdateNotebookDto,
    ownerId: string | null,
    isAdmin: boolean,
  ) {
    const db = getDb();
    const [existing] = await db.select().from(notebooks).where(eq(notebooks.id, id));
    if (!existing) throw new NotFoundException('Notebook not found');
    if (!isAdmin && existing.ownerId !== ownerId) {
      throw new ForbiddenException();
    }

    if (dto.strainId !== undefined) {
      await this.assertStrainExists(dto.strainId);
    }

    const patch: Partial<typeof notebooks.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) {
      const t = dto.title.trim();
      if (!t) throw new BadRequestException('Title cannot be empty.');
      patch.title = t;
    }
    if (dto.strainId !== undefined) patch.strainId = dto.strainId;
    if (dto.customStrainLabel !== undefined) {
      patch.customStrainLabel = dto.customStrainLabel?.trim() || null;
    }
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.completedAt !== undefined) patch.completedAt = dto.completedAt;
    if (dto.plantCount !== undefined) patch.plantCount = dto.plantCount;
    if (dto.totalLightWatts !== undefined) {
      patch.totalLightWatts =
        dto.totalLightWatts == null || dto.totalLightWatts === ''
          ? null
          : dto.totalLightWatts;
    }
    if (dto.harvestDryWeightG !== undefined) {
      patch.harvestDryWeightG =
        dto.harvestDryWeightG == null || dto.harvestDryWeightG === ''
          ? null
          : dto.harvestDryWeightG;
    }
    if (dto.harvestQualityNotes !== undefined) {
      patch.harvestQualityNotes = dto.harvestQualityNotes?.trim() || null;
    }
    if (dto.roomType !== undefined) {
      patch.roomType = dto.roomType ?? null;
    }
    if (dto.wateringType !== undefined) {
      patch.wateringType = dto.wateringType ?? null;
    }
    if (dto.startType !== undefined) {
      patch.startType = dto.startType ?? null;
    }
    if (dto.setupNotes !== undefined) {
      patch.setupNotes = dto.setupNotes?.trim() || null;
    }
    if (dto.setupWizardCompletedAt !== undefined) {
      patch.setupWizardCompletedAt = dto.setupWizardCompletedAt;
    }

    if (
      dto.growthStage !== undefined &&
      dto.growthStage !== existing.growthStage
    ) {
      await this.assertNotebookGrowthTransition(id, existing, dto);
    }

    if (dto.growthStage !== undefined) {
      patch.growthStage = dto.growthStage;
    }
    if (dto.vegPhaseStartedAfterWeekIndex !== undefined) {
      patch.vegPhaseStartedAfterWeekIndex = dto.vegPhaseStartedAfterWeekIndex;
    }
    if (dto.flowerPhaseStartedAfterWeekIndex !== undefined) {
      patch.flowerPhaseStartedAfterWeekIndex =
        dto.flowerPhaseStartedAfterWeekIndex;
    }
    if (dto.harvestImageUrls !== undefined) {
      patch.harvestImageUrls = this.normalizeWeekImages(dto.harvestImageUrls);
    }

    const merged = { ...existing, ...patch };
    const derived = harvestDerived(
      merged.harvestDryWeightG?.toString() ?? null,
      merged.totalLightWatts?.toString() ?? null,
      merged.plantCount,
    );
    patch.gPerWatt = derived.gPerWatt;
    patch.gPerWattPerPlant = derived.gPerWattPerPlant;

    await db.update(notebooks).set(patch).where(eq(notebooks.id, id));
    const [updated] = await db.select().from(notebooks).where(eq(notebooks.id, id));
    return updated!;
  }

  async deleteOwn(ownerId: string, id: string) {
    const db = getDb();
    const [existing] = await db.select().from(notebooks).where(eq(notebooks.id, id));
    if (!existing) throw new NotFoundException('Notebook not found');
    if (existing.ownerId !== ownerId) throw new ForbiddenException();
    await db.delete(notebooks).where(eq(notebooks.id, id));
    return { ok: true as const };
  }

  async deleteAdmin(id: string) {
    const db = getDb();
    const [existing] = await db.select().from(notebooks).where(eq(notebooks.id, id));
    if (!existing) throw new NotFoundException('Notebook not found');
    await db.delete(notebooks).where(eq(notebooks.id, id));
    return { ok: true as const };
  }

  async createWeek(
    notebookId: string,
    ownerId: string,
    dto: CreateNotebookWeekDto,
    isAdmin: boolean,
  ) {
    const db = getDb();
    const [nb] = await db.select().from(notebooks).where(eq(notebooks.id, notebookId));
    if (!nb) throw new NotFoundException('Notebook not found');
    if (!isAdmin && nb.ownerId !== ownerId) throw new ForbiddenException();

    const [ clash ] = await db
      .select({ id: notebookWeeks.id })
      .from(notebookWeeks)
      .where(
        and(
          eq(notebookWeeks.notebookId, notebookId),
          eq(notebookWeeks.weekIndex, dto.weekIndex),
        ),
      );
    if (clash) {
      throw new BadRequestException('Week index already exists for this notebook.');
    }

    const imageUrls = this.normalizeWeekImages(dto.imageUrls);
    const [week] = await db
      .insert(notebookWeeks)
      .values({
        notebookId,
        weekIndex: dto.weekIndex,
        notes: dto.notes?.trim() || null,
        tempC: dto.tempC ?? null,
        humidityPct: dto.humidityPct ?? null,
        ph: dto.ph ?? null,
        ec: dto.ec ?? null,
        ppm: dto.ppm?.trim() || null,
        waterNotes: dto.waterNotes?.trim() || null,
        lightCycle: dto.lightCycle?.trim() || null,
        imageUrls,
      })
      .returning();

    const nutrientLines = dto.nutrients ?? [];
    if (dto.copyNutrientsFromPreviousWeek) {
      const [prevMax] = await db
        .select({ m: max(notebookWeeks.weekIndex) })
        .from(notebookWeeks)
        .where(
          and(
            eq(notebookWeeks.notebookId, notebookId),
            lt(notebookWeeks.weekIndex, dto.weekIndex),
          ),
        );
      const prevIdx = prevMax?.m;
      if (prevIdx != null) {
        const [prevWeek] = await db
          .select({ id: notebookWeeks.id })
          .from(notebookWeeks)
          .where(
            and(
              eq(notebookWeeks.notebookId, notebookId),
              eq(notebookWeeks.weekIndex, prevIdx),
            ),
          );
        if (prevWeek) {
          const prevN = await db
            .select()
            .from(notebookWeekNutrients)
            .where(eq(notebookWeekNutrients.weekId, prevWeek.id))
            .orderBy(asc(notebookWeekNutrients.sortOrder));
          for (const line of prevN) {
            await db.insert(notebookWeekNutrients).values({
              weekId: week!.id,
              productId: line.productId,
              customLabel: line.customLabel,
              dosage: line.dosage,
              sortOrder: line.sortOrder,
            });
          }
        }
      }
    } else {
      await this.replaceWeekNutrients(week!.id, nutrientLines);
    }

    await db
      .update(notebooks)
      .set({ updatedAt: new Date() })
      .where(eq(notebooks.id, notebookId));

    return week!;
  }

  async updateWeek(
    notebookId: string,
    weekId: string,
    ownerId: string,
    dto: UpdateNotebookWeekDto,
    isAdmin: boolean,
  ) {
    const db = getDb();
    const [nb] = await db.select().from(notebooks).where(eq(notebooks.id, notebookId));
    if (!nb) throw new NotFoundException('Notebook not found');
    if (!isAdmin && nb.ownerId !== ownerId) throw new ForbiddenException();

    const [week] = await db
      .select()
      .from(notebookWeeks)
      .where(
        and(eq(notebookWeeks.id, weekId), eq(notebookWeeks.notebookId, notebookId)),
      );
    if (!week) throw new NotFoundException('Week not found');

    const patch: Partial<typeof notebookWeeks.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.notes !== undefined) patch.notes = dto.notes?.trim() || null;
    if (dto.tempC !== undefined) patch.tempC = dto.tempC;
    if (dto.humidityPct !== undefined) patch.humidityPct = dto.humidityPct;
    if (dto.ph !== undefined) patch.ph = dto.ph;
    if (dto.ec !== undefined) patch.ec = dto.ec;
    if (dto.ppm !== undefined) patch.ppm = dto.ppm?.trim() || null;
    if (dto.waterNotes !== undefined) {
      patch.waterNotes = dto.waterNotes?.trim() || null;
    }
    if (dto.lightCycle !== undefined) {
      patch.lightCycle = dto.lightCycle?.trim() || null;
    }
    if (dto.imageUrls !== undefined) {
      patch.imageUrls = this.normalizeWeekImages(dto.imageUrls);
    }

    await db.update(notebookWeeks).set(patch).where(eq(notebookWeeks.id, weekId));

    if (dto.nutrients !== undefined) {
      await this.replaceWeekNutrients(weekId, dto.nutrients);
    }

    await db
      .update(notebooks)
      .set({ updatedAt: new Date() })
      .where(eq(notebooks.id, notebookId));

    const [updated] = await db
      .select()
      .from(notebookWeeks)
      .where(eq(notebookWeeks.id, weekId));
    return updated!;
  }

  async deleteWeek(notebookId: string, weekId: string, ownerId: string, isAdmin: boolean) {
    const db = getDb();
    const [nb] = await db.select().from(notebooks).where(eq(notebooks.id, notebookId));
    if (!nb) throw new NotFoundException('Notebook not found');
    if (!isAdmin && nb.ownerId !== ownerId) throw new ForbiddenException();
    const [week] = await db
      .select()
      .from(notebookWeeks)
      .where(
        and(eq(notebookWeeks.id, weekId), eq(notebookWeeks.notebookId, notebookId)),
      );
    if (!week) throw new NotFoundException('Week not found');
    await db.delete(notebookWeeks).where(eq(notebookWeeks.id, weekId));
    await db
      .update(notebooks)
      .set({ updatedAt: new Date() })
      .where(eq(notebooks.id, notebookId));
    return { ok: true as const };
  }

  private async replaceWeekNutrients(
    weekId: string,
    lines: WeekNutrientLineDto[],
  ) {
    const db = getDb();
    await db
      .delete(notebookWeekNutrients)
      .where(eq(notebookWeekNutrients.weekId, weekId));
    let order = 0;
    for (const line of lines) {
      const pid = line.productId ?? null;
      if (pid) {
        const [p] = await db
          .select({ id: nutrientProducts.id })
          .from(nutrientProducts)
          .where(eq(nutrientProducts.id, pid));
        if (!p) throw new BadRequestException('Unknown nutrient product.');
      }
      await db.insert(notebookWeekNutrients).values({
        weekId,
        productId: pid,
        customLabel: line.customLabel?.trim() || null,
        dosage: line.dosage?.trim() || null,
        sortOrder: line.sortOrder ?? order,
      });
      order += 1;
    }
  }

  async listNutrientProducts(opts: {
    q?: string;
    page: number;
    pageSize: number;
    includeUnpublished?: boolean;
  }) {
    const db = getDb();
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const skip = (page - 1) * pageSize;
    const q = opts.q?.trim();

    const conds = [];
    if (!opts.includeUnpublished) {
      conds.push(eq(nutrientProducts.published, true));
    }
    if (q) {
      conds.push(
        or(
          ilike(nutrientProducts.name, `%${q}%`),
          ilike(nutrientProducts.brand, `%${q}%`),
        )!,
      );
    }

    const where =
      conds.length === 0 ? undefined : conds.length === 1 ? conds[0]! : and(...conds)!;

    const [{ total }] = await db
      .select({ total: count() })
      .from(nutrientProducts)
      .where(where);

    const rows = await db
      .select()
      .from(nutrientProducts)
      .where(where)
      .orderBy(asc(nutrientProducts.name))
      .offset(skip)
      .limit(pageSize);

    return {
      items: rows,
      total: Number(total),
      page,
      pageSize,
    };
  }

  async listNutrientProductsPagedAdmin(skip: number, take: number) {
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(nutrientProducts);
    const rows = await db
      .select()
      .from(nutrientProducts)
      .orderBy(desc(nutrientProducts.updatedAt))
      .offset(skip)
      .limit(take);
    return { rows, total: Number(total) };
  }

  async getNutrientProductAdmin(id: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(nutrientProducts)
      .where(eq(nutrientProducts.id, id));
    if (!row) throw new NotFoundException();
    return row;
  }

  async createNutrientProduct(data: {
    name: string;
    brand?: string | null;
    npk?: string | null;
    published?: boolean;
  }) {
    const db = getDb();
    const name = data.name.trim();
    if (!name) throw new BadRequestException('Name required.');
    const [row] = await db
      .insert(nutrientProducts)
      .values({
        name,
        brand: data.brand?.trim() || null,
        npk: data.npk?.trim() || null,
        published: data.published ?? true,
      })
      .returning();
    return row;
  }

  async updateNutrientProduct(
    id: string,
    data: Partial<{
      name: string;
      brand: string | null;
      npk: string | null;
      published: boolean;
    }>,
  ) {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(nutrientProducts)
      .where(eq(nutrientProducts.id, id));
    if (!existing) throw new NotFoundException();
    const patch: Partial<typeof nutrientProducts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) {
      const n = data.name.trim();
      if (!n) throw new BadRequestException('Name cannot be empty.');
      patch.name = n;
    }
    if (data.brand !== undefined) patch.brand = data.brand?.trim() || null;
    if (data.npk !== undefined) patch.npk = data.npk?.trim() || null;
    if (data.published !== undefined) patch.published = data.published;
    await db.update(nutrientProducts).set(patch).where(eq(nutrientProducts.id, id));
    return this.getNutrientProductAdmin(id);
  }

  async deleteNutrientProduct(id: string) {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(nutrientProducts)
      .where(eq(nutrientProducts.id, id));
    if (!existing) throw new NotFoundException();
    await db.delete(nutrientProducts).where(eq(nutrientProducts.id, id));
    return { ok: true as const };
  }
}
