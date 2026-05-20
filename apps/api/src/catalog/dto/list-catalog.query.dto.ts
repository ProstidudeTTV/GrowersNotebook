import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListCatalogQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 24;

  @IsOptional()
  @IsIn(['name', 'rating', 'reviews'])
  sort?: 'name' | 'rating' | 'reviews';
}

export class ListStrainsQueryDto extends ListCatalogQueryDto {
  @IsOptional()
  @IsString()
  breederId?: string;

  @IsOptional()
  @IsString()
  breederSlug?: string;

  @IsOptional()
  @IsString()
  minRating?: string;

  @IsOptional()
  @IsString()
  minReviews?: string;

  @IsOptional()
  @IsString()
  chemotype?: string;

  @IsOptional()
  @IsString()
  autoflower?: string;

  @IsOptional()
  @IsString()
  genetics?: string;

  /** Comma-separated effect tags; strain must include all listed tags. */
  @IsOptional()
  @IsString()
  effects?: string;
}

export class ListBreedersQueryDto extends ListCatalogQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  minRating?: string;

  @IsOptional()
  @IsString()
  minReviews?: string;
}
