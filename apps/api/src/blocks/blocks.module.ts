import { Module, forwardRef } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';

@Module({
  imports: [forwardRef(() => ProfilesModule)],
  controllers: [BlocksController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
