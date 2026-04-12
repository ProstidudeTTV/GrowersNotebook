import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { CatalogModule } from './catalog/catalog.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlocksModule } from './blocks/blocks.module';
import { CommentsModule } from './comments/comments.module';
import { CommunitiesModule } from './communities/communities.module';
import { FollowsModule } from './follows/follows.module';
import { PostsModule } from './posts/posts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProfilesModule } from './profiles/profiles.module';
import { DirectMessagesModule } from './direct-messages/direct-messages.module';
import { NotebooksModule } from './notebooks/notebooks.module';
import { AuditModule } from './audit/audit.module';
import { SiteModule } from './site/site.module';
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
    BlocksModule,
    ProfilesModule,
    NotificationsModule,
    CommunitiesModule,
    FollowsModule,
    PostsModule,
    CommentsModule,
    VotesModule,
    AdminModule,
    CatalogModule,
    DirectMessagesModule,
    NotebooksModule,
    SiteModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
