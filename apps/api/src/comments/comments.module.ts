import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { CommentsService } from './comments.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => ProfilesModule)],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

