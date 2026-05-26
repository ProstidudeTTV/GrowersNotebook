import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  new_comment?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  new_follower?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  vote_milestone?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  direct_message?: boolean;
}

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
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  bannerUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  profilePublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showGrowerStatsPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showNotebooksPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showFollowListsPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  mailingListOptIn?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
