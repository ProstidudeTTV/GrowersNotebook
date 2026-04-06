import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNameBlocklistBulkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  raw!: string;
}
