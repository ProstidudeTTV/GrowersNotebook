import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListPostsQueryDto {
  @IsUUID()
  communityId!: string;

  @IsOptional()
  @IsIn(['new', 'top', 'hot'])
  sort: 'new' | 'top' | 'hot' = 'new';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
