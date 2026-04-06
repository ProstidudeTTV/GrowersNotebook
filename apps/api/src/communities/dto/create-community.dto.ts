import { IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase slug format',
  })
  slug!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}
