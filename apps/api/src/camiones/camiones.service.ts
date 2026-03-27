import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCamion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { esTransicionValida, obtenerEstadosSiguientes } from './maquina-estados';

@Injectable()
export class CamionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearCamionDto) {
    return this.prisma.camion.create({
      data: {
        patente: dto.patente,
        tipo: dto.tipo,
        horaLlegadaPlanificada: new Date(dto.horaLlegadaPlanificada),
        horaSalidaPlanificada: dto.horaSalidaPlanificada ? new Date(dto.horaSalidaPlanificada) : null,
        pedidoId: dto.pedidoId,
        cargaPreviaDescripcion: dto.cargaPreviaDescripcion,
      },
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
      },
    });
  }

  async listar(filtros: FiltrosCamionDto) {
    const where: any = {};

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.edificioId) {
      where.anden = { edificioId: filtros.edificioId };
    }

    return this.prisma.camion.findMany({
      where,
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
      },
      orderBy: { horaLlegadaPlanificada: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const camion = await this.prisma.camion.findUnique({
      where: { id },
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
        eventos: {
          orderBy: { timestamp: 'asc' },
          include: { usuario: { select: { nombre: true, rol: true } } },
        },
        pallets: true,
      },
    });

    if (!camion) {
      throw new NotFoundException('Camión no encontrado');
    }

    // Agregar estados siguientes posibles
    const estadosSiguientes = obtenerEstadosSiguientes(camion.tipo, camion.estado);

    return { ...camion, estadosSiguientes };
  }

  /** Asigna un andén al camión (transición EN_PORTERIA → ASIGNADO) */
  async asignarAnden(camionId: string, andenId: string, usuarioId: string) {
    const camion = await this.obtenerCamionOError(camionId);

    this.validarTransicion(camion, EstadoCamion.ASIGNADO);

    // Verificar que el andén existe y no está ocupado
    const anden = await this.prisma.anden.findUnique({ where: { id: andenId } });
    if (!anden) throw new NotFoundException('Andén no encontrado');
    if (anden.ocupado) throw new BadRequestException(`El andén ${anden.codigo} ya está ocupado`);

    // Transacción: actualizar camión + marcar andén ocupado + crear evento
    return this.prisma.$transaction(async (tx) => {
      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: { estado: EstadoCamion.ASIGNADO, andenId },
        include: { anden: true },
      });

      await tx.anden.update({
        where: { id: andenId },
        data: { ocupado: true },
      });

      await tx.eventoCamion.create({
        data: {
          camionId,
          estado: EstadoCamion.ASIGNADO,
          usuarioId,
          nota: `Asignado al andén ${anden.codigo}`,
        },
      });

      return camionActualizado;
    });
  }

  /** Transición genérica de estado con validación */
  async cambiarEstado(
    camionId: string,
    nuevoEstado: EstadoCamion,
    usuarioId: string,
    nota?: string,
  ) {
    const camion = await this.obtenerCamionOError(camionId);

    this.validarTransicion(camion, nuevoEstado);

    return this.prisma.$transaction(async (tx) => {
      const datos: any = { estado: nuevoEstado };

      // Si se despacha, liberar el andén y registrar hora de salida
      if (nuevoEstado === EstadoCamion.DESPACHADO && camion.andenId) {
        await tx.anden.update({
          where: { id: camion.andenId },
          data: { ocupado: false },
        });
        datos.horaSalidaReal = new Date();
      }

      // Si llega a portería, registrar hora de llegada real
      if (nuevoEstado === EstadoCamion.EN_PORTERIA) {
        datos.horaLlegadaReal = new Date();
      }

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: datos,
        include: { anden: true },
      });

      await tx.eventoCamion.create({
        data: {
          camionId,
          estado: nuevoEstado,
          usuarioId,
          nota,
        },
      });

      return camionActualizado;
    });
  }

  /** Finaliza carga: nacional/interplanta → LISTO, exportación → EN_TUNEL_FRIO */
  async finalizarCarga(camionId: string, usuarioId: string) {
    const camion = await this.obtenerCamionOError(camionId);

    // Exportación va a túnel frío, el resto directo a LISTO
    const nuevoEstado = camion.tipo === 'EXPORTACION'
      ? EstadoCamion.EN_TUNEL_FRIO
      : EstadoCamion.LISTO;

    return this.cambiarEstado(camionId, nuevoEstado, usuarioId, 'Carga finalizada');
  }

  // --- Helpers privados ---

  private async obtenerCamionOError(id: string) {
    const camion = await this.prisma.camion.findUnique({ where: { id } });
    if (!camion) throw new NotFoundException('Camión no encontrado');
    return camion;
  }

  private validarTransicion(
    camion: { tipo: any; estado: any; patente: string },
    nuevoEstado: EstadoCamion,
  ) {
    if (!esTransicionValida(camion.tipo, camion.estado, nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${camion.estado} → ${nuevoEstado} para camión ${camion.patente} (tipo ${camion.tipo})`,
      );
    }
  }
}
