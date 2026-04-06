import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(soloActivos = true) {
    return this.prisma.producto.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async crear(data: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: number }) {
    const existe = await this.prisma.producto.findUnique({ where: { sku: data.sku } });
    if (existe) throw new ConflictException(`SKU ${data.sku} ya existe`);
    return this.prisma.producto.create({ data });
  }

  async actualizar(id: string, data: { nombre?: string; unidadMedida?: string; pesoKgUnitario?: number; activo?: boolean }) {
    const producto = await this.prisma.producto.findUnique({ where: { id } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return this.prisma.producto.update({ where: { id }, data });
  }

  async importarCsv(filas: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: string }[]) {
    let creados = 0;
    let actualizados = 0;
    const errores: string[] = [];

    for (const fila of filas) {
      if (!fila.sku?.trim() || !fila.nombre?.trim()) {
        errores.push(`Fila inválida: SKU="${fila.sku}" Nombre="${fila.nombre}"`);
        continue;
      }
      const peso = fila.pesoKgUnitario ? parseFloat(fila.pesoKgUnitario) : undefined;
      try {
        const existente = await this.prisma.producto.findUnique({ where: { sku: fila.sku.trim() } });
        if (existente) {
          await this.prisma.producto.update({
            where: { sku: fila.sku.trim() },
            data: { nombre: fila.nombre.trim(), unidadMedida: fila.unidadMedida?.trim() || 'caja', pesoKgUnitario: peso },
          });
          actualizados++;
        } else {
          await this.prisma.producto.create({
            data: { sku: fila.sku.trim(), nombre: fila.nombre.trim(), unidadMedida: fila.unidadMedida?.trim() || 'caja', pesoKgUnitario: peso },
          });
          creados++;
        }
      } catch (e: any) {
        errores.push(`${fila.sku}: ${e.message}`);
      }
    }

    return { creados, actualizados, errores };
  }

  // ─── Items de entrega ────────────────────────────────────────────────────────

  async obtenerItemsEntrega(entregaId: string) {
    const entrega = await this.prisma.entrega.findUnique({
      where: { id: entregaId },
      include: {
        items: { include: { producto: true }, orderBy: { producto: { nombre: 'asc' } } },
        pallets: {
          include: {
            productos: { include: { producto: true } },
          },
        },
      },
    });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');

    // Calcular cantidadCargada por producto sumando todos los pallets
    const cargadoPorProducto: Record<string, number> = {};
    for (const pallet of entrega.pallets) {
      for (const item of pallet.productos) {
        if (item.productoId) {
          cargadoPorProducto[item.productoId] = (cargadoPorProducto[item.productoId] ?? 0) + item.cantidad;
        }
      }
    }

    return entrega.items.map(item => ({
      ...item,
      cantidadCargada: cargadoPorProducto[item.productoId] ?? 0,
    }));
  }

  async setItemsEntrega(entregaId: string, items: { productoId: string; cantidadSolicitada: number }[]) {
    const entrega = await this.prisma.entrega.findUnique({ where: { id: entregaId } });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');

    await this.prisma.entregaItem.deleteMany({ where: { entregaId } });
    await this.prisma.entregaItem.createMany({
      data: items.map(i => ({ entregaId, productoId: i.productoId, cantidadSolicitada: i.cantidadSolicitada })),
    });

    return this.obtenerItemsEntrega(entregaId);
  }
}
