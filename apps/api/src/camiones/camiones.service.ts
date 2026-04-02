import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCamion, EstadoInspeccion, EstadoParada, TipoEdificio } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { esTransicionValida, obtenerEstadosSiguientes } from './maquina-estados';

const INCLUDE_CAMION = {
  anden: true,
  pedido: { include: { cliente: true } },
  paradas: { orderBy: { orden: 'asc' as const } },
};

@Injectable()
export class CamionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventosGateway: EventosGateway,
  ) {}

  private async generarNumeroTransporte(tipo: string, tx: any): Promise<string> {
    const prefijo = tipo === 'NACIONAL' ? '600' : tipo === 'EXPORTACION' ? '800' : '700';
    const ultimo = await tx.camion.findFirst({
      where: { numeroTransporte: { startsWith: `${prefijo}-` } },
      orderBy: { creadoEn: 'desc' },
      select: { numeroTransporte: true },
    });
    const siguiente = ultimo?.numeroTransporte
      ? parseInt(ultimo.numeroTransporte.split('-')[1] ?? '0') + 1
      : 1;
    return `${prefijo}-${String(siguiente).padStart(3, '0')}`;
  }

  async crear(dto: CrearCamionDto) {
    return this.prisma.$transaction(async (tx) => {
      const numeroTransporte = dto.numeroTransporte ?? await this.generarNumeroTransporte(dto.tipo, tx);
      const camion = await tx.camion.create({
        data: {
          patente: dto.patente || numeroTransporte,
          numeroTransporte,
          tipo: dto.tipo,
          horaLlegadaPlanificada: new Date(dto.horaLlegadaPlanificada),
          horaSalidaPlanificada: dto.horaSalidaPlanificada ? new Date(dto.horaSalidaPlanificada) : null,
          pedidoId: dto.pedidoId,
          cargaPreviaDescripcion: dto.cargaPreviaDescripcion,
        },
        include: INCLUDE_CAMION,
      });

      if (dto.edificios && dto.edificios.length > 0) {
        const ordenados = this.ordenarEdificios(dto.edificios);
        await tx.paradaExpedicion.createMany({
          data: ordenados.map((edificioTipo, index) => ({
            camionId: camion.id,
            edificioTipo,
            orden: index + 1,
          })),
        });
      }

      return camion;
    });
  }

  async listar(filtros: FiltrosCamionDto) {
    const where: any = {};
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.edificioId) where.anden = { edificioId: filtros.edificioId };

    // Filtro por fecha — default: hoy
    const fechaStr = filtros.fecha ?? new Date().toISOString().slice(0, 10);
    const inicioDia = new Date(`${fechaStr}T00:00:00.000Z`);
    const finDia    = new Date(`${fechaStr}T23:59:59.999Z`);
    where.horaLlegadaPlanificada = { gte: inicioDia, lte: finDia };

    const pagina    = filtros.pagina    ?? 1;
    const porPagina = filtros.porPagina ?? 30;
    const skip      = (pagina - 1) * porPagina;

    const [total, datos] = await Promise.all([
      this.prisma.camion.count({ where }),
      this.prisma.camion.findMany({
        where,
        include: INCLUDE_CAMION,
        orderBy: { horaLlegadaPlanificada: 'asc' },
        skip,
        take: porPagina,
      }),
    ]);

    return {
      datos,
      meta: {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
      },
    };
  }

  async obtenerPorId(id: string) {
    const camion = await this.prisma.camion.findUnique({
      where: { id },
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
        paradas: {
          orderBy: { orden: 'asc' },
          include: {
            anden: { include: { edificio: true } },
            justificacion: { include: { registradoPor: { select: { nombre: true, rol: true } } } },
          },
        },
        eventos: {
          orderBy: { timestamp: 'asc' },
          include: { usuario: { select: { nombre: true, rol: true } } },
        },
        entregas: { include: { pallets: { select: { id: true, codigoUnico: true, estado: true } } } },
        inspecciones: {
          orderBy: { timestampInicio: 'desc' },
          include: { inspector: { select: { nombre: true, rol: true } } },
        },
      },
    });

    if (!camion) throw new NotFoundException('Camión no encontrado');

    const estadosSiguientes = obtenerEstadosSiguientes(camion.tipo, camion.estado);
    return { ...camion, estadosSiguientes };
  }

  /** Asigna un andén al camión (EN_PORTERIA → ASIGNADO) */
  async asignarAnden(camionId: string, andenId: string, usuarioId: string) {
    const camion = await this.obtenerCamionOError(camionId);
    this.validarTransicion(camion, EstadoCamion.ASIGNADO);

    const anden = await this.prisma.anden.findUnique({
      where: { id: andenId },
      include: { edificio: true },
    });
    if (!anden) throw new NotFoundException('Andén no encontrado');
    if (anden.ocupado) throw new BadRequestException(`El andén ${anden.codigo} ya está ocupado`);

    return this.prisma.$transaction(async (tx) => {
      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: { estado: EstadoCamion.ASIGNADO, andenId },
        include: INCLUDE_CAMION,
      });

      await tx.anden.update({ where: { id: andenId }, data: { ocupado: true } });

      // Marcar la parada correspondiente como EN_PROCESO
      const parada = await tx.paradaExpedicion.findFirst({
        where: { camionId, estado: EstadoParada.PENDIENTE, edificioTipo: anden.edificio.tipo as TipoEdificio },
        orderBy: { orden: 'asc' },
      });
      if (parada) {
        await tx.paradaExpedicion.update({
          where: { id: parada.id },
          data: { estado: EstadoParada.EN_PROCESO, horaInicio: new Date(), andenId },
        });
        // Crear entrega automáticamente para esta parada si no existe
        const entregaExistente = await tx.entrega.findUnique({ where: { paradaId: parada.id } });
        if (!entregaExistente) {
          await tx.entrega.create({ data: { camionId, paradaId: parada.id } });
        }
      }

      await tx.eventoCamion.create({
        data: {
          camionId,
          estado: EstadoCamion.ASIGNADO,
          usuarioId,
          nota: `Asignado al andén ${anden.codigo} (${anden.edificio.tipo})`,
        },
      });

      this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
      this.eventosGateway.emitirAndenesActualizados();

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

      if (nuevoEstado === EstadoCamion.DESPACHADO && camion.andenId) {
        await tx.anden.update({ where: { id: camion.andenId }, data: { ocupado: false } });
        datos.horaSalidaReal = new Date();
      }

      if (nuevoEstado === EstadoCamion.EN_PORTERIA) {
        datos.horaLlegadaReal = new Date();
      }

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: datos,
        include: INCLUDE_CAMION,
      });

      await tx.eventoCamion.create({
        data: { camionId, estado: nuevoEstado, usuarioId, nota },
      });

      this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
      if (nuevoEstado === EstadoCamion.DESPACHADO || nuevoEstado === EstadoCamion.ASIGNADO) {
        this.eventosGateway.emitirAndenesActualizados();
      }

      return camionActualizado;
    });
  }

  /** Finaliza carga: si hay más paradas → vuelve a EN_PORTERIA, si no → LISTO / EN_TUNEL_FRIO */
  async finalizarCarga(camionId: string, usuarioId: string) {
    const camion = await this.obtenerCamionOError(camionId);
    if (camion.estado !== EstadoCamion.EN_CARGA) {
      throw new BadRequestException(`El camión no está en estado EN_CARGA`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Completar parada activa
      const paradaActiva = await tx.paradaExpedicion.findFirst({
        where: { camionId, estado: EstadoParada.EN_PROCESO },
      });
      if (paradaActiva) {
        await tx.paradaExpedicion.update({
          where: { id: paradaActiva.id },
          data: { estado: EstadoParada.COMPLETADO, horaFin: new Date() },
        });
      }

      // Liberar andén actual
      if (camion.andenId) {
        await tx.anden.update({ where: { id: camion.andenId }, data: { ocupado: false } });
      }

      // ¿Hay más paradas pendientes?
      const proximaParada = await tx.paradaExpedicion.findFirst({
        where: { camionId, estado: EstadoParada.PENDIENTE },
        orderBy: { orden: 'asc' },
      });

      if (proximaParada) {
        // Multi-parada: volver a EN_PORTERIA esperando asignación al siguiente andén
        const camionActualizado = await tx.camion.update({
          where: { id: camionId },
          data: { estado: EstadoCamion.EN_PORTERIA, andenId: null },
          include: INCLUDE_CAMION,
        });

        await tx.eventoCamion.create({
          data: {
            camionId,
            estado: EstadoCamion.EN_PORTERIA,
            usuarioId,
            nota: `Carga completada. En tránsito a próximo punto: ${proximaParada.edificioTipo}`,
          },
        });

        this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
        this.eventosGateway.emitirAndenesActualizados();
        return camionActualizado;
      }

      // Última parada — transición final según tipo
      const nuevoEstado = camion.tipo === 'EXPORTACION'
        ? EstadoCamion.EN_TUNEL_FRIO
        : EstadoCamion.LISTO;

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: { estado: nuevoEstado, andenId: null },
        include: INCLUDE_CAMION,
      });

      await tx.eventoCamion.create({
        data: { camionId, estado: nuevoEstado, usuarioId, nota: 'Carga finalizada — todas las paradas completadas' },
      });

      this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
      this.eventosGateway.emitirAndenesActualizados();
      return camionActualizado;
    });
  }

  /** SAG aprueba */
  async aprobarSag(camionId: string, inspectorId: string, observaciones?: string) {
    const camion = await this.obtenerCamionOError(camionId);
    this.validarTransicion(camion, EstadoCamion.APROBADO_SAG);

    return this.prisma.$transaction(async (tx) => {
      await tx.inspeccionSAG.create({
        data: { camionId, inspectorId, estado: EstadoInspeccion.APROBADO, timestampResolucion: new Date(), observaciones },
      });

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: { estado: EstadoCamion.APROBADO_SAG },
        include: INCLUDE_CAMION,
      });

      await tx.eventoCamion.create({
        data: { camionId, estado: EstadoCamion.APROBADO_SAG, usuarioId: inspectorId, nota: observaciones ?? 'Aprobado por SAG' },
      });

      this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
      return camionActualizado;
    });
  }

  /** SAG rechaza */
  async rechazarSag(camionId: string, inspectorId: string, observaciones?: string) {
    const camion = await this.obtenerCamionOError(camionId);
    this.validarTransicion(camion, EstadoCamion.RECHAZADO_SAG);

    return this.prisma.$transaction(async (tx) => {
      await tx.inspeccionSAG.create({
        data: { camionId, inspectorId, estado: EstadoInspeccion.RECHAZADO, timestampResolucion: new Date(), observaciones },
      });

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: { estado: EstadoCamion.RECHAZADO_SAG },
        include: INCLUDE_CAMION,
      });

      await tx.eventoCamion.create({
        data: { camionId, estado: EstadoCamion.RECHAZADO_SAG, usuarioId: inspectorId, nota: observaciones ?? 'Rechazado por SAG' },
      });

      this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
      return camionActualizado;
    });
  }

  // --- Helpers privados ---

  /** Frigorifico siempre al final si está presente */
  private ordenarEdificios(edificios: TipoEdificio[]): TipoEdificio[] {
    const sinFrio = edificios.filter((e) => e !== TipoEdificio.FRIGORIFICO);
    const tieneFrio = edificios.includes(TipoEdificio.FRIGORIFICO);
    return tieneFrio ? [...sinFrio, TipoEdificio.FRIGORIFICO] : sinFrio;
  }

  private async obtenerCamionOError(id: string) {
    const camion = await this.prisma.camion.findUnique({ where: { id } });
    if (!camion) throw new NotFoundException('Camión no encontrado');
    return camion;
  }

  private validarTransicion(camion: { tipo: any; estado: any; patente: string }, nuevoEstado: EstadoCamion) {
    if (!esTransicionValida(camion.tipo, camion.estado, nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${camion.estado} → ${nuevoEstado} para camión ${camion.patente} (tipo ${camion.tipo})`,
      );
    }
  }
}
