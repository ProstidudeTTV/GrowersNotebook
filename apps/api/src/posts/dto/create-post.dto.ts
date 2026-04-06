import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PostMediaItemDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;

  @IsIn(['image', 'video'])
  type!: 'image' | 'video';
}

export class CreatePostDto {
  /** Omit for a profile post (`community_id` null). */
  @IsOptional()
  @IsUUID()
  communityId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsObject()
  bodyJson!: Record<string, unknown>;

  @IsString()
  bodyHtml!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PostMediaItemDto)
  media?: PostMediaItemDto[];
}
