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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CreateNameBlocklistBulkDto } from './dto/create-name-blocklist-bulk.dto';
import { CreateNameBlocklistDto } from './dto/create-name-blocklist.dto';
import { NameBlocklistService } from '../name-blocklist/name-blocklist.service';
import type { Request, Response } from 'express';
import { AuditService } from '../audit/audit.service';
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
@Roles('admin', 'moderator')
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

  private clientIp(req: Request): string | null {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0]?.trim() ?? null;
    }
    return req.socket.remoteAddress ?? null;
  }

  private async staffAudit(
    actor: JwtUser,
    req: Request,
    row: {
      action: string;
      entityType?: string | null;
      entityId?: string | null;
      subjectProfileId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    const prof = await this.profiles.findById(actor.sub);
    await this.audit.append({
      actorProfileId: actor.sub,
      actorRole: prof?.role ?? null,
      action: row.action,
      entityType: row.entityType ?? null,
      entityId: row.entityId ?? null,
      subjectProfileId: row.subjectProfileId ?? null,
      metadata: row.metadata ?? {},
      ip: this.clientIp(req),
    });
  }

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
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      actorProfileId: r.actorProfileId,
      actorRole: r.actorRole,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      subjectProfileId: r.subjectProfileId,
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
  async deletePost(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.posts.deleteAdmin(id);
    await this.staffAudit(user, req, {
      action: 'post.admin_delete',
      entityType: 'post',
      entityId: id,
      metadata: {},
    });
    return row;
  }

  @Post('posts/:id/remove')
  async removePost(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminRemovePostDto,
  ) {
    const row = await this.posts.removePostAdmin(id, {
      notifyAuthor: body.notifyAuthor,
      reason: body.reason,
    });
    await this.staffAudit(user, req, {
      action: 'post.admin_remove',
      entityType: 'post',
      entityId: id,
      metadata: {
        notifyAuthor: body.notifyAuthor,
        reason: body.reason,
      },
    });
    return row;
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
  moderationSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.moderationSummaryAdmin(id);
  }

  @Get('profiles/:id')
  async getProfile(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.profiles.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch('profiles/:id')
  async patchProfile(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
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
    const row = await this.profiles.updateAdmin(id, body);
    await this.staffAudit(user, req, {
      action: 'profile.admin_patch',
      entityType: 'profile',
      entityId: id,
      subjectProfileId: id,
      metadata: { body },
    });
    return row;
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

  @Patch('comment-reports/:id/dismiss')
  async dismissCommentReport(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminDismissReportDto,
  ) {
    const row = await this.comments.dismissCommentReport(id, {
      reporterNote: body.reporterNote,
      notifyReported: body.notifyReported === true,
      reportedWarning: body.reportedWarning,
    });
    await this.staffAudit(user, req, {
      action: 'comment_report.dismiss',
      entityType: 'comment_report',
      entityId: id,
      metadata: {
        notifyReported: body.notifyReported === true,
        reportedWarning: body.reportedWarning,
      },
    });
    return row;
  }

  @Delete('comments/:commentId')
  async deleteCommentAdmin(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    const row = await this.comments.deleteCommentAdmin(commentId);
    await this.staffAudit(user, req, {
      action: 'comment.admin_delete',
      entityType: 'comment',
      entityId: commentId,
      metadata: {},
    });
    return row;
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

  @Patch('profile-reports/:id/dismiss')
  async dismissProfileReport(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminDismissReportDto,
  ) {
    const row = await this.profiles.dismissProfileReport(id, {
      reporterNote: body.reporterNote,
      notifyReported: body.notifyReported === true,
      reportedWarning: body.reportedWarning,
    });
    await this.staffAudit(user, req, {
      action: 'profile_report.dismiss',
      entityType: 'profile_report',
      entityId: id,
      metadata: {
        notifyReported: body.notifyReported === true,
        reportedWarning: body.reportedWarning,
      },
    });
    return row;
  }
}
