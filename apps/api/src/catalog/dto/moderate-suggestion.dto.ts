import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ModerateSuggestionDto {
  @IsEnum(['approve', 'reject'] as const)
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  rejectReason?: string | null;
}
