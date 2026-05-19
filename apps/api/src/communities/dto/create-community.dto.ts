import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { COMMUNITY_ICON_KEYS } from '../community-icon-keys';

const ICON_OPTIONS = [...COMMUNITY_ICON_KEYS];

export class CreateCommunityDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase slug format',
  })
  slug!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v != null)
  @IsIn(ICON_OPTIONS)
  iconKey?: string | null;

  @IsOptional()
  @IsString()
  bannerUrl?: string;
}
