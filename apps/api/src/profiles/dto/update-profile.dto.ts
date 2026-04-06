import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  profilePublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showGrowerStatsPublic?: boolean;
}
