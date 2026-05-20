import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ListStrainsQueryDto } from './dto/list-catalog.query.dto';
import { UpsertCatalogReviewDto } from './dto/upsert-catalog-review.dto';
import { StrainsService } from './strains.service';

@Controller('strains')
export class PublicStrainsController {
  constructor(private readonly strains: StrainsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(@Query() query: ListStrainsQueryDto) {
    const minRating =
      query.minRating != null ? Number(query.minRating) : NaN;
    const minReviews =
      query.minReviews != null ? Number(query.minReviews) : NaN;
    const c = query.chemotype?.trim().toLowerCase();
    const chemotype =
      c === 'indica' || c === 'sativa' || c === 'hybrid' ? c : undefined;
    const af = query.autoflower?.trim().toLowerCase();
    const autoflower =
      af === '1' || af === 'true' || af === 'yes' ? true : undefined;
    const sortRaw = query.sort?.trim().toLowerCase();
    const sort =
      sortRaw === 'rating'
        ? 'rating'
        : sortRaw === 'reviews'
          ? 'reviews'
          : 'name';
    const effectsRaw = query.effects?.trim();
    const effects = effectsRaw
      ? effectsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return this.strains.listPublic({
      q: query.q,
      sort,
      breederId: query.breederId,
      breederSlug: query.breederSlug,
      chemotype,
      autoflower,
      genetics: query.genetics,
      effects,
      minRating:
        Number.isFinite(minRating) && minRating >= 1 && minRating <= 5
          ? minRating
          : undefined,
      minReviews:
        Number.isFinite(minReviews) && minReviews >= 1 ? minReviews : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':slug')
  @UseGuards(OptionalAuthGuard)
  getOne(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser | undefined,
    @Query('reviewsPage') reviewsPage?: string,
    @Query('reviewsPageSize') reviewsPageSize?: string,
  ) {
    return this.strains.getBySlugPublic(
      slug,
      user?.sub,
      reviewsPage ? Number(reviewsPage) : 1,
      reviewsPageSize ? Number(reviewsPageSize) : 20,
    );
  }

  @Put(':slug/reviews')
  @UseGuards(SupabaseAuthGuard)
  putReview(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
    @Body() body: UpsertCatalogReviewDto,
  ) {
    return this.strains.upsertReview(
      slug,
      user.sub,
      body.rating,
      body.body ?? '',
      body.subRatings,
      body.media,
    );
  }

  @Delete(':slug/reviews')
  @UseGuards(SupabaseAuthGuard)
  deleteReview(@Param('slug') slug: string, @CurrentUser() user: JwtUser) {
    return this.strains.deleteOwnReview(slug, user.sub);
  }
}
