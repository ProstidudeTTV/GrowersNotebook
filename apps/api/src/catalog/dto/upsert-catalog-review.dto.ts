import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class CatalogReviewImageDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;

  @IsIn(['image'])
  type!: 'image';
}

class CatalogSubRatingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  effects?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  flavor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  potency?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  taste?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  aroma?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  onset?: number;
}

export class UpsertCatalogReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  body?: string;

  /** Optional 1–5 scores for Effects, Flavor, etc. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CatalogSubRatingsDto)
  subRatings?: CatalogSubRatingsDto;

  /** Strain reviews only (ignored for breeder reviews). Max 8 https image URLs. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CatalogReviewImageDto)
  media?: CatalogReviewImageDto[];
}
