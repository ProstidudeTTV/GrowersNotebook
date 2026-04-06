import { SetMetadata } from '@nestjs/common';
import type { InferSelectModel } from 'drizzle-orm';
import type { profiles } from '../db/schema';

export type ProfileRole = InferSelectModel<typeof profiles>['role'];

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ProfileRole[]) => SetMetadata(ROLES_KEY, roles);
