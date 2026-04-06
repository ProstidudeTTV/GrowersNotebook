import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertCatalogReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  body?: string;
}
