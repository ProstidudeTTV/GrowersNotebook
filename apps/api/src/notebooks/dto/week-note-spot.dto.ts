import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WeekNoteSpotDto {
  @IsString()
  @MaxLength(12_000)
  body!: string;

  /** ISO-8601; preserved when OP does not change the text for this slot. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  at?: string;
}
