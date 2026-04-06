import { Module } from '@nestjs/common';
import { PalletsController } from './pallets.controller';
import { PalletsService } from './pallets.service';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [EventosModule],
  controllers: [PalletsController],
  providers: [PalletsService],
  exports: [PalletsService],
})
export class PalletsModule {}
