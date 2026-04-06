import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NameBlocklistModule } from '../name-blocklist/name-blocklist.module';
import { FollowsModule } from '../follows/follows.module';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';

@Module({
  imports: [AuthModule, FollowsModule, NameBlocklistModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
