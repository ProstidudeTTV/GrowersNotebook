import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

const NOTEBOOK_COMMENT_IMAGE_MAX = 8;

export class CreateNotebookCommentDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(NOTEBOOK_COMMENT_IMAGE_MAX)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(2048, { each: true })
  imageUrls?: string[];
}
