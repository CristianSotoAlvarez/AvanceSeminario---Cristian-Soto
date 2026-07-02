import { Module } from '@nestjs/common';
import { AndenesService } from './andenes.service';
import { AndenesController } from './andenes.controller';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [EventosModule],
  controllers: [AndenesController],
  providers: [AndenesService],
})
export class AndenesModule {}
