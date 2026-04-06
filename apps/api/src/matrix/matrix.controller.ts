import {
  Controller,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { MatrixService } from './matrix.service';

@Controller('matrix')
export class MatrixController {
  constructor(private readonly matrix: MatrixService) {}

  @Post('login-token')
  @UseGuards(SupabaseAuthGuard)
  async loginToken(@CurrentUser() user: JwtUser) {
    if (!this.matrix.matrixConfigured()) {
      throw new ServiceUnavailableException(
        'Messaging is not available on this server.',
      );
    }
    await this.matrix.ensureSynapseUser(user.sub);
    const { jwt, expiresInSec } = await this.matrix.mintLoginJwt(user.sub);
    return {
      homeserverUrl: this.matrix.homeserverUrlForClient(),
      userId: this.matrix.mxidForUserId(user.sub),
      jwt,
      expiresIn: expiresInSec,
    };
  }
}
