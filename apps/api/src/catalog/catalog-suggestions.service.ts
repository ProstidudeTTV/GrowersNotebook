import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, count, desc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { catalogSuggestions } from '../db/schema';
import type { CatalogSuggestionKind } from '../db/schema';
import { BreedersService } from './breeders.service';
import { StrainsService } from './strains.service';

@Injectable()
export class CatalogSuggestionsService {
  constructor(
    private readonly breeders: BreedersService,
    private readonly strains: StrainsService,
  ) {}

  async create(userId: string, kind: CatalogSuggestionKind, payload: Record<string, unknown>) {
    const db = getDb();
    const [row] = await db
      .insert(catalogSuggestions)
      .values({
        kind,
        payload,
        suggestedBy: userId,
        status: 'pending',
      })
      .returning();
    return row;
  }

  async listPaged(
    skip: number,
    take: number,
    status?: 'pending' | 'approved' | 'rejected',
  ) {
    const db = getDb();
    if (status != null) {
      const where = eq(catalogSuggestions.status, status);
      const [{ total }] = await db
        .select({ total: count() })
        .from(catalogSuggestions)
        .where(where);
      const order =
        status === 'pending'
          ? asc(catalogSuggestions.createdAt)
          : desc(catalogSuggestions.moderatedAt);
      const rows = await db
        .select()
        .from(catalogSuggestions)
        .where(where)
        .orderBy(order)
        .limit(take)
        .offset(skip);
      return { rows, total: Number(total) };
    }
    const [{ total }] = await db
      .select({ total: count() })
      .from(catalogSuggestions);
    const rows = await db
      .select()
      .from(catalogSuggestions)
      .orderBy(asc(catalogSuggestions.createdAt))
      .limit(take)
      .offset(skip);
    return { rows, total: Number(total) };
  }

  async findById(id: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(catalogSuggestions)
      .where(eq(catalogSuggestions.id, id));
    return row ?? null;
  }

