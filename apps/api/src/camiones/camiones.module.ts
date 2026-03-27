import { Module } from '@nestjs/common';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';

@Module({
  controllers: [CamionesController],
  providers: [CamionesService],
  exports: [CamionesService],
})
export class CamionesModule {}
