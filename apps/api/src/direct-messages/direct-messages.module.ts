import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { FollowsModule } from '../follows/follows.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { DirectMessagesController } from './direct-messages.controller';
import { DirectMessagesService } from './direct-messages.service';

@Module({
  imports: [BlocksModule, FollowsModule, ProfilesModule],
  controllers: [DirectMessagesController],
  providers: [DirectMessagesService],
})
export class DirectMessagesModule {}
