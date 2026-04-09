import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { WeekNutrientLineDto } from './week-nutrient-line.dto';
import { WeekNoteSpotDto } from './week-note-spot.dto';

export class CreateNotebookWeekDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weekIndex!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  notes?: string | null;

  /** Up to three timestamped note blocks (mid-week updates). Preferred over `notes`. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => WeekNoteSpotDto)
  noteSpots?: WeekNoteSpotDto[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  tempC?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  humidityPct?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ph?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ec?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ppm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  waterNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  waterVolumeLiters?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lightCycle?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsBoolean()
  copyNutrientsFromPreviousWeek?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeekNutrientLineDto)
  nutrients?: WeekNutrientLineDto[];
}

export class UpdateNotebookWeekDto {
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => WeekNoteSpotDto)
  noteSpots?: WeekNoteSpotDto[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  tempC?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  humidityPct?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ph?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ec?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ppm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  waterNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  waterVolumeLiters?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lightCycle?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeekNutrientLineDto)
  nutrients?: WeekNutrientLineDto[];
}
