import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSiteConfigController } from './admin-site-config.controller';
import { PublicSiteController } from './public-site.controller';
import { SiteConfigService } from './site-config.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicSiteController, AdminSiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteModule {}
