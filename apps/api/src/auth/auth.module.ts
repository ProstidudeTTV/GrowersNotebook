import { forwardRef, Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { OptionalAuthGuard } from './optional-auth.guard';
import { RolesGuard } from './roles.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  imports: [forwardRef(() => ProfilesModule)],
  providers: [SupabaseAuthGuard, OptionalAuthGuard, RolesGuard],
  exports: [
    SupabaseAuthGuard,
    OptionalAuthGuard,
    RolesGuard,
    /** So feature modules can resolve guards that inject ProfilesService */
    forwardRef(() => ProfilesModule),
  ],
})
export class AuthModule {}
