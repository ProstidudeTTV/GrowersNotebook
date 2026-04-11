import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => ProfilesModule),
    NotificationsModule,
  ],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

