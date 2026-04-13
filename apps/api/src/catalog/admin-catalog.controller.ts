import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
import { StrainCsvImportService } from './strain-csv-import.service';
import { ProfilesService } from '../profiles/profiles.service';
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
    private readonly strainCsvImport: StrainCsvImportService,
    private readonly profiles: ProfilesService,
  ) {}

  @Get('strains')
  async listStrains(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Query('q') q: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.strains.listPaged(skip, take, {
      q: q?.trim() || undefined,
    });
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Post('strains')
  @Roles('admin')
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
  async patchStrain(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
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
    const actor = await this.profiles.findById(user.sub);
    if (actor?.role === 'moderator') {
      const keys = Object.keys(body ?? {}).filter(
        (k) => (body as Record<string, unknown>)[k] !== undefined,
      );
      const ok =
        keys.length > 0 && keys.every((k) => k === 'published');
      if (!ok) {
        throw new ForbiddenException(
          'Moderators may only change the published flag on strains.',
        );
      }
    }
    return this.strains.updateAdmin(id, body);
  }

  @Delete('strains/:id')
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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

  @Get('catalog-suggestions/:id')
  async getSuggestion(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.suggestions.findById(id);
    if (!row) throw new NotFoundException();
    return row;
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

  @Post('catalog/import-strains-csv')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 45 * 1024 * 1024 },
    }),
  )
  async importStrainsCsv(
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const buf = file?.buffer;
    if (!buf?.length) {
      throw new BadRequestException(
        'Upload a CSV file (field name: file). If this persists, try a smaller file or run pnpm db:import-strains from apps/api.',
      );
    }
    const name = (file?.originalname || '').toLowerCase();
    if (!name.includes('.csv')) {
      throw new BadRequestException('File name should include .csv');
    }
    const text = buf.toString('utf8');
    return await this.strainCsvImport.importFromCsvText(text);
  }
}
