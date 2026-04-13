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
import { UpsertCatalogReviewDto } from './dto/upsert-catalog-review.dto';
import { StrainsService } from './strains.service';

@Controller('strains')
export class PublicStrainsController {
  constructor(private readonly strains: StrainsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Query('q') q?: string,
    @Query('sort') sort?: 'name' | 'rating',
    @Query('breederId') breederId?: string,
    @Query('breederSlug') breederSlug?: string,
    @Query('minRating') minRatingRaw?: string,
    @Query('minReviews') minReviewsRaw?: string,
    @Query('chemotype') chemotypeRaw?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const minRating = minRatingRaw != null ? Number(minRatingRaw) : NaN;
    const minReviews = minReviewsRaw != null ? Number(minReviewsRaw) : NaN;
    const c = chemotypeRaw?.trim().toLowerCase();
    const chemotype =
      c === 'indica' || c === 'sativa' || c === 'hybrid' ? c : undefined;
    return this.strains.listPublic({
      q,
      sort: sort === 'rating' ? 'rating' : 'name',
      breederId,
      breederSlug,
      chemotype,
      minRating:
        Number.isFinite(minRating) && minRating >= 1 && minRating <= 5
          ? minRating
          : undefined,
      minReviews:
        Number.isFinite(minReviews) && minReviews >= 1 ? minReviews : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
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
