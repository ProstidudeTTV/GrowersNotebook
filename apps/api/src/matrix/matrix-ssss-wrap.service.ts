import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { profileMatrixSsssWrap } from '../db/schema';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

@Injectable()
export class MatrixSsssWrapService {
  /** 32-byte AES key as 64 hex chars. */
  isConfigured(): boolean {
    const raw = process.env.MATRIX_SSSS_WRAP_KEY?.trim();
    return !!raw && /^[0-9a-fA-F]{64}$/.test(raw);
  }

  private getKey(): Buffer {
    const raw = process.env.MATRIX_SSSS_WRAP_KEY?.trim();
    if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new ServiceUnavailableException(
        'MATRIX_SSSS_WRAP_KEY must be set to 64 hex characters (256-bit) for cross-device messaging keys.',
      );
    }
    return Buffer.from(raw, 'hex');
  }

  wrapPayload(plainJson: string): string {
    const key = this.getKey();
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plainJson, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  unwrapPayload(b64: string): string {
    const key = this.getKey();
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < IV_LEN + 16 + 1) {
      throw new NotFoundException();
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + 16);
    const enc = buf.subarray(IV_LEN + 16);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      'utf8',
    );
  }

  async save(
    profileId: string,
    keyId: string,
    privateKeyB64: string,
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Cross-device messaging key sync is not configured (MATRIX_SSSS_WRAP_KEY).',
      );
    }
    const plain = JSON.stringify({ keyId, privateKeyB64 });
    const ciphertext = this.wrapPayload(plain);
    const db = getDb();
    const now = new Date();
    await db
      .insert(profileMatrixSsssWrap)
      .values({ profileId, ciphertext, updatedAt: now })
      .onConflictDoUpdate({
        target: profileMatrixSsssWrap.profileId,
        set: { ciphertext, updatedAt: now },
      });
  }

  async load(profileId: string): Promise<{
    keyId: string;
    privateKeyB64: string;
  }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Cross-device messaging key sync is not configured (MATRIX_SSSS_WRAP_KEY).',
      );
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(profileMatrixSsssWrap)
      .where(eq(profileMatrixSsssWrap.profileId, profileId))
      .limit(1);
    if (!row) {
      throw new NotFoundException();
    }
    let json: string;
    try {
      json = this.unwrapPayload(row.ciphertext);
    } catch {
      throw new NotFoundException();
    }
    const parsed = JSON.parse(json) as {
      keyId?: string;
      privateKeyB64?: string;
    };
    if (typeof parsed.keyId !== 'string' || typeof parsed.privateKeyB64 !== 'string') {
      throw new NotFoundException();
    }
    return { keyId: parsed.keyId, privateKeyB64: parsed.privateKeyB64 };
  }
}
