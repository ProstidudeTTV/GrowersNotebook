import { IsUUID } from 'class-validator';

export class OpenDmThreadDto {
  @IsUUID()
  peerProfileId!: string;
}