  async approve(
    id: string,
    moderatorId: string,
    payloadOverride?: Record<string, unknown>,
  ) {
    const db = getDb();
    const row = await this.findById(id);
    if (!row) throw new NotFoundException();
    if (row.status !== 'pending') {
      throw new BadRequestException('Suggestion is not pending');
    }

    const basePayload = row.payload as Record<string, unknown>;
    const effectivePayload =
      payloadOverride &&
      typeof payloadOverride === 'object' &&
      !Array.isArray(payloadOverride)
        ? payloadOverride
        : basePayload;

    switch (row.kind) {
      case 'new_breeder': {
        const p = effectivePayload;
        const slug = String(p.slug ?? '').trim();
        const name = String(p.name ?? '').trim();
        if (!slug || !name) throw new BadRequestException('Invalid payload');
        await this.breeders.createAdmin({
          slug,
          name,
          description: (p.description as string) ?? null,
          website: (p.website as string) ?? null,
          country: (p.country as string) ?? null,
          published: p.published === false ? false : true,
        });
        break;
      }
      case 'new_strain': {
        const p = effectivePayload;
        const slug = String(p.slug ?? '').trim();
        const name = String(p.name ?? '').trim();
        if (!slug || !name) throw new BadRequestException('Invalid payload');

        let breederId: string | null = null;
        const rawBreederId = p.breederId;
        if (rawBreederId != null && String(rawBreederId).trim() !== '') {
          const b = await this.breeders.findById(String(rawBreederId).trim());
          if (b) breederId = b.id;
        }
        if (!breederId && p.breederSlug != null) {
          const bs = String(p.breederSlug).trim();
          if (bs) {
            const b = await this.breeders.findBySlug(bs);
            if (b) breederId = b.id;
          }
        }

        const description =
          p.description === undefined || p.description === null
            ? null
            : String(p.description);
        const effects = Array.isArray(p.effects)
          ? (p.effects as unknown[])
              .map((x) => String(x).trim())
              .filter((s) => s.length > 0)
          : [];
        const effectsNotes =
          p.effectsNotes === undefined ||
          p.effectsNotes === null ||
          String(p.effectsNotes).trim() === ''
            ? null
            : String(p.effectsNotes);
        const published = p.published === false ? false : true;

        const chemotypeRaw = p.chemotype != null ? String(p.chemotype).trim().toLowerCase() : '';
        const chemotype =
          chemotypeRaw === 'indica' ||
          chemotypeRaw === 'sativa' ||
          chemotypeRaw === 'hybrid'
            ? chemotypeRaw
            : undefined;
        const genetics =
          p.genetics === undefined || p.genetics === null
            ? undefined
            : String(p.genetics).trim() || null;
        const isAutoflower =
          p.isAutoflower === true || p.isAutoflower === 'true';
        let reportedEffectPcts: Record<string, number> | undefined;
        if (p.reportedEffectPcts != null && typeof p.reportedEffectPcts === 'object') {
          reportedEffectPcts = p.reportedEffectPcts as Record<string, number>;
        } else if (typeof p.reportedEffectPctsJson === 'string') {
          try {
            const parsed = JSON.parse(p.reportedEffectPctsJson) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              reportedEffectPcts = parsed as Record<string, number>;
            }
          } catch {
            /* ignore */
          }
        }

        await this.strains.createAdmin({
          slug,
          name,
          description,
          breederId,
          effects,
          effectsNotes,
          published,
          chemotype,
          genetics: genetics ?? undefined,
          isAutoflower,
          reportedEffectPcts,
        });
        break;
      }
      case 'edit_breeder': {
        const p = effectivePayload;
        const targetSlug = String(p.target_slug ?? p.targetSlug ?? '').trim();
        if (!targetSlug) throw new BadRequestException('target_slug required');
        const b = await this.breeders.findBySlug(targetSlug);
        if (!b) throw new NotFoundException('Target breeder not found');
        const patch: Parameters<BreedersService['updateAdmin']>[1] = {};
        if (p.slug != null) patch.slug = String(p.slug);
        if (p.name != null) patch.name = String(p.name);
        if (p.description !== undefined)
          patch.description = p.description as string | null;
        if (p.website !== undefined) patch.website = p.website as string | null;
        if (p.country !== undefined) patch.country = p.country as string | null;
        if (p.published !== undefined) patch.published = Boolean(p.published);
        if (Object.keys(patch).length === 0)
          throw new BadRequestException('No fields to patch');
        await this.breeders.updateAdmin(b.id, patch);
        break;
      }
      case 'edit_strain': {
        const p = effectivePayload;
        const targetSlug = String(p.target_slug ?? p.targetSlug ?? '').trim();
        if (!targetSlug) throw new BadRequestException('target_slug required');
        const s = await this.strains.findBySlug(targetSlug);
        if (!s) throw new NotFoundException('Target strain not found');
        const patch: Parameters<StrainsService['updateAdmin']>[1] = {};
        if (p.slug != null) patch.slug = String(p.slug);
        if (p.name != null) patch.name = String(p.name);
        if (p.description !== undefined)
          patch.description = p.description as string | null;
        if (p.effects !== undefined) {
          patch.effects = Array.isArray(p.effects)
            ? (p.effects as string[])
            : [];
        }
        if (p.effectsNotes !== undefined)
          patch.effectsNotes = p.effectsNotes as string | null;
        if (p.breederId !== undefined) {
          patch.breederId =
            p.breederId === null || p.breederId === ''
              ? null
              : String(p.breederId);
        }
        if (p.breederSlug) {
          const b = await this.breeders.findBySlug(String(p.breederSlug));
          patch.breederId = b ? b.id : null;
        }
        if (p.published !== undefined) patch.published = Boolean(p.published);
        if (Object.keys(patch).length === 0)
          throw new BadRequestException('No fields to patch');
        await this.strains.updateAdmin(s.id, patch);
        break;
      }
      default:
        throw new BadRequestException('Unknown suggestion kind');
    }

    await db
      .update(catalogSuggestions)
      .set({
        status: 'approved',
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
        rejectReason: null,
      })
      .where(eq(catalogSuggestions.id, id));
    return { ok: true };
  }

  async reject(id: string, moderatorId: string, reason?: string | null) {
    const db = getDb();
    const row = await this.findById(id);
    if (!row) throw new NotFoundException();
    if (row.status !== 'pending') {
      throw new BadRequestException('Suggestion is not pending');
    }
    await db
      .update(catalogSuggestions)
      .set({
        status: 'rejected',
        moderatedAt: new Date(),
        moderatedBy: moderatorId,
        rejectReason: reason ?? null,
      })
      .where(eq(catalogSuggestions.id, id));
    return { ok: true };
  }
}
