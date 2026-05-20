import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ListUserFollowsQueryDto } from './dto/list-user-follows.query.dto';
import { FollowsService } from './follows.service';

@Controller('follows')
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get('users')
  @UseGuards(SupabaseAuthGuard)
  listUsersIFollow(@CurrentUser() user: JwtUser) {
    return this.follows.listUsersIFollowWithProfiles(user.sub);
  }

  @Get('users/:userId/followers')
  @UseGuards(OptionalAuthGuard)
  listFollowers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ListUserFollowsQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.follows.listFollowers(userId, query.page, query.pageSize, {
      viewerId: user?.sub,
    });
  }

  @Get('users/:userId/following')
  @UseGuards(OptionalAuthGuard)
  listFollowingUsers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ListUserFollowsQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.follows.listFollowing(userId, query.page, query.pageSize, {
      viewerId: user?.sub,
    });
  }

  @Post('users/:userId')
  @UseGuards(SupabaseAuthGuard)
  followUser(
    @CurrentUser() user: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.follows.followUser(user.sub, userId);
  }

  @Delete('users/:userId')
  @UseGuards(SupabaseAuthGuard)
  unfollowUser(
    @CurrentUser() user: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.follows.unfollowUser(user.sub, userId);
  }

  @Post('communities/:communityId')
  @UseGuards(SupabaseAuthGuard)
  followCommunity(
    @CurrentUser() user: JwtUser,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.follows.followCommunity(user.sub, communityId);
  }

  @Delete('communities/:communityId')
  @UseGuards(SupabaseAuthGuard)
  unfollowCommunity(
    @CurrentUser() user: JwtUser,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.follows.unfollowCommunity(user.sub, communityId);
  }
}
