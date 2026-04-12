import { Controller, Get } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';

@Controller('site')
export class PublicSiteController {
  constructor(private readonly siteConfig: SiteConfigService) {}

  @Get('public-config')
  getPublicConfig() {
    return this.siteConfig.getPublicPayload();
  }
}
