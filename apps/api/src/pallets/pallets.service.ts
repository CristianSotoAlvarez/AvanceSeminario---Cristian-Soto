import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoPallet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearPalletDto } from './dto/crear-pallet.dto';
import { AgregarProductoDto } from './dto/agregar-producto.dto';
import { FiltrosPalletDto } from './dto/filtros-pallet.dto';

function generarUMP(): string {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PLT-${fecha}-${aleatorio}`;
}

const INCLUDE_PALLET = {
  productos: true,
  pickinero: { select: { id: true, nombre: true, rol: true } },
  cargador:  { select: { id: true, nombre: true, rol: true } },
  entrega:   { select: { id: true, camion: { select: { id: true, patente: true, numeroTransporte: true } } } },
  pedido:    { select: { id: true, numero: true } },
};

// Transiciones válidas: estado actual → estados siguientes permitidos
const TRANSICIONES: Record<EstadoPallet, EstadoPallet[]> = {
  EN_ARMADO:  [EstadoPallet.ARMADO],
  ARMADO:     [EstadoPallet.CARGADO],
  CARGADO:    [EstadoPallet.VERIFICADO],
  VERIFICADO: [],
};

@Injectable()
export class PalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltrosPalletDto) {
    const where: any = {};
    if (filtros.estado)     where.estado     = filtros.estado;
    if (filtros.edificioId) where.edificioId = filtros.edificioId;
    if (filtros.entregaId)  where.entregaId  = filtros.entregaId;

    if (filtros.fecha) {
      const inicioDia = new Date(`${filtros.fecha}T00:00:00.000Z`);
      const finDia    = new Date(`${filtros.fecha}T23:59:59.999Z`);
      where.timestampInicio = { gte: inicioDia, lte: finDia };
    }

    const pagina    = filtros.pagina    ?? 1;
    const porPagina = filtros.porPagina ?? 30;
    const skip      = (pagina - 1) * porPagina;

    const [total, datos] = await Promise.all([
      this.prisma.pallet.count({ where }),
      this.prisma.pallet.findMany({
        where,
        include: INCLUDE_PALLET,
        orderBy: { timestampInicio: 'desc' },
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
    const pallet = await this.prisma.pallet.findUnique({
      where: { id },
      include: INCLUDE_PALLET,
    });
    if (!pallet) throw new NotFoundException('Pallet no encontrado');
    return pallet;
  }

  async crear(dto: CrearPalletDto, pickineroId: string) {
    // Generar UMP único automáticamente si no se proporcionó
    let codigoUnico = dto.codigoUnico;
    if (!codigoUnico) {
      let intentos = 0;
      do {
        codigoUnico = generarUMP();
        const existe = await this.prisma.pallet.findUnique({ where: { codigoUnico } });
        if (!existe) break;
        intentos++;
      } while (intentos < 5);
    } else {
      const existente = await this.prisma.pallet.findUnique({ where: { codigoUnico } });
      if (existente) throw new BadRequestException(`Ya existe un pallet con código ${codigoUnico}`);
    }

    return this.prisma.pallet.create({
      data: {
        codigoUnico: codigoUnico!,
        entregaId:   dto.entregaId,
        pedidoId:    dto.pedidoId,
        edificioId:  dto.edificioId,
        pickineroId,
        estado:      EstadoPallet.EN_ARMADO,
      },
      include: INCLUDE_PALLET,
    });
  }

  async agregarProducto(palletId: string, dto: AgregarProductoDto) {
    const pallet = await this.prisma.pallet.findUnique({ where: { id: palletId } });
    if (!pallet) throw new NotFoundException('Pallet no encontrado');
    if (pallet.estado !== EstadoPallet.EN_ARMADO) {
      throw new BadRequestException('Solo se pueden agregar productos a pallets en estado EN_ARMADO');
    }

    await this.prisma.productoPallet.create({
      data: { palletId, ...dto },
    });

    return this.prisma.pallet.findUnique({
      where: { id: palletId },
      include: INCLUDE_PALLET,
    });
  }

  async cambiarEstado(palletId: string, nuevoEstado: EstadoPallet, usuarioId: string) {
    const pallet = await this.prisma.pallet.findUnique({ where: { id: palletId } });
    if (!pallet) throw new NotFoundException('Pallet no encontrado');

    const permitidos = TRANSICIONES[pallet.estado];
    if (!permitidos.includes(nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${pallet.estado} → ${nuevoEstado}`,
      );
    }

    const datos: any = { estado: nuevoEstado };

    if (nuevoEstado === EstadoPallet.ARMADO) {
      const fin = new Date();
      datos.timestampFin = fin;
      datos.tiempoArmadoSegundos = Math.round(
        (fin.getTime() - pallet.timestampInicio.getTime()) / 1000,
      );
    }

    if (nuevoEstado === EstadoPallet.CARGADO) {
      datos.cargadorId = usuarioId;
    }

    return this.prisma.pallet.update({
      where: { id: palletId },
      data: datos,
      include: INCLUDE_PALLET,
    });
  }
}
