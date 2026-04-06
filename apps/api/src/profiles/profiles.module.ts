import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { FollowsModule } from '../follows/follows.module';
import { NameBlocklistModule } from '../name-blocklist/name-blocklist.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsModule } from '../posts/posts.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => FollowsModule),
    forwardRef(() => PostsModule),
    forwardRef(() => CommentsModule),
    NotificationsModule,
    NameBlocklistModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
