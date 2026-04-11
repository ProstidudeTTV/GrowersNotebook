import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlocksModule } from '../blocks/blocks.module';
import { CommentsModule } from '../comments/comments.module';
import { FollowsModule } from '../follows/follows.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { CommunityPinsService } from './community-pins.service';
import { PostCommentsController } from './post-comments.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    BlocksModule,
    forwardRef(() => CommentsModule),
    forwardRef(() => FollowsModule),
    forwardRef(() => ProfilesModule),
    NotificationsModule,
  ],
  /** PostCommentsController first: owns `/posts/:postId/comments/...` before `PostsController` `GET :id`. */
  controllers: [PostCommentsController, PostsController],
  providers: [PostsService, CommunityPinsService],
  exports: [PostsService, CommunityPinsService],
})
export class PostsModule {}
