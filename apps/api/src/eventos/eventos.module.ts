import { Module } from '@nestjs/common';
import { EventosGateway } from './eventos.gateway';

@Module({
  providers: [EventosGateway],
  exports: [EventosGateway],
})
export class EventosModule {}
