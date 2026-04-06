import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { NotificationsService } from './notifications.service';

function range(skip: string | undefined, take: string | undefined) {
  const start = Math.max(0, Number(skip ?? 0));
  const end = Math.max(start + 1, Number(take ?? start + 50));
  return { skip: start, take: end - start };
}

@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Summary for nav badge (no pagination). */
  @Get('me/summary')
  async summary(@CurrentUser() user: JwtUser) {
    const unreadCount = await this.notifications.countUnread(user.sub);
    return { unreadCount };
  }

  @Get('me')
  async listMine(
    @CurrentUser() user: JwtUser,
    @Query('_start') _start: string,
    @Query('_end') _end: string,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.notifications.listForUser(
      user.sub,
      skip,
      take,
    );
    const unreadCount = await this.notifications.countUnread(user.sub);
    return { items: rows, total, unreadCount };
  }

  @Patch('me/read-all')
  async readAll(@CurrentUser() user: JwtUser) {
    await this.notifications.markAllRead(user.sub);
    return { ok: true };
  }

  @Patch('me/:id/read')
  async readOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.notifications.markRead(user.sub, id);
    if (!row) throw new NotFoundException();
    return row;
  }
}
