import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListNotebooksQueryDto {
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
  pageSize = 24;

  @IsOptional()
  @IsIn(['active', 'completed', 'archived'])
  status?: 'active' | 'completed' | 'archived';

  @IsOptional()
  @IsIn(['hot', 'updated'])
  sort?: 'hot' | 'updated';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  grower?: string;

  @IsOptional()
  @IsString()
  breeder?: string;

  @IsOptional()
  @IsString()
  strainSlug?: string;
}
