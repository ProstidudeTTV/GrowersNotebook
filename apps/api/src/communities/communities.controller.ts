import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(@CurrentUser() user?: JwtUser) {
    return this.communities.list(user?.sub);
  }

  @Get('me/following')
  @UseGuards(SupabaseAuthGuard)
  listFollowed(@CurrentUser() user?: JwtUser) {
    if (!user?.sub) throw new UnauthorizedException();
    return this.communities.listFollowed(user.sub);
  }

  @Get(':slug')
  @UseGuards(OptionalAuthGuard)
  bySlug(@Param('slug') slug: string, @CurrentUser() user?: JwtUser) {
    return this.communities.getBySlug(slug, user?.sub);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() dto: CreateCommunityDto) {
    return this.communities.create(dto);
  }
}
