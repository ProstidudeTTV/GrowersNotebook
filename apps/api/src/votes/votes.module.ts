import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BlocksModule } from '../blocks/blocks.module';
import { CommentsModule } from '../comments/comments.module';
import { NotebooksModule } from '../notebooks/notebooks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsModule } from '../posts/posts.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [
    AuthModule,
    BlocksModule,
    PostsModule,
    CommentsModule,
    NotebooksModule,
    NotificationsModule,
    ProfilesModule,
  ],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}

