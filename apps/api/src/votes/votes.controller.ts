import {
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CommentsService } from '../comments/comments.service';
import { CurrentUser } from '../common/current-user.decorator';
import { PostsService } from '../posts/posts.service';
import { VoteCommentDto, VoteNotebookDto, VotePostDto } from './dto/vote.dto';
import { VotesService } from './votes.service';

@Controller('votes')
export class VotesController {
  constructor(
    private readonly votes: VotesService,
    private readonly posts: PostsService,
    private readonly comments: CommentsService,
  ) {}

  @Post('post')
  @UseGuards(SupabaseAuthGuard)
  async votePost(@CurrentUser() user: JwtUser, @Body() dto: VotePostDto) {
    const result = await this.votes.votePost(user.sub, dto.postId, dto.value);
    const post = await this.posts.getById(dto.postId, user.sub);
    return {
      ...result,
      score: post.score,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      viewerVote: post.viewerVote,
    };
  }

  @Post('notebook')
  @UseGuards(SupabaseAuthGuard)
  voteNotebook(@CurrentUser() user: JwtUser, @Body() dto: VoteNotebookDto) {
    return this.votes.voteNotebook(user.sub, dto.notebookId, dto.value);
  }

  @Post('comment')
  @UseGuards(SupabaseAuthGuard)
  async voteComment(@CurrentUser() user: JwtUser, @Body() dto: VoteCommentDto) {
    const result = await this.votes.voteComment(
      user.sub,
      dto.commentId,
      dto.value,
    );
    const row = await this.comments.getCommentWithMetrics(
      dto.commentId,
      user.sub,
    );
    if (!row) throw new NotFoundException('Comment not found');
    return {
      ...result,
      score: row.score,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      viewerVote: row.viewerVote,
    };
  }

  @Delete('post/:postId')
  @UseGuards(SupabaseAuthGuard)
  removePostVote(
    @CurrentUser() user: JwtUser,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.votes.removePostVote(user.sub, postId);
  }
}