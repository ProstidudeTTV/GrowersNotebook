import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNameBlocklistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  term!: string;
}
