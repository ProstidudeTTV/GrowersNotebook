import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PostMediaPathDto, StripVideoDto } from './dto/post-media-path.dto';
import { StorageService } from './storage.service';
import { VideoMetadataService } from './video-metadata.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly storage: StorageService,
    private readonly videoMetadata: VideoMetadataService,
  ) {}

  /** Signed URL for own `post-media` objects (private-bucket migration / DM media). */
  @Post('post-media/signed-url')
  @UseGuards(SupabaseAuthGuard)
  async signedPostMedia(
    @CurrentUser() user: JwtUser,
    @Body() dto: PostMediaPathDto,
  ) {
    return this.storage.signedPostMediaUrl(
      user.sub,
      dto.path,
      dto.expiresSec ?? 3600,
    );
  }

  /** Server-side ffmpeg remux to strip container metadata after client upload. */
  @Post('post-media/strip-video-metadata')
  @UseGuards(SupabaseAuthGuard)
  async stripVideo(
    @CurrentUser() user: JwtUser,
    @Body() dto: StripVideoDto,
  ) {
    return this.videoMetadata.stripAndUpload({
      profileId: user.sub,
      objectPath: dto.path,
      contentType: dto.contentType,
    });
  }
}
