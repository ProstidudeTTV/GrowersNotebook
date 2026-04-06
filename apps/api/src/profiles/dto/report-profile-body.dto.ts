import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportProfileBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
