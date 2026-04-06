import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { FollowsService } from '../follows/follows.service';
import { ProfilesService } from '../profiles/profiles.service';
import { MatrixService } from './matrix.service';

@Controller('matrix')
export class MatrixController {
  constructor(
    private readonly matrix: MatrixService,
    private readonly follows: FollowsService,
    private readonly profiles: ProfilesService,
  ) {}

  /** Create Synapse user if needed and push current Growers display name. */
  private async ensureMessagingUserWithDisplayName(profileId: string) {
    await this.matrix.ensureSynapseUser(profileId);
    const p = await this.profiles.findById(profileId);
    await this.matrix.syncHomeserverDisplayName(profileId, p?.displayName ?? null);
  }

  @Post('ensure-account')
  @UseGuards(SupabaseAuthGuard)
  async ensureAccount(@CurrentUser() user: JwtUser) {
    if (!this.matrix.matrixConfigured()) {
      throw new ServiceUnavailableException(
        'Messaging is not available on this server.',
      );
    }
    await this.ensureMessagingUserWithDisplayName(user.sub);
    return { ok: true as const };
  }

  @Post('ensure-peer')
  @UseGuards(SupabaseAuthGuard)
  async ensurePeer(
    @CurrentUser() user: JwtUser,
    @Body() body: { peerProfileId?: string },
  ) {
    if (!this.matrix.matrixConfigured()) {
      throw new ServiceUnavailableException(
        'Messaging is not available on this server.',
      );
    }
    const peer = body?.peerProfileId?.trim();
    if (!peer) {
      throw new BadRequestException('peerProfileId is required.');
    }
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(peer)) {
      throw new BadRequestException('Invalid peer id.');
    }
    if (peer === user.sub) {
      throw new BadRequestException('Cannot open a chat with yourself.');
    }
    const allowed = await this.follows.getFollowingUserIds(user.sub, [peer]);
    if (!allowed.has(peer)) {
      throw new ForbiddenException(
        'You can only start a chat with someone you follow.',
      );
    }
    await this.ensureMessagingUserWithDisplayName(user.sub);
    await this.ensureMessagingUserWithDisplayName(peer);
    return { ok: true as const };
  }

  @Post('login-token')
  @UseGuards(SupabaseAuthGuard)
  async loginToken(@CurrentUser() user: JwtUser) {
    if (!this.matrix.matrixConfigured()) {
      throw new ServiceUnavailableException(
        'Messaging is not available on this server.',
      );
    }
    await this.ensureMessagingUserWithDisplayName(user.sub);
    const { jwt, expiresInSec } = await this.matrix.mintLoginJwt(user.sub);
    return {
      homeserverUrl: this.matrix.homeserverUrlForClient(),
      userId: this.matrix.mxidForUserId(user.sub),
      jwt,
      expiresIn: expiresInSec,
    };
  }
}
