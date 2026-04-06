import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { CatalogModule } from './catalog/catalog.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { CommunitiesModule } from './communities/communities.module';
import { FollowsModule } from './follows/follows.module';
import { PostsModule } from './posts/posts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfilesModule } from './profiles/profiles.module';
import { MatrixModule } from './matrix/matrix.module';
import { VotesModule } from './votes/votes.module';
import { getApiPackageRoot } from './paths';

const apiRoot = getApiPackageRoot();
const repoRoot = join(apiRoot, '..', '..');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      /** Later entries override earlier. Put API-local .env last. */
      envFilePath: [
        join(repoRoot, '.env'),
        join(repoRoot, '.env.local'),
        join(apiRoot, '.env'),
        join(apiRoot, '.env.local'),
      ],
    }),
    AuthModule,
    ProfilesModule,
    NotificationsModule,
    CommunitiesModule,
    FollowsModule,
    PostsModule,
    CommentsModule,
    VotesModule,
    AdminModule,
    CatalogModule,
    MatrixModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
