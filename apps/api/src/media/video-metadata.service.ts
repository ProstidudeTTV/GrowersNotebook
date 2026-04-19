import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StorageService } from './storage.service';

const execFileAsync = promisify(execFile);

const VIDEO_CT = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

@Injectable()
export class VideoMetadataService {
  constructor(private readonly storage: StorageService) {}

  /**
   * Remux with ffmpeg to drop most container metadata (best-effort). Requires `ffmpeg` on PATH (Dockerfile).
   */
  async stripAndUpload(params: {
    profileId: string;
    /** Path inside post-media bucket, e.g. uuid/file.mp4 */
    objectPath: string;
    contentType: string;
  }): Promise<{ ok: true }> {
    const { profileId, objectPath, contentType } = params;
    const normalized = objectPath.replace(/^\/+/, '').trim();
    if (!normalized.startsWith(`${profileId}/`)) {
      throw new BadRequestException('Invalid storage path.');
    }
    if (!VIDEO_CT.has(contentType)) {
      throw new BadRequestException('Only MP4, WebM, or QuickTime videos are supported.');
    }

    const input = await this.storage.downloadPostMediaBuffer(normalized);
    const dir = await mkdtemp(join(tmpdir(), 'gn-vid-'));
    const ext =
      contentType === 'video/webm'
        ? 'webm'
        : contentType === 'video/quicktime'
          ? 'mov'
          : 'mp4';
    const inPath = join(dir, `in.${ext}`);
    const outPath = join(dir, `out.${ext}`);
    try {
      await writeFile(inPath, input);
      try {
        await execFileAsync(
          'ffmpeg',
          [
            '-y',
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            inPath,
            '-c',
            'copy',
            '-map_metadata',
            '-1',
            outPath,
          ],
          { timeout: 120_000 },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/ENOENT|spawn/i.test(msg)) {
          throw new ServiceUnavailableException(
            'Video processing is not available on this server.',
          );
        }
        throw new BadRequestException(
          'Could not process video. Try re-encoding to MP4 (H.264) and upload again.',
        );
      }
      const outBuf = await readFile(outPath);
      await this.storage.uploadPostMediaBuffer(normalized, outBuf, contentType);
      return { ok: true as const };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
