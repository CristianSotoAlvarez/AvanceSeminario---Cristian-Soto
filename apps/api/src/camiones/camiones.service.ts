import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCamion, EstadoInspeccion, EstadoParada, TipoEdificio, TipoIncidente, AccionIncidente, TipoCamion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { RegistrarIncidenteDto } from './dto/registrar-incidente.dto';
import { esTransicionValida, obtenerEstadosSiguientes } from './maquina-estados';

const ESTADOS_BLOQUEADOS_INCIDENTE: EstadoCamion[] = [EstadoCamion.DESPACHADO, EstadoCamion.AVERIADO];

// Mapea el estado de X (averiado) y el tipo al estado inicial del camión sustituto Y.
function estadoInicialSustituto(estadoX: EstadoCamion, tipo: TipoCamion): EstadoCamion {
  // Si X estaba antes de empezar carga → Y arranca en ASIGNADO
  if (estadoX === EstadoCamion.ESPERADO || estadoX === EstadoCamion.EN_PORTERIA || estadoX === EstadoCamion.ASIGNADO) {
    return EstadoCamion.ASIGNADO;
  }
  // En carga: continúa carga
  if (estadoX === EstadoCamion.EN_CARGA) return EstadoCamion.EN_CARGA;
  // Para exportación: SAG no se hereda. Volver a EN_TUNEL_FRIO o estado equivalente.
  if (tipo === TipoCamion.EXPORTACION) {
    if (estadoX === EstadoCamion.APROBADO_SAG || estadoX === EstadoCamion.LISTO) return EstadoCamion.EN_TUNEL_FRIO;
    if (estadoX === EstadoCamion.EN_TUNEL_FRIO || estadoX === EstadoCamion.ESPERANDO_SAG || estadoX === EstadoCamion.RECHAZADO_SAG) {
      return estadoX;
    }
  }
  // Nacional/Interplanta: hereda (LISTO si era APROBADO_SAG o LISTO)
  if (estadoX === EstadoCamion.APROBADO_SAG || estadoX === EstadoCamion.LISTO) return EstadoCamion.LISTO;
  return EstadoCamion.ASIGNADO;
}

