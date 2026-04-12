import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PatchSiteConfigDto } from './dto/patch-site-config.dto';
import { SiteConfigService } from './site-config.service';

@Controller('admin/site-config')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminSiteConfigController {
  constructor(private readonly siteConfig: SiteConfigService) {}

  @Get()
  getStaff() {
    return this.siteConfig.getStaffPayload();
  }

  @Patch()
  patch(@Body() body: PatchSiteConfigDto) {
    return this.siteConfig.patch(body);
  }
}
