import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EstadoCamion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';
import { EventosGateway } from '../eventos/eventos.gateway';

const CAMION_INFO_PUBLICA = {
  id: true,
  patente: true,
  numeroTransporte: true,
  tipo: true,
  estado: true,
  horaLlegadaPlanificada: true,
  horaLlegadaReal: true,
  horaSalidaPlanificada: true,
  cliente: { select: { nombre: true, pais: true } },
  pedido: { select: { numero: true, cliente: { select: { nombre: true } } } },
  anden: { select: { codigo: true } },
} as const;

function mensajeYaRegistrado(estado: EstadoCamion, horaLlegadaReal: Date | null): string {
  if (estado === EstadoCamion.DESPACHADO) return 'Este camión ya fue despachado.';
  if (estado === EstadoCamion.AVERIADO) return 'Camión averiado, contactar coordinación.';
  const hora = horaLlegadaReal ? new Date(horaLlegadaReal).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : null;
  return hora
    ? `Camión ya registrado (estado actual: ${estado}, llegada ${hora}).`
    : `Camión ya registrado (estado actual: ${estado}).`;
}

@Injectable()
export class PorteriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
    private readonly eventos: EventosGateway,
  ) {}

  /** Valida token y retorna información del camión (público). */
  async obtenerPorToken(token: string) {
    let payload;
    try {
      payload = this.qr.validarToken(token);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw new NotFoundException('QR no válido o expirado.');
      }
      throw e;
    }
    if (payload.tipo !== 'camion') {
      throw new NotFoundException('QR no corresponde a un camión.');
    }
    const camion = await this.prisma.camion.findUnique({
      where: { id: payload.entidadId },
      select: CAMION_INFO_PUBLICA,
    });
    if (!camion) throw new NotFoundException('Camión no encontrado.');
    return camion;
  }

  /** Confirma la llegada del camión vía token (público, sin usuario). */
  async confirmarPorToken(token: string) {
    let payload;
    try {
      payload = this.qr.validarToken(token);
    } catch {
      throw new NotFoundException('QR no válido o expirado.');
    }
    if (payload.tipo !== 'camion') throw new NotFoundException('QR no corresponde a un camión.');
    return this.confirmarLlegada(payload.entidadId, null, 'Llegada registrada por portería (QR)');
  }

  /** Lista los camiones planificados para hoy (autenticado). */
  async listarCamionesHoy() {
    const ahora = new Date();
    const inicio = new Date(ahora); inicio.setHours(0, 0, 0, 0);
    const fin = new Date(ahora); fin.setHours(23, 59, 59, 999);
    return this.prisma.camion.findMany({
      where: { horaLlegadaPlanificada: { gte: inicio, lte: fin }, estado: { not: EstadoCamion.AVERIADO } },
      orderBy: { horaLlegadaPlanificada: 'asc' },
      select: CAMION_INFO_PUBLICA,
    });
  }

  /** Confirma la llegada por ID (autenticado, registra usuario). */
  async confirmarPorId(camionId: string, usuarioId: string) {
    return this.confirmarLlegada(camionId, usuarioId, 'Llegada registrada por portería (manual)');
  }

  private async confirmarLlegada(camionId: string, usuarioId: string | null, nota: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock pesimista para evitar carrera entre QR y manual al mismo tiempo
      const lock = await tx.$queryRaw<Array<{ id: string; estado: EstadoCamion; horaLlegadaReal: Date | null }>>`
        SELECT id, estado, "horaLlegadaReal" FROM camiones WHERE id = ${camionId} FOR UPDATE
      `;
      const camion = lock[0];
      if (!camion) throw new NotFoundException('Camión no encontrado.');

      if (camion.estado !== EstadoCamion.ESPERADO) {
        throw new ConflictException(mensajeYaRegistrado(camion.estado, camion.horaLlegadaReal));
      }

      await tx.camion.update({
        where: { id: camionId },
        data: { estado: EstadoCamion.EN_PORTERIA, horaLlegadaReal: new Date() },
      });

      await tx.eventoCamion.create({
        data: { camionId, estado: EstadoCamion.EN_PORTERIA, usuarioId, nota },
      });

      const final = await tx.camion.findUnique({ where: { id: camionId }, select: CAMION_INFO_PUBLICA });
      if (final) this.eventos.emitirCamionActualizado(final as unknown as Record<string, unknown>);
      return final;
    });
  }
}
