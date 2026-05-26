import { IsUUID } from 'class-validator';

export class CommunityModeratorDto {
  @IsUUID()
  moderatorId!: string;
}
