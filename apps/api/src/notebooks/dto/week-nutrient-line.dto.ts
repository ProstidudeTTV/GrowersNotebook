import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class WeekNutrientLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  dosage?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
