import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminDismissReportDto {
  @IsOptional()
  @IsString()
  reporterNote?: string;

  /** When omitted, treated as false. */
  @IsOptional()
  @IsBoolean()
  notifyReported?: boolean;

  @IsOptional()
  @IsString()
  reportedWarning?: string;
}
