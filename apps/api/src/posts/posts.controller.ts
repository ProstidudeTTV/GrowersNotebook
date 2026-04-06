import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ListFollowingPostsQueryDto } from './dto/list-following-posts.query';
import { ListHotWeekPostsQueryDto } from './dto/list-hot-week-posts.query';
import { ListPostsQueryDto } from './dto/list-posts.query';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(@Query() query: ListPostsQueryDto, @CurrentUser() user?: JwtUser) {
    return this.posts.list({ ...query, viewerId: user?.sub });
  }

  /** Posts from followed growers and joined communities (signed-out → empty). */
  @Get('following')
  @UseGuards(OptionalAuthGuard)
  listFollowing(
    @Query() query: ListFollowingPostsQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.posts.listFollowing({
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      viewerId: user?.sub,
    });
  }

  /** Hot feed: posts from the last 7 days, ranked by net score (sidebar + /hot page). */
  @Get('hot/week')
  @UseGuards(OptionalAuthGuard)
  hotWeek(
    @Query() query: ListHotWeekPostsQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.posts.listHotWeek({
      page: query.page,
      pageSize: query.pageSize,
      viewerId: user?.sub,
    });
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.posts.getById(id, user?.sub);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  updateOwn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.updateOwn(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  deleteOwn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.posts.deleteOwn(user.sub, id);
  }
}
