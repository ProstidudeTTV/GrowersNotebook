import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class WeekWateringLineDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  volumeLiters?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
