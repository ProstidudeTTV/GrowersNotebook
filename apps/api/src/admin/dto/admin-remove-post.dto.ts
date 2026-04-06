import { IsBoolean, IsString, MinLength, ValidateIf } from 'class-validator';

export class AdminRemovePostDto {
  @IsBoolean()
  notifyAuthor!: boolean;

  @ValidateIf((o: AdminRemovePostDto) => o.notifyAuthor)
  @IsString()
  @MinLength(1, { message: 'Reason is required when notifying the author' })
  reason?: string;
}
