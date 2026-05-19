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
  @IsIn(['name', 'rating'])
  sort?: 'name' | 'rating';
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
