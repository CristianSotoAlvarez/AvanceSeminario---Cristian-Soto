import { Module } from '@nestjs/common';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [EventosModule],
  controllers: [CamionesController],
  providers: [CamionesService],
  exports: [CamionesService],
})
export class CamionesModule {}
