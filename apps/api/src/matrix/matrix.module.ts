import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FollowsModule } from '../follows/follows.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';
import { MatrixSsssWrapService } from './matrix-ssss-wrap.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    FollowsModule,
    forwardRef(() => ProfilesModule),
  ],
  controllers: [MatrixController],
  providers: [MatrixService, MatrixSsssWrapService],
  exports: [MatrixService],
})
export class MatrixModule {}
