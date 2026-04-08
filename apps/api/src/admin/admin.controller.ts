import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CreateNameBlocklistBulkDto } from './dto/create-name-blocklist-bulk.dto';
import { CreateNameBlocklistDto } from './dto/create-name-blocklist.dto';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';
import type { Response } from 'express';
import { Roles, type ProfileRole } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { JwtUser } from '../auth/jwt-user';
import { CurrentUser } from '../common/current-user.decorator';
import { CommentsService } from '../comments/comments.service';
import { CommunitiesService } from '../communities/communities.service';
import { CommunityPinsService } from '../posts/community-pins.service';
import { PostsService } from '../posts/posts.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AdminRemovePostDto } from './dto/admin-remove-post.dto';
import { CreateCommunityDto } from '../communities/dto/create-community.dto';
import { UpdateCommunityAdminDto } from '../communities/dto/update-community-admin.dto';

function range(skip: string | undefined, take: string | undefined) {
  const start = Math.max(0, Number(skip ?? 0));
  const end = Math.max(start + 1, Number(take ?? start + 10));
  return { start, end, skip: start, take: end - start };
}

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminController {
  constructor(
    private readonly posts: PostsService,
    private readonly communityPins: CommunityPinsService,
    private readonly communities: CommunitiesService,
    private readonly profiles: ProfilesService,
    private readonly comments: CommentsService,
    private readonly nameBlocklist: NameBlocklistService,
  ) {}

  @Get('posts')
  async listPosts(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Query('communityId') communityId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const cid =
      communityId && /^[0-9a-f-]{36}$/i.test(communityId)
        ? communityId
        : undefined;
    const { rows, total } = await this.posts.listPaged(skip, take, cid);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Get('posts/:id')
  getPost(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.getById(id);
  }

  @Patch('posts/:id')
  patchPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{ title: string; bodyHtml: string; bodyJson: object }>,
  ) {
    return this.posts.updateAdmin(id, body);
  }

  @Delete('posts/:id')
  deletePost(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.deleteAdmin(id);
  }

  @Post('posts/:id/remove')
  removePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminRemovePostDto,
  ) {
    return this.posts.removePostAdmin(id, {
      notifyAuthor: body.notifyAuthor,
      reason: body.reason,
    });
  }

  @Post('posts/:id/pin')
  pinPost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.communityPins.pinPost(id, user.sub);
  }

  @Delete('posts/:id/pin')
  unpinPost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.communityPins.unpinPost(id, user.sub);
  }

  @Get('communities')
  async listCommunities(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.communities.listPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('communities')
  createCommunity(@Body() body: CreateCommunityDto) {
    return this.communities.create(body);
  }

  @Get('communities/:id')
  async getCommunity(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.communities.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch('communities/:id')
  patchCommunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCommunityAdminDto,
  ) {
    return this.communities.update(id, body);
  }

  @Get('communities/:id/moderators')
  @Roles('admin')
  listCommunityModerators(@Param('id', ParseUUIDPipe) id: string) {
    return this.communities.listCommunityModerators(id);
  }

  @Post('communities/:id/moderators')
  @Roles('admin')
  addCommunityModerator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { moderatorId: string },
  ) {
    return this.communities.addCommunityModerator(id, body.moderatorId);
  }

  @Delete('communities/:id/moderators/:moderatorId')
  @Roles('admin')
  removeCommunityModerator(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moderatorId', ParseUUIDPipe) moderatorId: string,
  ) {
    return this.communities.removeCommunityModerator(id, moderatorId);
  }

  @Get('profiles')
  async listProfiles(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.profiles.listPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Get('profiles/:id')
  async getProfile(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.profiles.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch('profiles/:id')
  patchProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      displayName: string | null;
      description: string | null;
      role: ProfileRole;
      avatarUrl: string | null;
      bannedAt: string | null;
      suspendedUntil: string | null;
    }>,
  ) {
    return this.profiles.updateAdmin(id, body);
  }

  @Get('disallowed-names')
  async listDisallowedNames(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.nameBlocklist.listPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('disallowed-names')
  addDisallowedName(@Body() body: CreateNameBlocklistDto) {
    return this.nameBlocklist.add(body.term);
  }

  @Post('disallowed-names/bulk')
  addDisallowedNamesBulk(@Body() body: CreateNameBlocklistBulkDto) {
    return this.nameBlocklist.addBulk(body.raw);
  }

  @Delete('disallowed-names/:id')
  removeDisallowedName(@Param('id', ParseUUIDPipe) id: string) {
    return this.nameBlocklist.remove(id);
  }

  @Get('comment-reports')
  async listCommentReports(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.comments.listReportsPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Delete('comments/:commentId')
  deleteCommentAdmin(
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.comments.deleteCommentAdmin(commentId);
  }

  @Get('profile-reports')
  async listProfileReports(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } =
      await this.profiles.listProfileReportsPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }
}
