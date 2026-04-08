import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const DM_IMAGE_MAX = 8;

export class PostDmMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;

  /** Multiple attachments (same `post-media` URLs as `imageUrl`). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DM_IMAGE_MAX)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  imageUrls?: string[];
}
