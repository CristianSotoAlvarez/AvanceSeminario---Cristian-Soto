import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';

@Injectable()
export class AndenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosGateway,
  ) {}

  async listar() {
    return this.prisma.anden.findMany({
      include: {
        edificio: true,
        fueraServicioPor: { select: { nombre: true } },
        camiones: {
          where: {
            estado: {
              not: 'DESPACHADO',
            },
          },
          include: {
            cliente: true,
            pedido: { include: { cliente: true } },
          },
          orderBy: { horaLlegadaPlanificada: 'asc' },
          take: 1,
        },
      },
      orderBy: { codigo: 'asc' },
    });
  }

  /**
   * Marca un andén como fuera de servicio. Usa updateMany condicional para
   * garantizar el 409 en concurrencia sin lock pesimista: solo actualiza si
   * el andén está libre y operativo.
   */
  async marcarFueraServicio(id: string, motivo: string, usuarioId: string) {
    const ahora = new Date();
    const resultado = await this.prisma.anden.updateMany({
      where: { id, ocupado: false, fueraDeServicio: false },
      data: {
        fueraDeServicio: true,
        motivoFueraServicio: motivo,
        fueraServicioDesde: ahora,
        fueraServicioPorId: usuarioId,
      },
    });

    if (resultado.count === 0) {
      // Determinar el motivo del fallo
      const anden = await this.prisma.anden.findUnique({ where: { id } });
      if (!anden) throw new NotFoundException('Andén no encontrado');
      if (anden.ocupado) {
        throw new ConflictException('El andén tiene un camión asignado. Reasígnalo antes de marcarlo fuera de servicio.');
      }
      if (anden.fueraDeServicio) {
        throw new ConflictException('El andén ya está fuera de servicio.');
      }
      throw new ConflictException('No se pudo marcar el andén fuera de servicio.');
    }

    // Registro permanente en el historial (no se borra al reactivar)
    await this.prisma.historialAndenFueraServicio.create({
      data: { andenId: id, motivo, desde: ahora, marcadoPorId: usuarioId },
    });

    this.eventos.emitirAndenesActualizados();
    return this.prisma.anden.findUnique({
      where: { id },
      include: { edificio: true, fueraServicioPor: { select: { nombre: true } } },
    });
  }

  /** Reactiva un andén fuera de servicio (lo vuelve operativo). */
  async reactivar(id: string, usuarioId: string) {
    const resultado = await this.prisma.anden.updateMany({
      where: { id, fueraDeServicio: true },
      data: {
        fueraDeServicio: false,
        motivoFueraServicio: null,
        fueraServicioDesde: null,
        fueraServicioPorId: null,
      },
    });

    if (resultado.count === 0) {
      const anden = await this.prisma.anden.findUnique({ where: { id } });
      if (!anden) throw new NotFoundException('Andén no encontrado');
      throw new ConflictException('El andén ya está operativo.');
    }

    // Cierra el registro de historial abierto (no lo borra, solo marca fin)
    const abierto = await this.prisma.historialAndenFueraServicio.findFirst({
      where: { andenId: id, hasta: null },
      orderBy: { desde: 'desc' },
    });
    if (abierto) {
      await this.prisma.historialAndenFueraServicio.update({
        where: { id: abierto.id },
        data: { hasta: new Date(), reactivadoPorId: usuarioId },
      });
    }

    this.eventos.emitirAndenesActualizados();
    return this.prisma.anden.findUnique({
      where: { id },
      include: { edificio: true },
    });
  }
}
