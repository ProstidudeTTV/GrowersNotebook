import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

const STATUSES = ['active', 'completed', 'archived'] as const;

export class CreateNotebookAdminDto extends CreateNotebookDto {
  @IsUUID()
  ownerId!: string;
}

export class CreateNotebookDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsUUID()
  strainId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customStrainLabel?: string | null;

  @IsOptional()
  @IsIn([...STATUSES])
  status?: (typeof STATUSES)[number];
}

export class UpdateNotebookDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUUID()
  strainId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customStrainLabel?: string | null;

  @IsOptional()
  @IsIn([...STATUSES])
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @Type(() => Date)
  completedAt?: Date | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  plantCount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  totalLightWatts?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  harvestDryWeightG?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  harvestQualityNotes?: string | null;
}
