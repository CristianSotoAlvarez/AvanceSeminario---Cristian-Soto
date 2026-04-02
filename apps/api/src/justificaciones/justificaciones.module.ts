import { Module } from '@nestjs/common';
import { JustificacionesController } from './justificaciones.controller';
import { JustificacionesService } from './justificaciones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JustificacionesController],
  providers: [JustificacionesService],
})
export class JustificacionesModule {}
