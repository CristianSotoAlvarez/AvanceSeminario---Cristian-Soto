import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearEntregaDto } from './dto/crear-entrega.dto';

const INCLUDE_ENTREGA = {
  camion: { select: { id: true, patente: true, numeroTransporte: true, tipo: true } },
  parada: { select: { id: true, edificioTipo: true, orden: true, estado: true } },
  pallets: {
    include: {
      productos: true,
      pickinero: { select: { id: true, nombre: true } },
    },
    orderBy: { timestampInicio: 'desc' as const },
  },
};

@Injectable()
export class EntregasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorCamion(camionId: string) {
    return this.prisma.entrega.findMany({
      where: { camionId },
      include: INCLUDE_ENTREGA,
      orderBy: { creadoEn: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id },
      include: INCLUDE_ENTREGA,
    });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');
    return entrega;
  }

  async crear(dto: CrearEntregaDto) {
    // Verificar que el camion existe
    const camion = await this.prisma.camion.findUnique({ where: { id: dto.camionId } });
    if (!camion) throw new NotFoundException('Camión no encontrado');

    return this.prisma.entrega.create({
      data: {
        camionId: dto.camionId,
        paradaId: dto.paradaId,
      },
      include: INCLUDE_ENTREGA,
    });
  }

  async eliminar(id: string) {
    const entrega = await this.prisma.entrega.findUnique({ where: { id } });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');
    await this.prisma.entrega.delete({ where: { id } });
  }
}
