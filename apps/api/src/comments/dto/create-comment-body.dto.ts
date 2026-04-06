import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommentBodyDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
