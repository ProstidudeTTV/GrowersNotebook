import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminCatalogController } from '../catalog/admin-catalog.controller';
import { CatalogModule } from '../catalog/catalog.module';
import { NameBlocklistModule } from '../name-blocklist/name-blocklist.module';
import { CommentsModule } from '../comments/comments.module';
import { CommunitiesModule } from '../communities/communities.module';
import { PostsModule } from '../posts/posts.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AdminController } from './admin.controller';

/**
 * Single module owns all `GET|POST|PATCH|DELETE /admin/*` routes so Nest registers
 * one controller tree (avoids split `admin` controllers across modules).
 */
@Module({
  imports: [
    AuthModule,
    PostsModule,
    CommunitiesModule,
    ProfilesModule,
    CommentsModule,
    NameBlocklistModule,
    CatalogModule,
  ],
  controllers: [AdminController, AdminCatalogController],
})
export class AdminModule {}
