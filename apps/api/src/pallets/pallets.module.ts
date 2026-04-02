import { Module } from '@nestjs/common';
import { PalletsController } from './pallets.controller';
import { PalletsService } from './pallets.service';

@Module({
  controllers: [PalletsController],
  providers: [PalletsService],
  exports: [PalletsService],
})
export class PalletsModule {}
