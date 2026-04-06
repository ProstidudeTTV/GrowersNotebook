import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfilesService } from '../profiles/profiles.service';
import type { JwtUser } from './jwt-user';
import { ROLES_KEY } from './roles.decorator';
import type { ProfileRole } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly profiles: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<ProfileRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = req.user;
    if (!user?.sub) throw new ForbiddenException();

    const profile = await this.profiles.findById(user.sub);
    if (!profile || !roles.includes(profile.role)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
