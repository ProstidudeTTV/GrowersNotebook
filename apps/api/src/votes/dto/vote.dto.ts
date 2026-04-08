import { Type } from 'class-transformer';
import { IsIn, IsUUID } from 'class-validator';

export class VotePostDto {
  @IsUUID()
  postId!: string;

  @Type(() => Number)
  @IsIn([-1, 1])
  value!: -1 | 1;
}

export class VoteNotebookDto {
  @IsUUID()
  notebookId!: string;

  @Type(() => Number)
  @IsIn([-1, 1])
  value!: -1 | 1;
}

export class VoteCommentDto {
  @IsUUID()
  commentId!: string;

  @Type(() => Number)
  @IsIn([-1, 1])
  value!: -1 | 1;
}
