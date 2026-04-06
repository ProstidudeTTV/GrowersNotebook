import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
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
    const where =
      status != null ? eq(catalogSuggestions.status, status) : undefined;
    const [{ total }] = await db
      .select({ total: count() })
      .from(catalogSuggestions)
      .where(where);
    const rows = await db
      .select()
      .from(catalogSuggestions)
      .where(where)
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

  async approve(id: string, moderatorId: string) {
    const db = getDb();
    const row = await this.findById(id);
    if (!row) throw new NotFoundException();
    if (row.status !== 'pending') {
      throw new BadRequestException('Suggestion is not pending');
    }

    switch (row.kind) {
      case 'new_breeder': {
        const p = row.payload as Record<string, unknown>;
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
        const p = row.payload as Record<string, unknown>;
        const slug = String(p.slug ?? '').trim();
        const name = String(p.name ?? '').trim();
        if (!slug || !name) throw new BadRequestException('Invalid payload');
        let breederId: string | null = null;
        if (p.breederSlug) {
          const b = await this.breeders.findBySlug(String(p.breederSlug));
          if (b) breederId = b.id;
        } else if (p.breederId) {
          const b = await this.breeders.findById(String(p.breederId));
          if (b) breederId = b.id;
        }
        await this.strains.createAdmin({
          slug,
          name,
          description: (p.description as string) ?? null,
          breederId,
          effects: Array.isArray(p.effects) ? (p.effects as string[]) : [],
          effectsNotes: (p.effectsNotes as string) ?? null,
          published: p.published === false ? false : true,
        });
        break;
      }
      case 'edit_breeder': {
        const p = row.payload as Record<string, unknown>;
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
        const p = row.payload as Record<string, unknown>;
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
