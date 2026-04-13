import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PatchSiteConfigDto } from './dto/patch-site-config.dto';
import { SendMaintenanceEmailDto } from './dto/send-maintenance-email.dto';
import { SiteConfigService } from './site-config.service';

@Controller('admin/site-config')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
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

  /** Send bulk maintenance notice to all auth users (does not toggle maintenance mode). */
  @Post('send-maintenance-email')
  sendMaintenanceEmail(@Body() body: SendMaintenanceEmailDto) {
    return this.siteConfig.sendMaintenanceEmail(body);
  }
}
