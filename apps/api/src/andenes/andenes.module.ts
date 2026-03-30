import { Module } from '@nestjs/common';
import { AndenesService } from './andenes.service';
import { AndenesController } from './andenes.controller';

@Module({
  controllers: [AndenesController],
  providers: [AndenesService],
})
export class AndenesModule {}
