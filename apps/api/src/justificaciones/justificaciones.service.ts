import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearJustificacionDto } from './dto/crear-justificacion.dto';

@Injectable()
export class JustificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crearJustificacion(
    paradaId: string,
    dto: CrearJustificacionDto,
    usuarioId: string,
    rolUsuario: string,
  ) {
    if (!['JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR'].includes(rolUsuario)) {
      throw new ForbiddenException('Solo jefes, supervisores o coordinadores pueden justificar atrasos');
    }

    const parada = await this.prisma.paradaExpedicion.findUnique({
      where: { id: paradaId },
      include: { justificacion: true },
    });

    if (!parada) throw new NotFoundException('Parada no encontrada');

    if (parada.justificacion) {
      // Actualizar existente
      return this.prisma.justificacionAtraso.update({
        where: { paradaId },
        data: {
          causa: dto.causa,
          descripcion: dto.descripcion,
          excluirDelCalculo: dto.excluirDelCalculo ?? true,
        },
        include: { registradoPor: { select: { nombre: true, rol: true } } },
      });
    }

    return this.prisma.justificacionAtraso.create({
      data: {
        paradaId,
        causa: dto.causa,
        descripcion: dto.descripcion,
        excluirDelCalculo: dto.excluirDelCalculo ?? true,
        registradoPorId: usuarioId,
      },
      include: { registradoPor: { select: { nombre: true, rol: true } } },
    });
  }

  async eliminarJustificacion(paradaId: string, rolUsuario: string) {
    if (!['JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR'].includes(rolUsuario)) {
      throw new ForbiddenException('Solo jefes, supervisores o coordinadores pueden eliminar justificaciones');
    }

    const existing = await this.prisma.justificacionAtraso.findUnique({ where: { paradaId } });
    if (!existing) throw new NotFoundException('Justificación no encontrada');

    return this.prisma.justificacionAtraso.delete({ where: { paradaId } });
  }
}
