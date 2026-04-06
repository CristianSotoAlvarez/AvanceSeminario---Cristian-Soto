import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoPallet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventosGateway } from '../eventos/eventos.gateway';
import { CrearPalletDto } from './dto/crear-pallet.dto';
import { AgregarProductoDto } from './dto/agregar-producto.dto';
import { FiltrosPalletDto } from './dto/filtros-pallet.dto';

function generarUMP(): string {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `UMP-${fecha}-${aleatorio}`;
}

const INCLUDE_PALLET = {
  productos: { include: { producto: true }, orderBy: { producto: { nombre: 'asc' as const } } },
  pickinero: { select: { id: true, nombre: true, rol: true } },
  cargador:  { select: { id: true, nombre: true, rol: true } },
  entrega:   {
    select: {
      id: true,
      numero: true,
      items: { include: { producto: true }, orderBy: { producto: { nombre: 'asc' as const } } },
      camion: { select: { id: true, patente: true, numeroTransporte: true, cliente: true } },
      parada: { select: { edificioTipo: true } },
    },
  },
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventosGateway: EventosGateway,
  ) {}

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

  async crear(dto: CrearPalletDto, pickineroId: string, _rol?: string) {
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

    return this.prisma.pallet.findUnique({ where: { id: palletId }, include: INCLUDE_PALLET });
  }

  /** Establece la cantidad de un producto del catálogo en el pallet (upsert) */
  async setItemPallet(palletId: string, productoId: string, cantidad: number) {
    const pallet = await this.prisma.pallet.findUnique({ where: { id: palletId } });
    if (!pallet) throw new NotFoundException('Pallet no encontrado');
    if (pallet.estado !== EstadoPallet.EN_ARMADO) {
      throw new BadRequestException('Solo se pueden editar productos de pallets EN_ARMADO');
    }

    const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const existente = await this.prisma.productoPallet.findFirst({ where: { palletId, productoId } });

    if (cantidad <= 0) {
      if (existente) await this.prisma.productoPallet.delete({ where: { id: existente.id } });
    } else if (existente) {
      await this.prisma.productoPallet.update({
        where: { id: existente.id },
        data: { cantidad, descripcion: producto.nombre, pesoKg: producto.pesoKgUnitario ? producto.pesoKgUnitario * cantidad : undefined },
      });
    } else {
      await this.prisma.productoPallet.create({
        data: {
          palletId,
          productoId,
          cantidad,
          descripcion: producto.nombre,
          pesoKg: producto.pesoKgUnitario ? producto.pesoKgUnitario * cantidad : undefined,
        },
      });
    }

    return this.prisma.pallet.findUnique({ where: { id: palletId }, include: INCLUDE_PALLET });
  }

  /** Cierra el pallet actual (→ ARMADO) y crea uno nuevo para la misma entrega */
  async cerrarYCrearNuevo(palletId: string, pickineroId: string) {
    const pallet = await this.prisma.pallet.findUnique({ where: { id: palletId }, include: { entrega: true } });
    if (!pallet) throw new NotFoundException('Pallet no encontrado');
    if (pallet.estado !== EstadoPallet.EN_ARMADO) {
      throw new BadRequestException('Solo se pueden cerrar pallets EN_ARMADO');
    }

    const fin = new Date();
    await this.prisma.pallet.update({
      where: { id: palletId },
      data: {
        estado: EstadoPallet.ARMADO,
        timestampFin: fin,
        tiempoArmadoSegundos: Math.round((fin.getTime() - pallet.timestampInicio.getTime()) / 1000),
      },
    });

    let codigoUnico: string;
    let intentos = 0;
    do {
      codigoUnico = generarUMP();
      const existe = await this.prisma.pallet.findUnique({ where: { codigoUnico } });
      if (!existe) break;
      intentos++;
    } while (intentos < 5);

    const nuevo = await this.prisma.pallet.create({
      data: {
        codigoUnico: codigoUnico!,
        entregaId: pallet.entregaId,
        edificioId: pallet.edificioId,
        pickineroId,
        estado: EstadoPallet.EN_ARMADO,
      },
      include: INCLUDE_PALLET,
    });

    this.eventosGateway.emitirCamionActualizado({ palletActualizado: palletId });
    return nuevo;
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

    const resultado = await this.prisma.pallet.update({
      where: { id: palletId },
      data: datos,
      include: INCLUDE_PALLET,
    });
    this.eventosGateway.emitirCamionActualizado({ palletActualizado: resultado.id });
    return resultado;
  }
}
