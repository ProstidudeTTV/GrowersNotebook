import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { FollowsService } from './follows.service';

@Controller('follows')
@UseGuards(SupabaseAuthGuard)
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get('users')
  listUsersIFollow(@CurrentUser() user: JwtUser) {
    return this.follows.listUsersIFollowWithProfiles(user.sub);
  }

  @Post('users/:userId')
  followUser(
    @CurrentUser() user: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.follows.followUser(user.sub, userId);
  }

  @Delete('users/:userId')
  unfollowUser(
    @CurrentUser() user: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.follows.unfollowUser(user.sub, userId);
  }

  @Post('communities/:communityId')
  followCommunity(
    @CurrentUser() user: JwtUser,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.follows.followCommunity(user.sub, communityId);
  }

  @Delete('communities/:communityId')
  unfollowCommunity(
    @CurrentUser() user: JwtUser,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.follows.unfollowCommunity(user.sub, communityId);
  }
}
