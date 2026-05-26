import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const PROFILE_ROLES = ['member', 'moderator', 'admin', 'owner'] as const;

export class AdminUpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(80)
  displayName?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(PROFILE_ROLES)
  role?: (typeof PROFILE_ROLES)[number];

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsISO8601()
  bannedAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsISO8601()
  banExpiresAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsISO8601()
  suspendedUntil?: string | null;
}
