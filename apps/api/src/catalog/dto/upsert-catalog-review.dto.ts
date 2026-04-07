import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
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

export class UpsertCatalogReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  body?: string;

  /** Strain reviews only (ignored for breeder reviews). Max 8 https image URLs. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CatalogReviewImageDto)
  media?: CatalogReviewImageDto[];
}
