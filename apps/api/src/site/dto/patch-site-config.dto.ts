import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

function emptyToNull(v: unknown): unknown {
  if (v === '') return null;
  return v;
}

export class PatchSiteConfigDto {
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(500)
  motdText?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(200)
  announcementTitle?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(4000)
  announcementBody?: string | null;

  @IsOptional()
  @IsIn(['info', 'warning'])
  announcementStyle?: 'info' | 'warning';

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsISO8601()
  announcementStartsAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsISO8601()
  announcementEndsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  announcementEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  maintenanceEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(2000)
  maintenanceMessage?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(200)
  seoDefaultTitle?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(500)
  seoDefaultDescription?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(2000)
  seoKeywords?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2000)
  ogImageUrl?: string | null;
}
