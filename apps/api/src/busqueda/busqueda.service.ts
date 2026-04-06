import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusquedaService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(q: string) {
    if (!q || q.trim().length < 2) return { camiones: [], clientes: [], pallets: [] };

    const termino = q.trim();

    const [camiones, clientes, pallets] = await Promise.all([
      this.prisma.camion.findMany({
        where: {
          OR: [
            { patente:          { contains: termino, mode: 'insensitive' } },
            { numeroTransporte: { contains: termino, mode: 'insensitive' } },
            { cliente: { nombre: { contains: termino, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          patente: true,
          numeroTransporte: true,
          tipo: true,
          estado: true,
          cliente: { select: { nombre: true, codigo: true } },
        },
        take: 5,
        orderBy: { creadoEn: 'desc' },
      }),

      this.prisma.cliente.findMany({
        where: {
          activo: true,
          OR: [
            { nombre: { contains: termino, mode: 'insensitive' } },
            { codigo: { contains: termino, mode: 'insensitive' } },
            { rut:    { contains: termino, mode: 'insensitive' } },
            { pais:   { contains: termino, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nombre: true,
          codigo: true,
          tipoDestino: true,
          pais: true,
          _count: { select: { camiones: true } },
        },
        take: 5,
      }),

      this.prisma.pallet.findMany({
        where: {
          codigoUnico: { contains: termino, mode: 'insensitive' },
        },
        select: {
          id: true,
          codigoUnico: true,
          estado: true,
          entrega: { select: { camion: { select: { numeroTransporte: true, patente: true } } } },
        },
        take: 5,
        orderBy: { timestampInicio: 'desc' },
      }),
    ]);

    return { camiones, clientes, pallets };
  }
}
