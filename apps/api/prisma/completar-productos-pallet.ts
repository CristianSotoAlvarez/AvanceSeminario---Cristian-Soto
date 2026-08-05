/**
 * Script de recuperación puntual: completa productos_pallet para los pallets
 * que quedaron sin productos por el corte de disco durante generar-datos-demo.ts.
 * Idempotente: solo procesa pallets que aún no tienen ningún ProductoPallet.
 * Usa lotes pequeños para no repetir el problema de espacio en disco.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LOTE = 200;

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const random = rng(918273);
function entreEnteros(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function elemAleatorio<T>(arr: T[]): T { return arr[entreEnteros(0, arr.length - 1)]; }

let contador = 0;
function nuevoId() { contador++; return `ppr_${contador.toString(36)}`; }

async function main() {
  const productos = await prisma.producto.findMany();
  console.log(`📦 Catálogo: ${productos.length} productos`);

  const pendientes = await prisma.pallet.findMany({
    where: { productos: { none: {} } },
    select: { id: true },
  });
  console.log(`🔍 Pallets sin productos: ${pendientes.length}`);

  const filas: any[] = [];
  for (const p of pendientes) {
    const cuantos = entreEnteros(2, 3);
    const seleccion = [...productos].sort(() => random() - 0.5).slice(0, cuantos);
    for (const prod of seleccion) {
      const cantidad = entreEnteros(20, 80);
      filas.push({
        id: nuevoId(),
        palletId: p.id,
        productoId: prod.id,
        descripcion: prod.nombre,
        cantidad,
        pesoKg: prod.pesoKgUnitario ? cantidad * prod.pesoKgUnitario : null,
      });
    }
  }
  console.log(`📝 Filas a insertar: ${filas.length}`);

  for (let i = 0; i < filas.length; i += LOTE) {
    await prisma.productoPallet.createMany({ data: filas.slice(i, i + LOTE) });
    if ((i / LOTE) % 100 === 0) console.log(`  ... ${Math.min(i + LOTE, filas.length)}/${filas.length}`);
  }

  console.log('✅ Productos por pallet completados.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