const INCLUDE_CAMION = {
  anden: true,
  tunel: true,
  cliente: true,
  pedido: { include: { cliente: true } },
  paradas: {
    orderBy: { orden: 'asc' as const },
    include: { entrega: { include: { pallets: { select: { id: true, estado: true } } } } },
  },
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
          clienteId: dto.clienteId,
          pedidoId: dto.pedidoId,
          cargaPreviaDescripcion: dto.cargaPreviaDescripcion,
        },
        include: INCLUDE_CAMION,
      });

      // Normalizar: `paradas` tiene prioridad sobre `edificios` (legacy)
      const paradasInput: { edificio: string; pallets?: number }[] =
        dto.paradas && dto.paradas.length > 0
          ? dto.paradas.map(p => ({ edificio: p.edificio, pallets: p.pallets }))
          : (dto.edificios ?? []).map(e => ({ edificio: e, pallets: undefined }));

      if (paradasInput.length > 0) {
        const edificiosSolo = paradasInput.map(p => p.edificio as any);
        const ordenados = this.ordenarEdificios(edificiosSolo);
        // Reordenar paradasInput con el mismo criterio (frigorífico siempre al final)
        const paradasOrdenadas = ordenados.map(e => paradasInput.find(p => p.edificio === e)!);

        for (let index = 0; index < paradasOrdenadas.length; index++) {
          const { edificio, pallets } = paradasOrdenadas[index];
          const parada = await tx.paradaExpedicion.create({
            data: {
              camionId: camion.id,
              edificioTipo: edificio as any,
              orden: index + 1,
              ...(pallets !== undefined && pallets > 0 ? { cantidadPalletsSolicitados: pallets } : {}),
            },
          });
          // Entrega creada de inmediato para que picking pueda arrancar
          await tx.entrega.create({ data: { camionId: camion.id, paradaId: parada.id } });
        }
      }

      return camion;
    });
  }

  async listar(filtros: FiltrosCamionDto) {
    const where: any = {};
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.edificioId) where.anden = { edificioId: filtros.edificioId };

    // Filtro por fecha — el cliente siempre envía fecha local explícita; fallback a UTC del servidor
    const ahora = new Date();
    const fechaHoyUtc = `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}-${String(ahora.getUTCDate()).padStart(2, '0')}`;
    const fechaStr = filtros.fecha ?? fechaHoyUtc;
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
        cliente: true,
        pedido: { include: { cliente: true } },
        paradas: {
          orderBy: { orden: 'asc' },
          include: {
            anden: { include: { edificio: true } },
            justificacion: { include: { registradoPor: { select: { nombre: true, rol: true } } } },
            entrega: { include: { pallets: { select: { id: true, estado: true } } } },
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
    if (anden.fueraDeServicio) throw new BadRequestException(`El andén ${anden.codigo} está fuera de servicio`);

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

      // Al salir de EN_TUNEL_FRIO se libera el túnel físico asignado (si tenía uno)
      let notaTunel: string | undefined;
      if (camion.estado === EstadoCamion.EN_TUNEL_FRIO && nuevoEstado !== EstadoCamion.EN_TUNEL_FRIO && (camion as any).tunelId) {
        const tunel = await tx.tunelFrio.findUnique({ where: { id: (camion as any).tunelId } });
        await tx.tunelFrio.update({ where: { id: (camion as any).tunelId }, data: { ocupado: false } });
        datos.tunelId = null;
        notaTunel = `Salió del túnel ${tunel?.codigo ?? ''}`.trim();
      }

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: datos,
        include: INCLUDE_CAMION,
      });

      await tx.eventoCamion.create({
        data: { camionId, estado: nuevoEstado, usuarioId, nota: nota ?? notaTunel },
      });

      this.eventosGateway.emitirCamionActualizado(camionActualizado as any);
      if (nuevoEstado === EstadoCamion.DESPACHADO || nuevoEstado === EstadoCamion.ASIGNADO) {
        this.eventosGateway.emitirAndenesActualizados();
      }
      if (notaTunel) {
        this.eventosGateway.emitirTunelesActualizados();
      }

      return camionActualizado;
    });
  }

  /**
   * Registra la temperatura de salida del túnel de frío y avanza el camión a
   * ESPERANDO_SAG. Deja constancia permanente en EventoTunel (quién, cuándo,
   * qué temperatura) además de liberar el túnel físico asignado.
   */
  async registrarTemperaturaYSalirTunel(camionId: string, temperatura: number, usuarioId: string, observaciones?: string) {
    const camion = await this.obtenerCamionOError(camionId);
    if (camion.estado !== EstadoCamion.EN_TUNEL_FRIO) {
      throw new BadRequestException('El camión no está en estado EN_TUNEL_FRIO');
    }

    await this.prisma.eventoTunel.create({
      data: { camionId, operadorId: usuarioId, temperaturaRegistrada: temperatura, observaciones },
    });

    return this.cambiarEstado(camionId, EstadoCamion.ESPERANDO_SAG, usuarioId, `Temperatura registrada: ${temperatura}°C`);
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

  async reordenarParadas(camionId: string, paradaIds: string[]) {
    // Verificar que el camión existe
    await this.obtenerCamionOError(camionId);

    // Cargar todas las paradas PENDIENTES del camión
    const paradasPendientes = await this.prisma.paradaExpedicion.findMany({
      where: { camionId, estado: 'PENDIENTE' },
      select: { id: true },
    });

    const idsPendientes = new Set(paradasPendientes.map(p => p.id));

    // Validar que todos los IDs enviados corresponden a paradas PENDIENTES de este camión
    for (const id of paradaIds) {
      if (!idsPendientes.has(id)) {
        throw new BadRequestException(
          `La parada ${id} no pertenece a este camión o no está en estado PENDIENTE`,
        );
      }
    }

    if (paradaIds.length !== paradasPendientes.length) {
      throw new BadRequestException(
        'Debes incluir todas las paradas PENDIENTES del camión en el nuevo orden',
      );
    }

    // Calcular el orden base (las paradas ya completadas/en proceso ocupan los primeros órdenes)
    const paradasNoEditables = await this.prisma.paradaExpedicion.findMany({
      where: { camionId, estado: { not: 'PENDIENTE' } },
      orderBy: { orden: 'asc' },
      select: { id: true },
    });
    const baseOrden = paradasNoEditables.length + 1;

    // Actualizar el orden de cada parada PENDIENTE según el nuevo array
    await this.prisma.$transaction(
      paradaIds.map((id, index) =>
        this.prisma.paradaExpedicion.update({
          where: { id },
          data: { orden: baseOrden + index },
        }),
      ),
    );

    const resultado = await this.obtenerPorId(camionId);
    this.eventosGateway.emitirCamionActualizado(resultado as any);
    return resultado;
  }

  // --- Helpers privados ---

  /** Frigorifico siempre al final si está presente */
  private ordenarEdificios(edificios: TipoEdificio[]): TipoEdificio[] {
    const sinFrio = edificios.filter((e) => e !== TipoEdificio.FRIGORIFICO);
    const tieneFrio = edificios.includes(TipoEdificio.FRIGORIFICO);
    return tieneFrio ? [...sinFrio, TipoEdificio.FRIGORIFICO] : sinFrio;
  }

  // ─── Incidentes (avería en v1) ─────────────────────────────────────────────

  async registrarIncidente(camionId: string, dto: RegistrarIncidenteDto, usuarioId: string) {
    if (dto.tipo !== TipoIncidente.AVERIA) {
      throw new BadRequestException('Solo se soporta tipo AVERIA en esta versión');
    }
    if (dto.accion !== AccionIncidente.ESPERAR_REPARACION && dto.accion !== AccionIncidente.SUSTITUIR) {
      throw new BadRequestException('Acción no soportada para AVERIA');
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock pessimista a nivel DB para evitar carrera entre dos supervisores
      const lockResult = await tx.$queryRaw<Array<{ id: string; estado: EstadoCamion; tipo: TipoCamion; enReparacion: boolean }>>`
        SELECT id, estado, tipo, "enReparacion"
        FROM camiones
        WHERE id = ${camionId}
        FOR UPDATE
      `;
      const camion = lockResult[0];
      if (!camion) throw new NotFoundException('Camión no encontrado');
      if (ESTADOS_BLOQUEADOS_INCIDENTE.includes(camion.estado)) {
        throw new BadRequestException(`No se puede registrar incidente en estado ${camion.estado}`);
      }
      if (camion.enReparacion && dto.accion === AccionIncidente.ESPERAR_REPARACION) {
        throw new BadRequestException('El camión ya está en reparación');
      }

      if (dto.accion === AccionIncidente.ESPERAR_REPARACION) {
        await tx.camion.update({
          where: { id: camionId },
          data: { enReparacion: true, reparacionDesde: new Date() },
        });
        await tx.incidenteCamion.create({
          data: {
            camionId,
            tipo: TipoIncidente.AVERIA,
            accion: AccionIncidente.ESPERAR_REPARACION,
            estadoCamionEnIncidente: camion.estado,
            descripcion: dto.descripcion,
            registradoPorId: usuarioId,
          },
        });
        await tx.eventoCamion.create({
          data: { camionId, estado: camion.estado, usuarioId, nota: `Inicio de reparación in situ: ${dto.descripcion}` },
        });
      } else {
        // SUSTITUIR
        if (!dto.patenteNueva) throw new BadRequestException('Falta patente del camión sustituto');

        // Validar que la patente nueva no esté en uso por un camión activo
        const conflicto = await tx.camion.findFirst({
          where: {
            patente: dto.patenteNueva,
            estado: { notIn: [EstadoCamion.DESPACHADO, EstadoCamion.AVERIADO] },
          },
          select: { id: true, patente: true },
        });
        if (conflicto) {
          throw new BadRequestException(`La patente ${dto.patenteNueva} ya está en uso por otro camión activo`);
        }

        if (dto.numeroTransporteNuevo) {
          const conflictoNumero = await tx.camion.findFirst({
            where: { numeroTransporte: dto.numeroTransporteNuevo },
            select: { id: true },
          });
          if (conflictoNumero) {
            throw new BadRequestException(`El número de transporte ${dto.numeroTransporteNuevo} ya existe`);
          }
        }

        // Cargar datos completos del camión X para heredar a Y
        const x = await tx.camion.findUnique({ where: { id: camionId } });
        if (!x) throw new NotFoundException('Camión no encontrado');

        const estadoY = estadoInicialSustituto(x.estado, x.tipo);
        const numeroTransporteY = dto.numeroTransporteNuevo
          ?? await this.generarNumeroTransporte(x.tipo, tx);

        const y = await tx.camion.create({
          data: {
            patente: dto.patenteNueva,
            numeroTransporte: numeroTransporteY,
            tipo: x.tipo,
            estado: estadoY,
            clienteId: x.clienteId,
            pedidoId: x.pedidoId,
            andenId: x.andenId,
            horaLlegadaPlanificada: x.horaLlegadaPlanificada,
            horaSalidaPlanificada: x.horaSalidaPlanificada,
            horaLlegadaReal: x.horaLlegadaReal,
            cargaPreviaDescripcion: x.cargaPreviaDescripcion,
          },
        });

        // Mover entregas y paradas de X a Y
        await tx.entrega.updateMany({ where: { camionId }, data: { camionId: y.id } });
        await tx.paradaExpedicion.updateMany({ where: { camionId }, data: { camionId: y.id } });

        // Marcar X como AVERIADO y enlazarlo
        await tx.camion.update({
          where: { id: camionId },
          data: {
            estado: EstadoCamion.AVERIADO,
            andenId: null, // X libera el andén; Y ya lo tomó arriba
            reemplazadoPorId: y.id,
            enReparacion: false,
            reparacionDesde: null,
          },
        });

        // Registro de incidente
        await tx.incidenteCamion.create({
          data: {
            camionId,
            tipo: TipoIncidente.AVERIA,
            accion: AccionIncidente.SUSTITUIR,
            estadoCamionEnIncidente: camion.estado,
            descripcion: dto.descripcion,
            registradoPorId: usuarioId,
            camionReemplazoId: y.id,
            resueltoEn: new Date(),
          },
        });

        // Eventos
        await tx.eventoCamion.create({
          data: { camionId, estado: EstadoCamion.AVERIADO, usuarioId, nota: `Avería + sustitución por ${dto.patenteNueva}: ${dto.descripcion}` },
        });
        await tx.eventoCamion.create({
          data: { camionId: y.id, estado: estadoY, usuarioId, nota: `Camión sustituye a ${x.patente} por avería` },
        });
      }

      const final = await tx.camion.findUnique({ where: { id: camionId }, include: INCLUDE_CAMION });
      if (final) this.eventosGateway.emitirCamionActualizado(final as unknown as Record<string, unknown>);
      return final;
    });
  }

  async marcarReparado(camionId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ id: string; enReparacion: boolean; estado: EstadoCamion }>>`
        SELECT id, "enReparacion", estado FROM camiones WHERE id = ${camionId} FOR UPDATE
      `;
      const camion = lock[0];
      if (!camion) throw new NotFoundException('Camión no encontrado');
      if (!camion.enReparacion) throw new BadRequestException('El camión no está en reparación');

      await tx.camion.update({
        where: { id: camionId },
        data: { enReparacion: false, reparacionDesde: null },
      });

      // Cerrar el incidente abierto más reciente
      const incidente = await tx.incidenteCamion.findFirst({
        where: { camionId, accion: AccionIncidente.ESPERAR_REPARACION, resueltoEn: null },
        orderBy: { timestamp: 'desc' },
      });
      if (incidente) {
        await tx.incidenteCamion.update({
          where: { id: incidente.id },
          data: { resueltoEn: new Date() },
        });
      }

      await tx.eventoCamion.create({
        data: { camionId, estado: camion.estado, usuarioId, nota: 'Reparación finalizada' },
      });

      const final = await tx.camion.findUnique({ where: { id: camionId }, include: INCLUDE_CAMION });
      if (final) this.eventosGateway.emitirCamionActualizado(final as unknown as Record<string, unknown>);
      return final;
    });
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
