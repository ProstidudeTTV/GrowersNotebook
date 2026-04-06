import { Module } from '@nestjs/common';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';

@Module({
  controllers: [MatrixController],
  providers: [MatrixService],
  exports: [MatrixService],
})
export class MatrixModule {}
