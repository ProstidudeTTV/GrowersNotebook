import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { COMMUNITY_ICON_KEYS } from '../community-icon-keys';

const ICON_OPTIONS = [...COMMUNITY_ICON_KEYS];

export class UpdateCommunityAdminDto {
  /**
   * Admin UI (Refine) sends the full form including immutable `slug`.
   * It is whitelisted here but ignored by {@link CommunitiesService.update}.
   */
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v != null)
  @IsIn(ICON_OPTIONS)
  iconKey?: string | null;
}
