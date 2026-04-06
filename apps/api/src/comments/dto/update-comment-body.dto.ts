import { IsString, MinLength } from 'class-validator';

export class UpdateCommentBodyDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
