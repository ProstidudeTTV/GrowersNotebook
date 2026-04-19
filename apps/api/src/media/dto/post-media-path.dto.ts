import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PostMediaPathDto {
  @IsString()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresSec?: number;
}

export class StripVideoDto {
  @IsString()
  @MaxLength(512)
  path!: string;

  @IsIn(['video/mp4', 'video/webm', 'video/quicktime'])
  contentType!: 'video/mp4' | 'video/webm' | 'video/quicktime';
}
