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
import type { Response } from 'express';
import type { JwtUser } from '../auth/jwt-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { BreedersService } from './breeders.service';
import { CatalogReviewModerationService } from './catalog-review-moderation.service';
import { CatalogSuggestionsService } from './catalog-suggestions.service';
import { ModerateSuggestionDto } from './dto/moderate-suggestion.dto';
import { StrainsService } from './strains.service';

function range(skip: string | undefined, take: string | undefined) {
  const start = Math.max(0, Number(skip ?? 0));
  const end = Math.max(start + 1, Number(take ?? start + 10));
  return { start, end, skip: start, take: end - start };
}

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminCatalogController {
  constructor(
    private readonly breeders: BreedersService,
    private readonly strains: StrainsService,
    private readonly suggestions: CatalogSuggestionsService,
    private readonly reviewMod: CatalogReviewModerationService,
  ) {}

  @Get('strains')
  async listStrains(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.strains.listPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('strains')
  createStrain(
    @Body()
    body: {
      slug: string;
      name: string;
      description?: string | null;
      breederId?: string | null;
      effects?: string[];
      effectsNotes?: string | null;
      published?: boolean;
    },
  ) {
    return this.strains.createAdmin(body);
  }

  @Get('strains/:id')
  async getStrain(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.strains.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch('strains/:id')
  patchStrain(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      slug: string;
      name: string;
      description: string | null;
      breederId: string | null;
      effects: string[];
      effectsNotes: string | null;
      published: boolean;
    }>,
  ) {
    return this.strains.updateAdmin(id, body);
  }

  @Delete('strains/:id')
  deleteStrain(@Param('id', ParseUUIDPipe) id: string) {
    return this.strains.deleteAdmin(id);
  }

  @Get('breeders')
  async listBreeders(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.breeders.listPaged(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('breeders')
  createBreeder(
    @Body()
    body: {
      slug: string;
      name: string;
      description?: string | null;
      website?: string | null;
      country?: string | null;
      published?: boolean;
    },
  ) {
    return this.breeders.createAdmin(body);
  }

  @Get('breeders/:id')
  async getBreeder(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.breeders.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  @Patch('breeders/:id')
  patchBreeder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      slug: string;
      name: string;
      description: string | null;
      website: string | null;
      country: string | null;
      published: boolean;
    }>,
  ) {
    return this.breeders.updateAdmin(id, body);
  }

  @Delete('breeders/:id')
  deleteBreeder(@Param('id', ParseUUIDPipe) id: string) {
    return this.breeders.deleteAdmin(id);
  }

  @Get('catalog-suggestions')
  async listSuggestions(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Query('status') status: 'pending' | 'approved' | 'rejected' | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.suggestions.listPaged(skip, take, status);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Patch('catalog-suggestions/:id')
  moderateSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: ModerateSuggestionDto,
  ) {
    if (body.action === 'approve') {
      return this.suggestions.approve(id, user.sub);
    }
    return this.suggestions.reject(id, user.sub, body.rejectReason);
  }

  @Get('strain-reviews')
  async listStrainReviews(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Query('hiddenOnly') hiddenOnly: string | undefined,
    @Query('strainId') strainId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.reviewMod.listStrainReviewsPaged(
      skip,
      take,
      {
        hiddenOnly: hiddenOnly === 'true',
        strainId,
      },
    );
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('strain-reviews/:id/hide')
  hideStrainReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: { reason?: string | null },
  ) {
    return this.reviewMod.hideStrainReview(id, user.sub, body?.reason);
  }

  @Post('strain-reviews/:id/restore')
  restoreStrainReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewMod.restoreStrainReview(id);
  }

  @Get('breeder-reviews')
  async listBreederReviews(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Query('hiddenOnly') hiddenOnly: string | undefined,
    @Query('breederId') breederId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.reviewMod.listBreederReviewsPaged(
      skip,
      take,
      {
        hiddenOnly: hiddenOnly === 'true',
        breederId,
      },
    );
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('breeder-reviews/:id/hide')
  hideBreederReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: { reason?: string | null },
  ) {
    return this.reviewMod.hideBreederReview(id, user.sub, body?.reason);
  }

  @Post('breeder-reviews/:id/restore')
  restoreBreederReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewMod.restoreBreederReview(id);
  }
}
