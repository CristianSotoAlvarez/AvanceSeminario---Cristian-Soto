/**
 * Camiones de HOY con perfiles de riesgo deliberadamente contrastantes,
 * para demostrar en vivo el modelo predictivo (árboles de decisión de
 * riesgo OTIF y riesgo SAG) durante la defensa.
 *
 * No modifica el dataset histórico — solo agrega registros de hoy,
 * complementando a seed-demo-hoy.ts.
 *
 * Ejecutar con:  npx ts-node prisma/seed-demo-prediccion.ts
 */
import { PrismaClient, EstadoCamion, TipoCamion, TipoEdificio, EstadoParada } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔮 Creando camiones de hoy para demostrar el modelo predictivo...\n');

  const ahora = new Date();
  function hoy(hora: number, min = 0) {
    const d = new Date(ahora);
    d.setHours(hora, min, 0, 0);
    return d;
  }

  const aves = await prisma.edificio.findFirst({ where: { tipo: 'AVES' } });
  const cerdo = await prisma.edificio.findFirst({ where: { tipo: 'CERDO' } });
  const frigorifico = await prisma.edificio.findFirst({ where: { tipo: 'FRIGORIFICO' } });
  if (!aves || !cerdo || !frigorifico) throw new Error('Faltan edificios base. Corré npm run prisma:seed primero.');

  const andenA5 = await prisma.anden.findUnique({ where: { codigo: 'A5' } });
  const andenC3 = await prisma.anden.findUnique({ where: { codigo: 'C3' } });
  const andenF3 = await prisma.anden.findUnique({ where: { codigo: 'F3' } });

  const clienteNac = await prisma.cliente.findFirst({ where: { codigo: 'CLI-N005' } });
  const clienteInter = await prisma.cliente.findFirst({ where: { codigo: 'CLI-P004' } });
  const clienteExp1 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-E002' } });
  const clienteExp2 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-E006' } });

  // Perfiles pensados para caer en ramas distintas del árbol (umbral principal en 16.5 pallets)
  const camiones = [
    {
      patente: 'PRED-01', tipo: TipoCamion.NACIONAL,
      descripcion: 'Nacional, pocos pallets → riesgo OTIF bajo',
      llegada: hoy(9, 0), edificio: TipoEdificio.AVES, anden: andenA5,
      cantidadPallets: 5, cliente: clienteNac,
    },
    {
      patente: 'PRED-02', tipo: TipoCamion.NACIONAL,
      descripcion: 'Nacional, volumen alto para su categoría → riesgo intermedio',
      llegada: hoy(11, 30), edificio: TipoEdificio.CERDO, anden: andenC3,
      cantidadPallets: 12, cliente: clienteNac,
    },
    {
      patente: 'PRED-03', tipo: TipoCamion.INTERPLANTA,
      descripcion: 'Interplanta, volumen medio → riesgo bajo-medio',
      llegada: hoy(13, 0), edificio: TipoEdificio.CERDO, anden: null,
      cantidadPallets: 10, cliente: clienteInter,
    },
    {
      patente: 'PRED-04', tipo: TipoCamion.EXPORTACION,
      descripcion: 'Exportación, pallets al límite del umbral (16-17) → punto de quiebre del árbol',
      llegada: hoy(8, 30), edificio: TipoEdificio.FRIGORIFICO, anden: andenF3,
      cantidadPallets: 17, cliente: clienteExp1,
    },
    {
      patente: 'PRED-05', tipo: TipoCamion.EXPORTACION,
      descripcion: 'Exportación, pallets altos → riesgo OTIF alto + riesgo SAG evaluable',
      llegada: hoy(15, 0), edificio: TipoEdificio.AVES, anden: null,
      cantidadPallets: 24, cliente: clienteExp2,
    },
  ];

  for (const c of camiones) {
    const existente = await prisma.camion.findFirst({ where: { patente: c.patente } });
    if (existente) {
      console.log(`  ⏭️  ${c.patente} ya existe, saltando...`);
      continue;
    }

    if (c.anden) {
      await prisma.anden.update({ where: { id: c.anden.id }, data: { ocupado: true } });
    }

    const estado = c.anden ? EstadoCamion.ASIGNADO : EstadoCamion.ESPERADO;

    const camion = await prisma.camion.create({
      data: {
        patente: c.patente,
        tipo: c.tipo,
        estado,
        horaLlegadaPlanificada: c.llegada,
        horaSalidaPlanificada: new Date(c.llegada.getTime() + (c.tipo === 'EXPORTACION' ? 360 : 180) * 60000),
        horaLlegadaReal: c.anden ? c.llegada : null,
        clienteId: c.cliente?.id ?? null,
        andenId: c.anden?.id ?? null,
      },
    });

    await prisma.paradaExpedicion.create({
      data: {
        camionId: camion.id,
        andenId: c.anden?.id ?? null,
        edificioTipo: c.edificio,
        orden: 1,
        estado: c.anden ? EstadoParada.EN_PROCESO : EstadoParada.PENDIENTE,
        cantidadPalletsSolicitados: c.cantidadPallets,
        horaInicio: c.anden ? c.llegada : null,
      },
    });

    console.log(`  ✅ ${c.patente} (${c.cantidadPallets} pallets) — ${c.descripcion}`);
  }

  console.log('\n🎉 Camiones de predicción creados. Entra a la ficha de cada uno para ver la tarjeta de riesgo:');
  for (const c of camiones) console.log(`   /camiones — buscar ${c.patente}`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
