import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { BlocksService } from './blocks.service';

@Controller('blocks')
@UseGuards(SupabaseAuthGuard)
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Get('me')
  listMine(@CurrentUser() user: JwtUser) {
    return this.blocks.listBlockedWithDisplay(user.sub);
  }

  @Post(':userId')
  block(
    @CurrentUser() user: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.blocks.block(user.sub, userId);
  }

  @Delete(':userId')
  unblock(
    @CurrentUser() user: JwtUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.blocks.unblock(user.sub, userId);
  }
}
