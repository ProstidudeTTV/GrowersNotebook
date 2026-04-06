import { Module } from '@nestjs/common';
import { NameBlocklistService } from './name-blocklist.service';

@Module({
  providers: [NameBlocklistService],
  exports: [NameBlocklistService],
})
export class NameBlocklistModule {}
