import { Module } from '@nestjs/common';
import { PorteriaController } from './porteria.controller';
import { PorteriaService } from './porteria.service';
import { QrModule } from '../qr/qr.module';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [QrModule, EventosModule],
  controllers: [PorteriaController],
  providers: [PorteriaService],
})
export class PorteriaModule {}
