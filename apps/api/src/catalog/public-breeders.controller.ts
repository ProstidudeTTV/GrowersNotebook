import {
  Body,
  Controller,
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
import { BreedersService } from './breeders.service';
import { UpsertCatalogReviewDto } from './dto/upsert-catalog-review.dto';

@Controller('breeders')
export class PublicBreedersController {
  constructor(private readonly breeders: BreedersService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Query('q') q?: string,
    @Query('sort') sort?: 'name' | 'rating',
    @Query('country') country?: string,
    @Query('minRating') minRatingRaw?: string,
    @Query('minReviews') minReviewsRaw?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const minRating = minRatingRaw != null ? Number(minRatingRaw) : NaN;
    const minReviews = minReviewsRaw != null ? Number(minReviewsRaw) : NaN;
    return this.breeders.listPublic({
      q,
      sort: sort === 'rating' ? 'rating' : 'name',
      country: country?.trim() || undefined,
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
    return this.breeders.getBySlugPublic(
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
    return this.breeders.upsertReview(
      slug,
      user.sub,
      body.rating,
      body.body ?? '',
    );
  }
}
