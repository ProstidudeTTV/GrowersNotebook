import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NameBlocklistModule } from '../name-blocklist/name-blocklist.module';
import { CommentsModule } from '../comments/comments.module';
import { CommunitiesModule } from '../communities/communities.module';
import { PostsModule } from '../posts/posts.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    AuthModule,
    PostsModule,
    CommunitiesModule,
    ProfilesModule,
    CommentsModule,
    NameBlocklistModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
