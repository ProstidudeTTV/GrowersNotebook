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
const ROOM_TYPES = ['indoor', 'outdoor', 'greenhouse'] as const;
const WATERING_TYPES = ['manual', 'drip', 'hydro', 'aeroponic'] as const;
const START_TYPES = ['seed', 'clone', 'seedling'] as const;

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

/** Admin creates a notebook for any user (requires `ownerId`). */
export class CreateNotebookAdminDto extends CreateNotebookDto {
  @IsUUID()
  ownerId!: string;
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

  @IsOptional()
  @IsIn([...ROOM_TYPES])
  roomType?: (typeof ROOM_TYPES)[number] | null;

  @IsOptional()
  @IsIn([...WATERING_TYPES])
  wateringType?: (typeof WATERING_TYPES)[number] | null;

  @IsOptional()
  @IsIn([...START_TYPES])
  startType?: (typeof START_TYPES)[number] | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  setupNotes?: string | null;

  @IsOptional()
  @Type(() => Date)
  setupWizardCompletedAt?: Date | null;
}
