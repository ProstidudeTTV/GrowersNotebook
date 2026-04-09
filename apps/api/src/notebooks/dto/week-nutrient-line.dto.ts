import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class WeekNutrientLineDto {
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const t = value.trim();
      return t === '' ? null : t;
    }
    return value;
  })
  @IsOptional()
  @ValidateIf((_o, v) => v != null && String(v).length > 0)
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
