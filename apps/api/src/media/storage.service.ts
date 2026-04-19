import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  private adminClient(): SupabaseClient | null {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) return null;
    return createClient(url, key);
  }

  /**
   * Short-lived signed URL for `post-media` objects owned by `profileId` (`{profileId}/...`).
   * Use when buckets are private or to avoid hotlinking; public buckets can still use direct URLs.
   */
  async signedPostMediaUrl(
    profileId: string,
    objectPath: string,
    expiresSec = 3600,
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const normalized = objectPath.replace(/^\/+/, '').trim();
    if (!normalized.startsWith(`${profileId}/`)) {
      throw new ForbiddenException('Invalid storage path.');
    }
    const client = this.adminClient();
    if (!client) {
      throw new ServiceUnavailableException('Storage is not configured.');
    }
    const { data, error } = await client.storage
      .from('post-media')
      .createSignedUrl(normalized, expiresSec);
    if (error || !data?.signedUrl) {
      throw new BadRequestException('Could not create signed URL.');
    }
    return { signedUrl: data.signedUrl, expiresIn: expiresSec };
  }

  async downloadPostMediaBuffer(objectPath: string): Promise<Buffer> {
    const client = this.adminClient();
    if (!client) {
      throw new ServiceUnavailableException('Storage is not configured.');
    }
    const normalized = objectPath.replace(/^\/+/, '').trim();
    const { data, error } = await client.storage
      .from('post-media')
      .download(normalized);
    if (error || !data) {
      throw new BadRequestException('Could not download object.');
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async uploadPostMediaBuffer(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const client = this.adminClient();
    if (!client) {
      throw new ServiceUnavailableException('Storage is not configured.');
    }
    const normalized = objectPath.replace(/^\/+/, '').trim();
    const { error } = await client.storage.from('post-media').upload(normalized, body, {
      contentType,
      upsert: true,
    });
    if (error) {
      throw new BadRequestException('Could not upload processed file.');
    }
  }
}
