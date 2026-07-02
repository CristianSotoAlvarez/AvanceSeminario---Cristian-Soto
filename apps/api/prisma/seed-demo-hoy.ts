import { PrismaClient, EstadoCamion, TipoCamion, TipoEdificio } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚛 Creando camiones de hoy para demo en vivo...\n');

  const ahora = new Date();
  function hoy(hora: number, min = 0) {
    const d = new Date(ahora);
    d.setHours(hora, min, 0, 0);
    return d;
  }

  // Obtener referencias
  const jefe = await prisma.usuario.findFirst({ where: { rol: 'JEFE_DESPACHO' } });
  const pickinero = await prisma.usuario.findFirst({ where: { rol: 'PICKINERO' } });
  const cargador = await prisma.usuario.findFirst({ where: { rol: 'CARGADOR' } });
  const inspector = await prisma.usuario.findFirst({ where: { rol: 'SAG' } });

  const aves = await prisma.edificio.findFirst({ where: { tipo: 'AVES' } });
  const cerdo = await prisma.edificio.findFirst({ where: { tipo: 'CERDO' } });
  const frigorifico = await prisma.edificio.findFirst({ where: { tipo: 'FRIGORIFICO' } });

  const andenA2 = await prisma.anden.findUnique({ where: { codigo: 'A2' } });
  const andenA3 = await prisma.anden.findUnique({ where: { codigo: 'A3' } });
  const andenC1 = await prisma.anden.findUnique({ where: { codigo: 'C1' } });
  const andenC2 = await prisma.anden.findUnique({ where: { codigo: 'C2' } });

  // Obtener algunos clientes
  const clienteNac1 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-N001' } });
  const clienteNac2 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-N002' } });
  const clienteNac3 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-N003' } });
  const clienteExp1 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-E001' } });
  const clienteExp2 = await prisma.cliente.findFirst({ where: { codigo: 'CLI-E003' } });
  const clienteInter = await prisma.cliente.findFirst({ where: { codigo: 'CLI-P001' } });

  // Obtener productos
  const productos = await prisma.producto.findMany();
  const prodAve1 = productos.find(p => p.sku === 'AVE-001');
  const prodAve2 = productos.find(p => p.sku === 'AVE-002');
  const prodAve3 = productos.find(p => p.sku === 'AVE-003');
  const prodCer1 = productos.find(p => p.sku === 'CER-001');
  const prodCer2 = productos.find(p => p.sku === 'CER-002');
  const prodFri1 = productos.find(p => p.sku === 'FRI-001');
  const prodFri2 = productos.find(p => p.sku === 'FRI-002');

  if (!jefe || !aves || !cerdo || !frigorifico) {
    console.error('❌ Faltan datos base. Ejecuta primero el seed principal.');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CAMIONES DE HOY — cada uno en un estado distinto para demo
  // ═══════════════════════════════════════════════════════════════════

  const camionesHoy = [
    // ── 1. ESPERADO: llega en 1 hora, pueden registrar llegada en portería ──
    {
      patente: 'DEMO-01',
      tipo: TipoCamion.NACIONAL,
      estado: EstadoCamion.ESPERADO,
      llegadaPlan: hoy(ahora.getHours() + 1, 0),
      salidaPlan: hoy(ahora.getHours() + 5, 0),
      clienteId: clienteNac1?.id,
      edificios: [TipoEdificio.AVES],
      descripcion: 'Walmart — Pollo entero y pechuga',
    },
    // ── 2. ESPERADO: llega en 2 horas ──
    {
      patente: 'DEMO-02',
      tipo: TipoCamion.EXPORTACION,
      estado: EstadoCamion.ESPERADO,
      llegadaPlan: hoy(ahora.getHours() + 2, 30),
      salidaPlan: hoy(ahora.getHours() + 7, 0),
      clienteId: clienteExp1?.id,
      edificios: [TipoEdificio.CERDO, TipoEdificio.FRIGORIFICO],
      descripcion: 'China National — Costillas + procesados',
    },
    // ── 3. EN_PORTERIA: ya llegó, listo para asignar andén ──
    {
      patente: 'DEMO-03',
      tipo: TipoCamion.NACIONAL,
      estado: EstadoCamion.EN_PORTERIA,
      llegadaPlan: hoy(ahora.getHours() - 1, 0),
      salidaPlan: hoy(ahora.getHours() + 3, 0),
      llegadaReal: hoy(ahora.getHours() - 1, 5),
      clienteId: clienteNac2?.id,
      edificios: [TipoEdificio.AVES],
      descripcion: 'Cencosud — Alitas y muslo',
    },
    // ── 4. EN_PORTERIA: esperando asignación de andén ──
    {
      patente: 'DEMO-04',
      tipo: TipoCamion.INTERPLANTA,
      estado: EstadoCamion.EN_PORTERIA,
      llegadaPlan: hoy(ahora.getHours() - 1, 30),
      salidaPlan: hoy(ahora.getHours() + 4, 0),
      llegadaReal: hoy(ahora.getHours() - 1, 25),
      clienteId: clienteInter?.id,
      edificios: [TipoEdificio.CERDO],
      descripcion: 'Planta Rosario — Pernil y lomo',
    },
    // ── 5. ASIGNADO a andén A2, listo para empezar carga ──
    {
      patente: 'DEMO-05',
      tipo: TipoCamion.NACIONAL,
      estado: EstadoCamion.ASIGNADO,
      llegadaPlan: hoy(ahora.getHours() - 2, 0),
      salidaPlan: hoy(ahora.getHours() + 2, 0),
      llegadaReal: hoy(ahora.getHours() - 2, 10),
      clienteId: clienteNac3?.id,
      andenId: andenA2?.id,
      edificios: [TipoEdificio.AVES],
      descripcion: 'SMU Unimarc — Pollo trozado',
      crearEntregaConItems: true,
    },
    // ── 6. EN_CARGA en andén C1, con pallets en proceso ──
    {
      patente: 'DEMO-06',
      tipo: TipoCamion.EXPORTACION,
      estado: EstadoCamion.EN_CARGA,
      llegadaPlan: hoy(ahora.getHours() - 3, 0),
      salidaPlan: hoy(ahora.getHours() + 1, 0),
      llegadaReal: hoy(ahora.getHours() - 3, 0),
      clienteId: clienteExp2?.id,
      andenId: andenC1?.id,
      edificios: [TipoEdificio.CERDO],
      descripcion: 'Itoham Japón — Costillas y chuletas',
      crearPallets: true,
    },
    // ── 7. EN_TUNEL_FRIO: pasó por carga, ahora en enfriamiento ──
    {
      patente: 'DEMO-07',
      tipo: TipoCamion.NACIONAL,
      estado: EstadoCamion.EN_TUNEL_FRIO,
      llegadaPlan: hoy(ahora.getHours() - 4, 0),
      salidaPlan: hoy(ahora.getHours(), 30),
      llegadaReal: hoy(ahora.getHours() - 4, 5),
      clienteId: clienteNac1?.id,
      andenId: andenA3?.id,
      edificios: [TipoEdificio.AVES],
      descripcion: 'Walmart — Pechuga congelada (en túnel)',
    },
    // ── 8. ESPERANDO_SAG: listo para inspección, SAG puede aprobar/rechazar ──
    {
      patente: 'DEMO-08',
      tipo: TipoCamion.EXPORTACION,
      estado: EstadoCamion.ESPERANDO_SAG,
      llegadaPlan: hoy(ahora.getHours() - 5, 0),
      salidaPlan: hoy(ahora.getHours(), 0),
      llegadaReal: hoy(ahora.getHours() - 5, 0),
      clienteId: clienteExp1?.id,
      andenId: andenC2?.id,
      edificios: [TipoEdificio.CERDO, TipoEdificio.FRIGORIFICO],
      descripcion: 'China National — Esperando inspección SAG',
    },
    // ── 9. LISTO: aprobado por SAG, puede ser despachado ──
    {
      patente: 'DEMO-09',
      tipo: TipoCamion.NACIONAL,
      estado: EstadoCamion.LISTO,
      llegadaPlan: hoy(ahora.getHours() - 6, 0),
      salidaPlan: hoy(ahora.getHours() - 1, 0),
      llegadaReal: hoy(ahora.getHours() - 6, 0),
      clienteId: clienteNac2?.id,
      edificios: [TipoEdificio.AVES],
      descripcion: 'Cencosud — Aprobado, listo para despachar',
    },
  ];

  for (const c of camionesHoy) {
    // Verificar si ya existe
    const existe = await prisma.camion.findFirst({ where: { patente: c.patente } });
    if (existe) {
      console.log(`  ⏭️  ${c.patente} ya existe, saltando...`);
      continue;
    }

    // Marcar andén como ocupado si corresponde
    if ((c as any).andenId) {
      await prisma.anden.update({ where: { id: (c as any).andenId }, data: { ocupado: true } });
    }

    const camion = await prisma.camion.create({
      data: {
        patente: c.patente,
        tipo: c.tipo,
        estado: c.estado,
        horaLlegadaPlanificada: c.llegadaPlan,
        horaSalidaPlanificada: c.salidaPlan,
        horaLlegadaReal: (c as any).llegadaReal || null,
        horaSalidaReal: null,
        clienteId: c.clienteId || null,
        andenId: (c as any).andenId || null,
      },
    });

    // Crear paradas
    const edificiosArr: TipoEdificio[] = [...c.edificios];
    const edificiosOrdenados = edificiosArr.includes(TipoEdificio.FRIGORIFICO)
      ? [...edificiosArr.filter(e => e !== TipoEdificio.FRIGORIFICO), TipoEdificio.FRIGORIFICO]
      : edificiosArr;

    const paradasCreadas = [];
    for (let idx = 0; idx < edificiosOrdenados.length; idx++) {
      const parada = await prisma.paradaExpedicion.create({
        data: {
          camionId: camion.id,
          edificioTipo: edificiosOrdenados[idx],
          orden: idx + 1,
          estado: c.estado === EstadoCamion.LISTO ? 'COMPLETADO' : idx === 0 ? 'EN_PROCESO' : 'PENDIENTE',
          horaInicio: (c as any).llegadaReal || null,
          ...(idx === 0 && (c as any).andenId ? { andenId: (c as any).andenId } : {}),
        },
      });
      paradasCreadas.push(parada);
    }

    // Crear eventos de historial
    const eventos: { estado: EstadoCamion; timestamp: Date }[] = [
      { estado: EstadoCamion.ESPERADO, timestamp: c.llegadaPlan },
    ];

    if ((c as any).llegadaReal) {
      eventos.push({ estado: EstadoCamion.EN_PORTERIA, timestamp: (c as any).llegadaReal });
    }

    const estadosOrden: EstadoCamion[] = [
      EstadoCamion.ASIGNADO,
      EstadoCamion.EN_CARGA,
      EstadoCamion.EN_TUNEL_FRIO,
      EstadoCamion.ESPERANDO_SAG,
      EstadoCamion.APROBADO_SAG,
      EstadoCamion.LISTO,
    ];

    const idxEstadoActual = estadosOrden.indexOf(c.estado);
    if (idxEstadoActual >= 0 && (c as any).llegadaReal) {
      for (let i = 0; i <= idxEstadoActual; i++) {
        const minutosOffset = (i + 1) * 20;
        const ts = new Date((c as any).llegadaReal.getTime() + minutosOffset * 60000);
        eventos.push({ estado: estadosOrden[i], timestamp: ts });
      }
    }

    for (const ev of eventos) {
      await prisma.eventoCamion.create({
        data: {
          camionId: camion.id,
          estado: ev.estado,
          usuarioId: jefe!.id,
          timestamp: ev.timestamp,
        },
      });
    }

    // Crear entrega con items para DEMO-05 (ASIGNADO)
    if ((c as any).crearEntregaConItems && paradasCreadas[0]) {
      const entrega = await prisma.entrega.create({
        data: { camionId: camion.id, paradaId: paradasCreadas[0].id },
      });
      if (prodAve1 && prodAve3) {
        await prisma.entregaItem.createMany({
          data: [
            { entregaId: entrega.id, productoId: prodAve1.id, cantidadSolicitada: 20 },
            { entregaId: entrega.id, productoId: prodAve3.id, cantidadSolicitada: 15 },
          ],
        });
      }
    }

    // Crear pallets para DEMO-06 (EN_CARGA)
    if ((c as any).crearPallets && paradasCreadas[0]) {
      const entrega = await prisma.entrega.create({
        data: { camionId: camion.id, paradaId: paradasCreadas[0].id },
      });

      if (prodCer1 && prodCer2) {
        await prisma.entregaItem.createMany({
          data: [
            { entregaId: entrega.id, productoId: prodCer1.id, cantidadSolicitada: 25 },
            { entregaId: entrega.id, productoId: prodCer2.id, cantidadSolicitada: 18 },
          ],
        });

        // Pallet 1: ARMADO (listo para cargar)
        const pallet1 = await prisma.pallet.create({
          data: {
            codigoUnico: `DEMO-P1-${Date.now().toString(36).toUpperCase()}`,
            entregaId: entrega.id,
            pickineroId: pickinero?.id,
            edificioId: cerdo?.id,
            estado: 'ARMADO',
            timestampInicio: new Date(Date.now() - 3600000),
            timestampFin: new Date(Date.now() - 1800000),
            tiempoArmadoSegundos: 1800,
          },
        });
        await prisma.productoPallet.createMany({
          data: [
            { palletId: pallet1.id, productoId: prodCer1.id, descripcion: 'Costillas de cerdo', cantidad: 12, pesoKg: 264.0 },
            { palletId: pallet1.id, productoId: prodCer2.id, descripcion: 'Pernil de cerdo entero', cantidad: 8, pesoKg: 200.0 },
          ],
        });

        // Pallet 2: EN_ARMADO (picking en proceso)
        const pallet2 = await prisma.pallet.create({
          data: {
            codigoUnico: `DEMO-P2-${Date.now().toString(36).toUpperCase()}`,
            entregaId: entrega.id,
            pickineroId: pickinero?.id,
            edificioId: cerdo?.id,
            estado: 'EN_ARMADO',
            timestampInicio: new Date(),
          },
        });
        await prisma.productoPallet.createMany({
          data: [
            { palletId: pallet2.id, productoId: prodCer1.id, descripcion: 'Costillas de cerdo', cantidad: 5, pesoKg: 110.0 },
          ],
        });
      }
    }

    // Crear inspección SAG para DEMO-08
    if (c.estado === EstadoCamion.ESPERANDO_SAG && inspector) {
      await prisma.inspeccionSAG.create({
        data: {
          camionId: camion.id,
          inspectorId: inspector.id,
          estado: 'PENDIENTE',
          timestampInicio: new Date(),
          observaciones: 'Pendiente de inspección — carga de exportación a China',
        },
      });
    }

    // Crear inspección aprobada para DEMO-09 (LISTO)
    if (c.estado === EstadoCamion.LISTO && inspector) {
      await prisma.inspeccionSAG.create({
        data: {
          camionId: camion.id,
          inspectorId: inspector.id,
          estado: 'APROBADO',
          timestampInicio: new Date(Date.now() - 3600000),
          timestampResolucion: new Date(Date.now() - 1800000),
          observaciones: 'Temperatura correcta. Documentación completa. Aprobado.',
        },
      });
    }

    console.log(`  ✅ ${c.patente} → ${c.estado} — ${c.descripcion}`);
  }

  console.log('\n🎉 Camiones de demo creados. Resumen:');
  console.log('  DEMO-01, DEMO-02  → ESPERADO (llegarán pronto)');
  console.log('  DEMO-03, DEMO-04  → EN_PORTERIA (asignar andén en vivo)');
  console.log('  DEMO-05           → ASIGNADO en A2 (iniciar carga)');
  console.log('  DEMO-06           → EN_CARGA en C1 (con pallets en proceso)');
  console.log('  DEMO-07           → EN_TUNEL_FRIO en A3 (enfriamiento)');
  console.log('  DEMO-08           → ESPERANDO_SAG en C2 (aprobar/rechazar)');
  console.log('  DEMO-09           → LISTO (despachar en vivo)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
