import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class ModerateSuggestionDto {
  @IsEnum(['approve', 'reject'] as const)
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  rejectReason?: string | null;

  /**
   * When approving, optional staff-edited payload (replaces stored suggestion
   * payload for the approval transaction only).
   */
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
