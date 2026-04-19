import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { StorageService } from './storage.service';
import { VideoMetadataService } from './video-metadata.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [StorageService, VideoMetadataService],
  exports: [StorageService, VideoMetadataService],
})
export class MediaModule {}
