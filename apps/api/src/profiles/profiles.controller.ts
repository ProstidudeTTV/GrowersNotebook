import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { CommentsService } from '../comments/comments.service';
import { CurrentUser } from '../common/current-user.decorator';
import { SearchSiteQueryDto } from '../common/dto/search-site.query.dto';
import { NotebooksService } from '../notebooks/notebooks.service';
import { PostsService } from '../posts/posts.service';
import { ListProfileCommentsQueryDto } from './dto/list-profile-comments.query';
import { ListProfileNotebooksQueryDto } from './dto/list-profile-notebooks.query';
import { ListProfilePostsQueryDto } from './dto/list-profile-posts.query';
import { ReportProfileBodyDto } from './dto/report-profile-body.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly posts: PostsService,
    private readonly comments: CommentsService,
    private readonly notebooks: NotebooksService,
  ) {}

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@CurrentUser() user: JwtUser) {
    return this.profiles.getMe(user.sub);
  }

  @Patch('me')
  @UseGuards(SupabaseAuthGuard)
  async updateMe(
    @CurrentUser() user: JwtUser,
    @Body() body: UpdateProfileDto,
  ) {
    return this.profiles.updateMe(user.sub, body);
  }

  @Get(':id/posts')
  @UseGuards(OptionalAuthGuard)
  async listPosts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListProfilePostsQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    const v = await this.profiles.getProfileFeedVisibility(id, user?.sub);
    if (!v.exists) throw new NotFoundException();
    if (!v.allowPosts) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }
    return this.posts.listByAuthor({
      authorId: id,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      viewerId: user?.sub,
    });
  }

  @Get(':id/notebooks')
  @UseGuards(OptionalAuthGuard)
  async listNotebooks(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListProfileNotebooksQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    const v = await this.profiles.getProfileNotebookVisibility(id, user?.sub);
    if (!v.exists) throw new NotFoundException();
    if (!v.allow) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }
    return this.notebooks.listByOwner({
      ownerId: id,
      viewerId: user?.sub,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id/comments')
  @UseGuards(OptionalAuthGuard)
  async listComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListProfileCommentsQueryDto,
    @CurrentUser() user?: JwtUser,
  ) {
    const v = await this.profiles.getProfileFeedVisibility(id, user?.sub);
    if (!v.exists) throw new NotFoundException();
    if (!v.allowComments) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      };
    }
    return this.comments.listByAuthor({
      authorId: id,
      page: query.page,
      pageSize: query.pageSize,
      viewerId: user?.sub,
    });
  }

  @Post(':id/report')
  @UseGuards(SupabaseAuthGuard)
  report(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: ReportProfileBodyDto,
  ) {
    return this.profiles.reportProfile(user.sub, id, dto.reason);
  }

  @Get('search')
  @UseGuards(OptionalAuthGuard)
  search(@Query() query: SearchSiteQueryDto) {
    return this.profiles.searchForSite({
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  getPublic(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.profiles.getPublicProfile(id, user?.sub);
  }
}
