import { Module } from '@nestjs/common';
import { TunelesService } from './tuneles.service';
import { TunelesController } from './tuneles.controller';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [EventosModule],
  controllers: [TunelesController],
  providers: [TunelesService],
  exports: [TunelesService],
})
export class TunelesModule {}
