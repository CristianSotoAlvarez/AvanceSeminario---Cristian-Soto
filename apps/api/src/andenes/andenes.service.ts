import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AndenesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.anden.findMany({
      include: {
        edificio: true,
        camiones: {
          where: {
            estado: {
              not: 'DESPACHADO',
            },
          },
          include: {
            pedido: { include: { cliente: true } },
          },
          orderBy: { horaLlegadaPlanificada: 'asc' },
          take: 1,
        },
      },
      orderBy: { codigo: 'asc' },
    });
  }
}
