import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function emptyToNull(v: unknown): unknown {
  if (v === '') return null;
  return v;
}

/** Optional overrides for a send; defaults come from saved site_config when omitted. */
export class SendMaintenanceEmailDto {
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(300)
  emailSubject?: string | null;

  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(8000)
  emailBody?: string | null;

  /** Used only when composing the legacy default email (no custom emailBody). */
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(2000)
  maintenanceMessage?: string | null;
}
