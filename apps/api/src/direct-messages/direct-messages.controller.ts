import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { DirectMessagesService } from './direct-messages.service';
import { ListDmMessagesQueryDto } from './dto/list-messages.query.dto';
import { OpenDmThreadDto } from './dto/open-thread.dto';
import { PostDmMessageDto } from './dto/post-dm-message.dto';

@Controller('direct-messages')
@UseGuards(SupabaseAuthGuard)
export class DirectMessagesController {
  constructor(private readonly dm: DirectMessagesService) {}

  @Post('threads/open')
  openThread(@CurrentUser() user: JwtUser, @Body() body: OpenDmThreadDto) {
    return this.dm.openThread(user.sub, body.peerProfileId);
  }

  @Get('threads')
  listThreads(@CurrentUser() user: JwtUser) {
    return this.dm.listThreads(user.sub);
  }

  @Get('threads/:threadId/messages')
  listMessages(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: JwtUser,
    @Query() query: ListDmMessagesQueryDto,
  ) {
    return this.dm.listMessages(threadId, user.sub, query.limit, query.before);
  }

  @Post('threads/:threadId/messages')
  postMessage(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: JwtUser,
    @Body() body: PostDmMessageDto,
  ) {
    return this.dm.postMessage(threadId, user.sub, {
      body: body.body?.trim() ?? '',
      imageUrl: body.imageUrl?.trim() || undefined,
      imageUrls: body.imageUrls,
    });
  }

  @Post('threads/:threadId/read')
  async markRead(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser() user: JwtUser,
  ) {
    await this.dm.markRead(threadId, user.sub);
    return { ok: true as const };
  }
}
