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
import { BreedersService } from './breeders.service';
import { ListBreedersQueryDto } from './dto/list-catalog.query.dto';
import { UpsertCatalogReviewDto } from './dto/upsert-catalog-review.dto';

@Controller('breeders')
export class PublicBreedersController {
  constructor(private readonly breeders: BreedersService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(@Query() query: ListBreedersQueryDto) {
    const minRating =
      query.minRating != null ? Number(query.minRating) : NaN;
    const minReviews =
      query.minReviews != null ? Number(query.minReviews) : NaN;
    return this.breeders.listPublic({
      q: query.q,
      sort: query.sort === 'rating' ? 'rating' : 'name',
      country: query.country?.trim() || undefined,
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
    @Query('strainReviewsPage') strainReviewsPage?: string,
    @Query('strainReviewsPageSize') strainReviewsPageSize?: string,
  ) {
    return this.breeders.getBySlugPublic(
      slug,
      user?.sub,
      reviewsPage ? Number(reviewsPage) : 1,
      reviewsPageSize ? Number(reviewsPageSize) : 20,
      strainReviewsPage ? Number(strainReviewsPage) : 1,
      strainReviewsPageSize ? Number(strainReviewsPageSize) : 10,
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
      body.subRatings,
    );
  }

  @Delete(':slug/reviews')
  @UseGuards(SupabaseAuthGuard)
  deleteReview(@Param('slug') slug: string, @CurrentUser() user: JwtUser) {
    return this.breeders.deleteOwnReview(slug, user.sub);
  }
}
