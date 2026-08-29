import { Module } from '@nestjs/common';
import { PrediccionService } from './prediccion.service';
import { PrediccionController } from './prediccion.controller';

@Module({
  controllers: [PrediccionController],
  providers: [PrediccionService],
  exports: [PrediccionService],
})
export class PrediccionModule {}
