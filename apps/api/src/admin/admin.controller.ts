import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import {
  humanizeAuditAction,
  humanizeAuditEntityType,
} from '../audit/audit-action-label.util';
import { AuditService } from '../audit/audit.service';
import type { JwtUser } from '../auth/jwt-user';
import { Roles, type ProfileRole } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CommentsService } from '../comments/comments.service';
import { CommunitiesService } from '../communities/communities.service';
import { CommunityPinsService } from '../posts/community-pins.service';
import { PostsService } from '../posts/posts.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AdminDismissReportDto } from './dto/admin-dismiss-report.dto';
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
@Roles('admin')
export class AdminController {
  constructor(
    private readonly posts: PostsService,
    private readonly communityPins: CommunityPinsService,
    private readonly communities: CommunitiesService,
    private readonly profiles: ProfilesService,
    private readonly comments: CommentsService,
    private readonly nameBlocklist: NameBlocklistService,
    private readonly audit: AuditService,
  ) {}

  @Get('audit-events')
  async listAuditEvents(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Query('subjectProfileId') subjectProfileId: string | undefined,
    @Query('actorProfileId') actorProfileId: string | undefined,
    @Query('action') action: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.audit.listAdminPaged({
      skip,
      take,
      subjectProfileId:
        subjectProfileId && /^[0-9a-f-]{36}$/i.test(subjectProfileId)
          ? subjectProfileId
          : undefined,
      actorProfileId:
        actorProfileId && /^[0-9a-f-]{36}$/i.test(actorProfileId)
          ? actorProfileId
          : undefined,
      action: action?.trim() || undefined,
    });
    res.setHeader('X-Total-Count', String(total));
    const idSet = new Set<string>();
    for (const r of rows) {
      if (r.actorProfileId) idSet.add(r.actorProfileId);
      if (r.subjectProfileId) idSet.add(r.subjectProfileId);
    }
    const names = await this.profiles.getDisplayNamesByIds([...idSet]);
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      actorProfileId: r.actorProfileId,
      actorDisplayName: r.actorProfileId
        ? names.get(r.actorProfileId) ?? null
        : null,
      actorRole: r.actorRole,
      action: r.action,
      actionLabel: humanizeAuditAction(r.action),
      entityType: r.entityType,
      entityTypeLabel: humanizeAuditEntityType(r.entityType),
      entityId: r.entityId,
      subjectProfileId: r.subjectProfileId,
      subjectDisplayName: r.subjectProfileId
        ? names.get(r.subjectProfileId) ?? null
        : null,
      metadata: r.metadata,
      ip: r.ip,
    }));
  }

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
  async deletePost(@Param('id', ParseUUIDPipe) id: string) {
    return this.posts.deleteAdmin(id);
  }

  @Post('posts/:id/remove')
  async removePost(
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

  @Delete('communities/:id')
  deleteCommunity(@Param('id', ParseUUIDPipe) id: string) {
    return this.communities.deleteById(id);
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
  @Roles('admin', 'moderator')
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

  @Get('profiles/:id/moderation-summary')
  @Roles('admin', 'moderator')
  moderationSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.moderationSummaryAdmin(id);
  }

  @Get('profiles/:id')
  @Roles('admin', 'moderator')
  async getProfile(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.profiles.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch('profiles/:id')
  @Roles('admin', 'moderator')
  async patchProfile(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      displayName: string | null;
      description: string | null;
      role: ProfileRole;
      avatarUrl: string | null;
      bannedAt: string | null;
      banExpiresAt: string | null;
      suspendedUntil: string | null;
    }>,
  ) {
    const actor = await this.profiles.findById(user.sub);
    if (!actor) throw new ForbiddenException();
    return this.profiles.updateAdmin(id, body, { actorRole: actor.role });
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
  @Roles('admin', 'moderator')
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

  @Patch('comment-reports/:id/dismiss')
  @Roles('admin', 'moderator')
  async dismissCommentReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminDismissReportDto,
  ) {
    return this.comments.dismissCommentReport(id, {
      reporterNote: body.reporterNote,
      notifyReported: body.notifyReported === true,
      reportedWarning: body.reportedWarning,
    });
  }

  @Delete('comments/:commentId')
  @Roles('admin', 'moderator')
  async deleteCommentAdmin(
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.comments.deleteCommentAdmin(commentId);
  }

  @Get('profile-reports')
  @Roles('admin', 'moderator')
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

  @Patch('profile-reports/:id/dismiss')
  @Roles('admin', 'moderator')
  async dismissProfileReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminDismissReportDto,
  ) {
    return this.profiles.dismissProfileReport(id, {
      reporterNote: body.reporterNote,
      notifyReported: body.notifyReported === true,
      reportedWarning: body.reportedWarning,
    });
  }
}
