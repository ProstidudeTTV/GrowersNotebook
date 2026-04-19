import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfilesService } from '../profiles/profiles.service';
import {
  type JwtUser,
  mailingListOptInFromJwt,
  preferredProfileDisplayName,
} from './jwt-user';
import { verifySupabaseAccessToken } from './verify-supabase-access-token';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly profiles: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtUser; headers: { authorization?: string } }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice(7);
    let payload: JwtUser;
    try {
      payload = await verifySupabaseAccessToken(token, this.config);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`JWT verification failed: ${msg}`);
      throw new UnauthorizedException('Invalid token');
    }
    if (!payload.sub) throw new UnauthorizedException('Invalid token');
    await this.profiles.ensureProfile(
      payload.sub,
      payload.email ?? null,
      preferredProfileDisplayName(payload),
      mailingListOptInFromJwt(payload),
    );
    await this.profiles.enforceActiveAccountOrThrow(payload.sub);
    request.user = payload;
    return true;
  }
}
