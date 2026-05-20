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

  private serviceRoleKey(): string | undefined {
    return (
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() ||
      this.config.get<string>('SUPABASE_SECRET_KEY')?.trim() ||
      this.config.get<string>('SUPABASE_SERVICE_KEY')?.trim() ||
      undefined
    );
  }

  private adminClient(): SupabaseClient | null {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.serviceRoleKey();
    if (!url || !key) return null;
    return createClient(url, key);
  }

  /** Whether server-side storage uploads (community banners, post-media admin) can run. */
  isAdminStorageConfigured(): boolean {
    return this.adminClient() !== null;
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

  /**
   * Site staff community icon/banner upload (service role — avoids browser RLS on
   * `community-banners`). Caller must enforce admin role before invoking.
   */
  async uploadCommunityBannerImage(
    communitySlug: string,
    body: Buffer,
    contentType: string,
    originalName: string,
    kind: 'banner' | 'icon',
  ): Promise<string> {
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException(
        'Image must be JPEG, PNG, WebP, or GIF.',
      );
    }
    const slug = communitySlug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException('Invalid community slug.');
    }
    if (body.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Image must be 5 MB or smaller.');
    }
    const client = this.adminClient();
    if (!client) {
      throw new ServiceUnavailableException('Storage is not configured.');
    }
    const safeName = (originalName || 'image')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);
    const fileName =
      kind === 'icon'
        ? `icon-${Date.now()}-${safeName}`
        : `${Date.now()}-${safeName}`;
    const path = `${slug}/${fileName}`;
    const { error } = await client.storage
      .from('community-banners')
      .upload(path, body, { contentType, upsert: false });
    if (error) {
      throw new BadRequestException(
        error.message || 'Could not upload community image.',
      );
    }
    const { data } = client.storage.from('community-banners').getPublicUrl(path);
    const publicUrl = data.publicUrl;
    if (!publicUrl?.startsWith('https://')) {
      throw new BadRequestException('Could not resolve public URL for upload.');
    }
    return publicUrl;
  }
}
