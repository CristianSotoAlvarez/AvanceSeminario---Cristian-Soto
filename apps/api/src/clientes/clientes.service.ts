import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TipoCamion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(tipoDestino?: TipoCamion) {
    return this.prisma.cliente.findMany({
      where: {
        ...(tipoDestino ? { tipoDestino } : {}),
        activo: true,
      },
      include: {
        _count: { select: { camiones: true } },
      },
      orderBy: [{ tipoDestino: 'asc' }, { nombre: 'asc' }],
    });
  }

  async obtener(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        camiones: {
          select: { id: true, patente: true, numeroTransporte: true, estado: true, horaLlegadaPlanificada: true },
          orderBy: { creadoEn: 'desc' },
          take: 10,
        },
        _count: { select: { camiones: true } },
      },
    });

    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return cliente;
  }

  private async generarCodigo(tipo: string): Promise<string> {
    const prefijo = tipo === 'NACIONAL' ? 'CLI-N' : tipo === 'EXPORTACION' ? 'CLI-E' : 'CLI-P';
    const ultimo = await this.prisma.cliente.findFirst({
      where: { codigo: { startsWith: prefijo } },
      orderBy: { creadoEn: 'desc' },
      select: { codigo: true },
    });
    const siguiente = ultimo?.codigo
      ? parseInt(ultimo.codigo.replace(prefijo, '')) + 1
      : 1;
    return `${prefijo}${String(siguiente).padStart(3, '0')}`;
  }

  async crear(dto: CrearClienteDto) {
    if (dto.rut) {
      const existe = await this.prisma.cliente.findUnique({ where: { rut: dto.rut } });
      if (existe) throw new ConflictException(`Ya existe un cliente con RUT ${dto.rut}`);
    }

    const codigo = dto.codigo ?? await this.generarCodigo(dto.tipoDestino);

    if (dto.codigo) {
      const existe = await this.prisma.cliente.findUnique({ where: { codigo } });
      if (existe) throw new ConflictException(`Ya existe un cliente con código ${codigo}`);
    }

    return this.prisma.cliente.create({
      data: {
        nombre:      dto.nombre,
        rut:         dto.rut,
        codigo,
        tipoDestino: dto.tipoDestino,
        pais:        dto.pais,
        activo:      dto.activo ?? true,
      },
    });
  }

  async actualizar(id: string, dto: ActualizarClienteDto) {
    await this.obtener(id);

    if (dto.rut) {
      const existe = await this.prisma.cliente.findFirst({ where: { rut: dto.rut, NOT: { id } } });
      if (existe) throw new ConflictException(`Ya existe un cliente con RUT ${dto.rut}`);
    }
    if (dto.codigo) {
      const existe = await this.prisma.cliente.findFirst({ where: { codigo: dto.codigo, NOT: { id } } });
      if (existe) throw new ConflictException(`Ya existe un cliente con código ${dto.codigo}`);
    }

    return this.prisma.cliente.update({
      where: { id },
      data: {
        ...(dto.nombre      !== undefined && { nombre:      dto.nombre }),
        ...(dto.rut         !== undefined && { rut:         dto.rut }),
        ...(dto.codigo      !== undefined && { codigo:      dto.codigo }),
        ...(dto.tipoDestino !== undefined && { tipoDestino: dto.tipoDestino }),
        ...(dto.pais        !== undefined && { pais:        dto.pais }),
        ...(dto.activo      !== undefined && { activo:      dto.activo }),
      },
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    // Soft delete
    return this.prisma.cliente.update({ where: { id }, data: { activo: false } });
  }
}
