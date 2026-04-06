import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { nameBlocklist } from '../db/schema';

const CACHE_TTL_MS = 30_000;

function isNameBlocklistTableMissingError(e: unknown): boolean {
  let cur: unknown = e;
  for (let depth = 0; depth < 8 && cur; depth++) {
    const err = cur as { code?: string; message?: string; cause?: unknown };
    if (err.code === '42P01') return true;
    const m = String(err.message ?? '');
    if (
      m.includes('name_blocklist') &&
      (m.includes('does not exist') ||
        m.toLowerCase().includes('undefined table'))
    ) {
      return true;
    }
    cur = err.cause;
  }
  return false;
}

@Injectable()
export class NameBlocklistService {
  private readonly logger = new Logger(NameBlocklistService.name);
  private static loggedMissingTable = false;
  private cache: { terms: string[]; expiresAt: number } | null = null;

  private invalidateCache() {
    this.cache = null;
  }

  normalizeTerm(raw: string): string {
    return raw.normalize('NFKC').trim().toLowerCase();
  }

  private normalizeForScan(value: string): string {
    return value.normalize('NFKC').trim().toLowerCase();
  }

  private async loadTerms(): Promise<string[]> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.terms;
    }
    const db = getDb();
    try {
      const rows = await db
        .select({ term: nameBlocklist.term })
        .from(nameBlocklist);
      const terms = rows.map((r) => r.term).filter(Boolean);
      this.cache = { terms, expiresAt: now + CACHE_TTL_MS };
      return terms;
    } catch (e) {
      if (isNameBlocklistTableMissingError(e)) {
        if (!NameBlocklistService.loggedMissingTable) {
          NameBlocklistService.loggedMissingTable = true;
          this.logger.warn(
            'name_blocklist table is missing; blocklist is disabled. Run: npm run db:migrate',
          );
        }
        const terms: string[] = [];
        this.cache = { terms, expiresAt: now + CACHE_TTL_MS };
        return terms;
      }
      throw e;
    }
  }

  /** True if the string is allowed (no blocklist substring hit). */
  async isAllowed(name: string | null | undefined): Promise<boolean> {
    if (name == null || name === '') return true;
    const scan = this.normalizeForScan(name);
    if (!scan) return true;
    const terms = await this.loadTerms();
    for (const t of terms) {
      if (scan.includes(t)) return false;
    }
    return true;
  }

  async assertAllowed(name: string | null | undefined): Promise<void> {
    if (name == null || name === '') return;
    if (!(await this.isAllowed(name))) {
      throw new BadRequestException(
        'This name is not allowed. Choose a different one.',
      );
    }
  }

  async listPaged(skip: number, take: number) {
    const db = getDb();
    try {
      const [{ total }] = await db
        .select({ total: count() })
        .from(nameBlocklist);
      const rows = await db
        .select()
        .from(nameBlocklist)
        .orderBy(asc(nameBlocklist.createdAt))
        .offset(skip)
        .limit(take);
      return { rows, total };
    } catch (e) {
      if (isNameBlocklistTableMissingError(e)) {
        return { rows: [], total: 0 };
      }
      throw e;
    }
  }

  /**
   * Split comma-separated input, normalize, dedupe within batch, skip empty / overlong.
   */
  parseBulkRaw(raw: string): { terms: string[]; skippedInvalid: number } {
    let skippedInvalid = 0;
    const seen = new Set<string>();
    const terms: string[] = [];
    for (const part of raw.split(',')) {
      const term = this.normalizeTerm(part);
      if (!term) continue;
      if (term.length > 120) {
        skippedInvalid++;
        continue;
      }
      if (seen.has(term)) continue;
      seen.add(term);
      terms.push(term);
    }
    return { terms, skippedInvalid };
  }

  async addBulk(raw: string): Promise<{
    created: number;
    skippedDuplicate: number;
    skippedInvalid: number;
  }> {
    const { terms, skippedInvalid } = this.parseBulkRaw(raw);
    if (terms.length === 0) {
      return {
        created: 0,
        skippedDuplicate: 0,
        skippedInvalid,
      };
    }
    const db = getDb();
    try {
      const inserted = await db
        .insert(nameBlocklist)
        .values(terms.map((term) => ({ term })))
        .onConflictDoNothing({ target: nameBlocklist.term })
        .returning();
      this.invalidateCache();
      return {
        created: inserted.length,
        skippedDuplicate: terms.length - inserted.length,
        skippedInvalid,
      };
    } catch (e: unknown) {
      if (isNameBlocklistTableMissingError(e)) {
        throw new ServiceUnavailableException(
          'Name blocklist is not available until migrations are applied (name_blocklist table).',
        );
      }
      throw e;
    }
  }

  async add(rawTerm: string) {
    const term = this.normalizeTerm(rawTerm);
    if (!term) {
      throw new BadRequestException('Term cannot be empty.');
    }
    if (term.length > 120) {
      throw new BadRequestException('Term is too long.');
    }
    const db = getDb();
    try {
      const [row] = await db
        .insert(nameBlocklist)
        .values({ term })
        .returning();
      this.invalidateCache();
      return row;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505') {
        throw new ConflictException('That term is already blocked.');
      }
      if (isNameBlocklistTableMissingError(e)) {
        throw new ServiceUnavailableException(
          'Name blocklist is not available until migrations are applied (name_blocklist table).',
        );
      }
      throw e;
    }
  }

  async remove(id: string) {
    const db = getDb();
    try {
      const [row] = await db
        .delete(nameBlocklist)
        .where(eq(nameBlocklist.id, id))
        .returning();
      if (!row) throw new NotFoundException();
      this.invalidateCache();
      return row;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (isNameBlocklistTableMissingError(e)) {
        throw new ServiceUnavailableException(
          'Name blocklist is not available until migrations are applied (name_blocklist table).',
        );
      }
      throw e;
    }
  }
}
