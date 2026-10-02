import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EstadoCamion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';

@Injectable()
export class TunelesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosGateway,
  ) {}

  async listar() {
    return this.prisma.tunelFrio.findMany({
      include: {
        edificio: true,
        fueraServicioPor: { select: { nombre: true } },
        camiones: {
          where: { estado: EstadoCamion.EN_TUNEL_FRIO },
          include: { cliente: true, pedido: { include: { cliente: true } } },
          orderBy: { horaLlegadaPlanificada: 'asc' },
          take: 1,
        },
      },
      orderBy: { codigo: 'asc' },
    });
  }

  /** Asigna explícitamente un camión (ya en EN_TUNEL_FRIO) a un túnel físico disponible. */
  async ingresarTunel(camionId: string, tunelId: string, usuarioId: string) {
    const camion = await this.prisma.camion.findUnique({ where: { id: camionId } });
    if (!camion) throw new NotFoundException('Camión no encontrado');
    if (camion.estado !== EstadoCamion.EN_TUNEL_FRIO) {
      throw new BadRequestException('El camión no está en estado EN_TUNEL_FRIO');
    }
    if (camion.tunelId) {
      throw new ConflictException('El camión ya tiene un túnel asignado');
    }

    const tunel = await this.prisma.tunelFrio.findUnique({ where: { id: tunelId } });
    if (!tunel) throw new NotFoundException('Túnel no encontrado');

    // Todo dentro de una transacción: si el camión ya tomó otro túnel en paralelo,
    // la reserva de este se revierte en vez de quedar ocupado sin camión.
    await this.prisma.$transaction(async (tx) => {
      const reserva = await tx.tunelFrio.updateMany({
        where: { id: tunelId, ocupado: false, fueraDeServicio: false },
        data: { ocupado: true },
      });
      if (reserva.count === 0) {
        const actual = await tx.tunelFrio.findUnique({ where: { id: tunelId } });
        if (actual?.fueraDeServicio) throw new ConflictException('El túnel está fuera de servicio.');
        throw new ConflictException('El túnel ya está ocupado por otro camión.');
      }

      const asignacion = await tx.camion.updateMany({
        where: { id: camionId, tunelId: null, estado: EstadoCamion.EN_TUNEL_FRIO },
        data: { tunelId },
      });
      if (asignacion.count === 0) {
        throw new ConflictException('El camión ya fue ingresado a otro túnel.');
      }

      await tx.eventoCamion.create({
        data: {
          camionId,
          estado: EstadoCamion.EN_TUNEL_FRIO,
          usuarioId,
          nota: `Ingresó al túnel ${tunel.codigo}`,
        },
      });
    });

    this.eventos.emitirTunelesActualizados();
    return this.prisma.camion.findUnique({ where: { id: camionId }, include: { tunel: true } });
  }

  async marcarFueraServicio(id: string, motivo: string, usuarioId: string) {
    const ahora = new Date();
    const resultado = await this.prisma.tunelFrio.updateMany({
      where: { id, ocupado: false, fueraDeServicio: false },
      data: {
        fueraDeServicio: true,
        motivoFueraServicio: motivo,
        fueraServicioDesde: ahora,
        fueraServicioPorId: usuarioId,
      },
    });

    if (resultado.count === 0) {
      const tunel = await this.prisma.tunelFrio.findUnique({ where: { id } });
      if (!tunel) throw new NotFoundException('Túnel no encontrado');
      if (tunel.ocupado) {
        throw new ConflictException('El túnel tiene un camión asignado. Libéralo antes de marcarlo fuera de servicio.');
      }
      if (tunel.fueraDeServicio) {
        throw new ConflictException('El túnel ya está fuera de servicio.');
      }
      throw new ConflictException('No se pudo marcar el túnel fuera de servicio.');
    }

    await this.prisma.historialTunelFueraServicio.create({
      data: { tunelId: id, motivo, desde: ahora, marcadoPorId: usuarioId },
    });

    this.eventos.emitirTunelesActualizados();
    return this.prisma.tunelFrio.findUnique({
      where: { id },
      include: { edificio: true, fueraServicioPor: { select: { nombre: true } } },
    });
  }

  async reactivar(id: string, usuarioId: string) {
    const resultado = await this.prisma.tunelFrio.updateMany({
      where: { id, fueraDeServicio: true },
      data: {
        fueraDeServicio: false,
        motivoFueraServicio: null,
        fueraServicioDesde: null,
        fueraServicioPorId: null,
      },
    });

    if (resultado.count === 0) {
      const tunel = await this.prisma.tunelFrio.findUnique({ where: { id } });
      if (!tunel) throw new NotFoundException('Túnel no encontrado');
      throw new ConflictException('El túnel ya está operativo.');
    }

    const abierto = await this.prisma.historialTunelFueraServicio.findFirst({
      where: { tunelId: id, hasta: null },
      orderBy: { desde: 'desc' },
    });
    if (abierto) {
      await this.prisma.historialTunelFueraServicio.update({
        where: { id: abierto.id },
        data: { hasta: new Date(), reactivadoPorId: usuarioId },
      });
    }

    this.eventos.emitirTunelesActualizados();
    return this.prisma.tunelFrio.findUnique({ where: { id }, include: { edificio: true } });
  }
}
