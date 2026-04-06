import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [MatrixController],
  providers: [MatrixService],
  exports: [MatrixService],
})
export class MatrixModule {}
