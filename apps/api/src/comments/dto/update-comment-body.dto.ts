import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const COMMENT_IMAGE_MAX = 8;

export class UpdateCommentBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(COMMENT_IMAGE_MAX)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(2048, { each: true })
  imageUrls?: string[];
}
