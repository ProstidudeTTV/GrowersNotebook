import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly profiles: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtUser; headers: { authorization?: string } }>();
    request.user = undefined;
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return true;

    const token = header.slice(7);
    try {
      const payload = await verifySupabaseAccessToken(token, this.config);
      if (payload.sub) {
        await this.profiles.ensureProfile(
          payload.sub,
          payload.email ?? null,
          preferredProfileDisplayName(payload),
          mailingListOptInFromJwt(payload),
        );
        await this.profiles.enforceActiveAccountOrThrow(payload.sub);
        request.user = payload;
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      /* malformed, wrong secret/JWKS, or missing env — treat as anonymous */
    }
    return true;
  }
}
