import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';

@Module({
  imports: [forwardRef(() => AuthModule), FollowsModule],
  controllers: [MatrixController],
  providers: [MatrixService],
  exports: [MatrixService],
})
export class MatrixModule {}
