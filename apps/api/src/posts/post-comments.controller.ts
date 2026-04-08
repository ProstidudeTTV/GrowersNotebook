import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CommentsService } from '../comments/comments.service';
import { CreateCommentBodyDto } from '../comments/dto/create-comment-body.dto';
import { ReportCommentBodyDto } from '../comments/dto/report-comment-body.dto';
import { UpdateCommentBodyDto } from '../comments/dto/update-comment-body.dto';
import { CurrentUser } from '../common/current-user.decorator';

/**
 * Nested under `posts/:postId/comments` so routes never compete with `GET /posts/:id`.
 */
@Controller('posts/:postId/comments')
export class PostCommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.comments.listForPost(postId, user?.sub);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCommentBodyDto,
  ) {
    return this.comments.create(user.sub, {
      postId,
      parentId: dto.parentId ?? null,
      body: dto.body,
      imageUrls: dto.imageUrls,
    });
  }

  @Patch(':commentId')
  @UseGuards(SupabaseAuthGuard)
  update(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateCommentBodyDto,
  ) {
    return this.comments.updateComment(user.sub, postId, commentId, {
      body: dto.body,
      imageUrls: dto.imageUrls,
    });
  }

  @Delete(':commentId')
  @UseGuards(SupabaseAuthGuard)
  remove(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.comments.deleteComment(user.sub, postId, commentId);
  }

  @Post(':commentId/report')
  @UseGuards(SupabaseAuthGuard)
  report(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: ReportCommentBodyDto,
  ) {
    return this.comments.reportComment(
      user.sub,
      postId,
      commentId,
      dto.reason,
    );
  }
}
