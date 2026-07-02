import { PrismaClient, RolUsuario, TipoEdificio, TipoCamion } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // --- Edificios ---
  const aves = await prisma.edificio.upsert({
    where: { tipo: 'AVES' },
    update: {},
    create: { nombre: 'Planta Aves', tipo: TipoEdificio.AVES },
  });

  const cerdo = await prisma.edificio.upsert({
    where: { tipo: 'CERDO' },
    update: {},
    create: { nombre: 'Planta Cerdo', tipo: TipoEdificio.CERDO },
  });

  const frigorifico = await prisma.edificio.upsert({
    where: { tipo: 'FRIGORIFICO' },
    update: {},
    create: { nombre: 'Frigorífico', tipo: TipoEdificio.FRIGORIFICO },
  });

  console.log('✅ Edificios creados');

  // --- Andenes ---
  const andenesData = [
    { codigo: 'A1', edificioId: aves.id },
    { codigo: 'A2', edificioId: aves.id },
    { codigo: 'A3', edificioId: aves.id },
    { codigo: 'A4', edificioId: aves.id },
    { codigo: 'A5', edificioId: aves.id },
    { codigo: 'C1', edificioId: cerdo.id },
    { codigo: 'C2', edificioId: cerdo.id },
    { codigo: 'C3', edificioId: cerdo.id },
    { codigo: 'F1', edificioId: frigorifico.id },
    { codigo: 'F2', edificioId: frigorifico.id },
    { codigo: 'F3', edificioId: frigorifico.id },
  ];

  for (const anden of andenesData) {
    await prisma.anden.upsert({
      where: { codigo: anden.codigo },
      update: {},
      create: anden,
    });
  }

  console.log('✅ 11 andenes creados (A1-A5, C1-C3, F1-F3)');

  // --- Usuarios de prueba (1 por rol) ---
  const passwordHash = await bcrypt.hash('clave123', 10);

  const usuariosData = [
    { nombre: 'Carlos Jefe', rut: '11.111.111-1', email: 'jefe@dispatch.cl', rol: RolUsuario.JEFE_DESPACHO, edificioId: null },
    { nombre: 'Ana Coordinadora Transporte', rut: '22.222.222-2', email: 'coord.transporte@dispatch.cl', rol: RolUsuario.COORDINADOR_TRANSPORTE, edificioId: null },
    { nombre: 'Pedro Coordinador', rut: '33.333.333-3', email: 'coordinador@dispatch.cl', rol: RolUsuario.COORDINADOR, edificioId: null },
    { nombre: 'Luis Pickinero', rut: '44.444.444-4', email: 'pickinero@dispatch.cl', rol: RolUsuario.PICKINERO, edificioId: aves.id, polivalente: false },
    { nombre: 'María Cargadora', rut: '55.555.555-5', email: 'cargador@dispatch.cl', rol: RolUsuario.CARGADOR, edificioId: aves.id, polivalente: false },
    { nombre: 'Jorge Supervisor', rut: '66.666.666-6', email: 'supervisor@dispatch.cl', rol: RolUsuario.SUPERVISOR, edificioId: aves.id },
    { nombre: 'Roberto Operador Túnel', rut: '77.777.777-7', email: 'tunel@dispatch.cl', rol: RolUsuario.OPERADOR_TUNEL, edificioId: frigorifico.id },
    { nombre: 'Inspector García (SAG)', rut: '88.888.888-8', email: 'sag@dispatch.cl', rol: RolUsuario.SAG, edificioId: null },
    { nombre: 'Portería (cuenta compartida)', rut: '99.999.999-9', email: 'porteria@dispatch.cl', rol: RolUsuario.PORTERO, edificioId: null },
    // Operador polivalente: PICKINERO con capacidad de cargar
    { nombre: 'Tomás Polivalente (P)', rut: '10.111.111-1', email: 'tomas.pickinero@dispatch.cl', rol: RolUsuario.PICKINERO, edificioId: cerdo.id, polivalente: true },
    // Operador polivalente: CARGADOR con capacidad de armar
    { nombre: 'Camila Polivalente (C)', rut: '10.222.222-2', email: 'camila.cargador@dispatch.cl', rol: RolUsuario.CARGADOR, edificioId: cerdo.id, polivalente: true },
  ];

  for (const usuario of usuariosData) {
    await prisma.usuario.upsert({
      where: { rut: usuario.rut },
      update: {},
      create: { ...usuario, passwordHash },
    });
  }

  console.log(`✅ ${usuariosData.length} usuarios de prueba creados (contraseña: clave123)`);

  // --- Clientes ---
  type ClienteSeed = { nombre: string; rut?: string; codigo: string; tipoDestino: TipoCamion; pais?: string };
  const clientesData: ClienteSeed[] = [
    // Nacionales
    { nombre: 'Walmart Chile (Líder / Acuenta)',  rut: '96.928.750-9', codigo: 'CLI-N001', tipoDestino: TipoCamion.NACIONAL },
    { nombre: 'Cencosud (Jumbo / Santa Isabel)',  rut: '93.834.000-8', codigo: 'CLI-N002', tipoDestino: TipoCamion.NACIONAL },
    { nombre: 'SMU (Unimarc)',                    rut: '96.613.830-7', codigo: 'CLI-N003', tipoDestino: TipoCamion.NACIONAL },
    { nombre: 'Tottus Chile',                     rut: '76.001.234-5', codigo: 'CLI-N004', tipoDestino: TipoCamion.NACIONAL },
    { nombre: 'Supermercados Mayorista 10',        rut: '78.432.100-2', codigo: 'CLI-N005', tipoDestino: TipoCamion.NACIONAL },
    { nombre: 'Distribuidora Alimentos del Sur',  rut: '77.650.320-1', codigo: 'CLI-N006', tipoDestino: TipoCamion.NACIONAL },
    // Interplanta
    { nombre: 'Planta Rosario (Agrosuper)',        codigo: 'CLI-P001', tipoDestino: TipoCamion.INTERPLANTA },
    { nombre: 'Planta El Maule (Agrosuper)',       codigo: 'CLI-P002', tipoDestino: TipoCamion.INTERPLANTA },
    { nombre: 'Planta San Vicente (Agrosuper)',    codigo: 'CLI-P003', tipoDestino: TipoCamion.INTERPLANTA },
    { nombre: 'Planta Frigorífico Rancagua',       codigo: 'CLI-P004', tipoDestino: TipoCamion.INTERPLANTA },
    // Exportadores
    { nombre: 'China National Cereals Oils',      codigo: 'CLI-E001', tipoDestino: TipoCamion.EXPORTACION, pais: 'China' },
    { nombre: 'Shanghai Maling Aquarius Co.',     codigo: 'CLI-E002', tipoDestino: TipoCamion.EXPORTACION, pais: 'China' },
    { nombre: 'Itoham Yonekyu Holdings',          codigo: 'CLI-E003', tipoDestino: TipoCamion.EXPORTACION, pais: 'Japón' },
    { nombre: 'NH Foods Ltd.',                    codigo: 'CLI-E004', tipoDestino: TipoCamion.EXPORTACION, pais: 'Japón' },
    { nombre: 'Hyundai Corporation (Foods Div)', codigo: 'CLI-E005', tipoDestino: TipoCamion.EXPORTACION, pais: 'Corea del Sur' },
    { nombre: 'Lotte Chilsung Beverage',          codigo: 'CLI-E006', tipoDestino: TipoCamion.EXPORTACION, pais: 'Corea del Sur' },
    { nombre: 'Vion Food Group',                  codigo: 'CLI-E007', tipoDestino: TipoCamion.EXPORTACION, pais: 'Países Bajos' },
    { nombre: 'Tönnies Lebensmittel GmbH',        codigo: 'CLI-E008', tipoDestino: TipoCamion.EXPORTACION, pais: 'Alemania' },
    { nombre: 'Luncheon Meats Ltd.',              codigo: 'CLI-E009', tipoDestino: TipoCamion.EXPORTACION, pais: 'Reino Unido' },
    { nombre: 'Sigma Alimentos (OXXO / Sigma)',   codigo: 'CLI-E010', tipoDestino: TipoCamion.EXPORTACION, pais: 'México' },
    { nombre: 'JBS S.A. — División Exportación',  codigo: 'CLI-E011', tipoDestino: TipoCamion.EXPORTACION, pais: 'Brasil' },
    { nombre: 'Alimentos Polar C.A.',             codigo: 'CLI-E012', tipoDestino: TipoCamion.EXPORTACION, pais: 'Venezuela' },
    { nombre: 'Hormel Foods International',       codigo: 'CLI-E013', tipoDestino: TipoCamion.EXPORTACION, pais: 'Estados Unidos' },
  ];

  const clientesCreados: Record<string, string> = {};
  for (const c of clientesData) {
    const upsertKey = c.codigo;
    const cliente = await prisma.cliente.upsert({
      where: { codigo: upsertKey },
      update: {},
      create: {
        nombre:      c.nombre,
        rut:         c.rut,
        codigo:      c.codigo,
        tipoDestino: c.tipoDestino,
        pais:        c.pais,
      },
    });
    clientesCreados[c.codigo] = cliente.id;
  }
  console.log(`✅ ${clientesData.length} clientes creados (nacionales, interplanta, exportadores)`);

  // --- Camiones de prueba (últimos 30 días) ---
  const jefe = await prisma.usuario.findFirst({ where: { rol: 'JEFE_DESPACHO' } });

  const ahora = new Date();
  function diaOffset(dias: number, hora: number, min = 0) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - dias);
    d.setHours(hora, min, 0, 0);
    return d;
  }

  const camionesData = [
    // Hoy
    { patente: 'ABCD10', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(0, 8, 0),  salidaPlan: diaOffset(0, 12, 0), llegadaReal: diaOffset(0, 8, 15), salidaReal: diaOffset(0, 12, 30), edificios: ['AVES'],                clienteCodigo: 'CLI-N001' },
    { patente: 'EFGH20', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(0, 9, 0),  salidaPlan: diaOffset(0, 14, 0), llegadaReal: diaOffset(0, 9, 5),  salidaReal: diaOffset(0, 14, 10), edificios: ['CERDO', 'FRIGORIFICO'], clienteCodigo: 'CLI-E001' },
    { patente: 'IJKL30', tipo: 'INTERPLANTA', estado: 'EN_CARGA',      llegadaPlan: diaOffset(0, 10, 0), salidaPlan: diaOffset(0, 15, 0), llegadaReal: diaOffset(0, 10, 0), salidaReal: null, edificios: ['AVES'], andenCodigo: 'A1',              clienteCodigo: 'CLI-P001' },
    { patente: 'MNOP40', tipo: 'NACIONAL',    estado: 'EN_PORTERIA',   llegadaPlan: diaOffset(0, 11, 0), salidaPlan: diaOffset(0, 16, 0), llegadaReal: null, salidaReal: null, edificios: ['CERDO'],                                               clienteCodigo: 'CLI-N002' },
    { patente: 'QRST50', tipo: 'EXPORTACION', estado: 'ESPERADO',      llegadaPlan: diaOffset(0, 13, 0), salidaPlan: diaOffset(0, 18, 0), llegadaReal: null, salidaReal: null, edificios: ['AVES', 'FRIGORIFICO'],                                 clienteCodigo: 'CLI-E003' },
    // Ayer
    { patente: 'UVWX60', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(1, 7, 0),  salidaPlan: diaOffset(1, 11, 0), llegadaReal: diaOffset(1, 7, 20), salidaReal: diaOffset(1, 11, 45), edificios: ['CERDO'],               clienteCodigo: 'CLI-N003' },
    { patente: 'YZAB70', tipo: 'INTERPLANTA', estado: 'DESPACHADO',    llegadaPlan: diaOffset(1, 8, 30), salidaPlan: diaOffset(1, 13, 0), llegadaReal: diaOffset(1, 8, 35), salidaReal: diaOffset(1, 13, 20), edificios: ['AVES', 'CERDO', 'FRIGORIFICO'], clienteCodigo: 'CLI-P002' },
    { patente: 'CDEF80', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(1, 10, 0), salidaPlan: diaOffset(1, 15, 0), llegadaReal: diaOffset(1, 10, 0), salidaReal: diaOffset(1, 15, 5), edificios: ['FRIGORIFICO'],           clienteCodigo: 'CLI-E007' },
    // Hace 3 días
    { patente: 'GHIJ90', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(3, 8, 0),  salidaPlan: diaOffset(3, 12, 0), llegadaReal: diaOffset(3, 8, 10), salidaReal: diaOffset(3, 12, 30), edificios: ['AVES'],               clienteCodigo: 'CLI-N004' },
    { patente: 'KLMN01', tipo: 'EXPORTACION', estado: 'RECHAZADO_SAG', llegadaPlan: diaOffset(3, 9, 0),  salidaPlan: diaOffset(3, 14, 0), llegadaReal: diaOffset(3, 9, 0),  salidaReal: null, edificios: ['CERDO', 'FRIGORIFICO'],              clienteCodigo: 'CLI-E004' },
    // Hace 7 días
    { patente: 'OPQR11', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(7, 7, 30), salidaPlan: diaOffset(7, 11, 0), llegadaReal: diaOffset(7, 7, 35), salidaReal: diaOffset(7, 11, 10), edificios: ['AVES'],              clienteCodigo: 'CLI-N005' },
    { patente: 'STUV22', tipo: 'INTERPLANTA', estado: 'DESPACHADO',    llegadaPlan: diaOffset(7, 9, 0),  salidaPlan: diaOffset(7, 13, 0), llegadaReal: diaOffset(7, 9, 5),  salidaReal: diaOffset(7, 13, 30), edificios: ['CERDO'],             clienteCodigo: 'CLI-P003' },
    { patente: 'WXYZ33', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(7, 10, 0), salidaPlan: diaOffset(7, 15, 0), llegadaReal: diaOffset(7, 10, 0), salidaReal: diaOffset(7, 15, 20), edificios: ['AVES', 'FRIGORIFICO'], clienteCodigo: 'CLI-E005' },
    // Hace 15 días
    { patente: 'ABCD44', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(15, 8, 0), salidaPlan: diaOffset(15, 12, 0), llegadaReal: diaOffset(15, 8, 0),  salidaReal: diaOffset(15, 12, 15), edificios: ['CERDO'],          clienteCodigo: 'CLI-N006' },
    { patente: 'EFGH55', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(15, 9, 0), salidaPlan: diaOffset(15, 14, 0), llegadaReal: diaOffset(15, 9, 30), salidaReal: diaOffset(15, 14, 45), edificios: ['AVES', 'CERDO', 'FRIGORIFICO'], clienteCodigo: 'CLI-E013' },
  ];

  for (const c of camionesData) {
    const existente = await prisma.camion.findFirst({ where: { patente: c.patente } });
    if (existente) continue;

    // Si el camión tiene andén asignado, obtenerlo y marcarlo ocupado
    let andenId: string | null = null;
    if ((c as any).andenCodigo) {
      const anden = await prisma.anden.findUnique({ where: { codigo: (c as any).andenCodigo } });
      if (anden) {
        andenId = anden.id;
        await prisma.anden.update({ where: { id: anden.id }, data: { ocupado: true } });
      }
    }

    const clienteId = (c as any).clienteCodigo ? clientesCreados[(c as any).clienteCodigo] : undefined;

    const camion = await prisma.camion.create({
      data: {
        patente:                c.patente,
        tipo:                   c.tipo as any,
        estado:                 c.estado as any,
        horaLlegadaPlanificada: c.llegadaPlan,
        horaSalidaPlanificada:  c.salidaPlan,
        horaLlegadaReal:        c.llegadaReal,
        horaSalidaReal:         c.salidaReal,
        ...(andenId   ? { andenId }   : {}),
        ...(clienteId ? { clienteId } : {}),
      },
    });

    // Paradas
    const edificiosOrdenados = c.edificios.includes('FRIGORIFICO')
      ? [...c.edificios.filter(e => e !== 'FRIGORIFICO'), 'FRIGORIFICO']
      : c.edificios;

    await prisma.paradaExpedicion.createMany({
      data: edificiosOrdenados.map((edificioTipo, idx) => ({
        camionId:    camion.id,
        edificioTipo: edificioTipo as any,
        orden:       idx + 1,
        estado:      c.estado === 'DESPACHADO' ? 'COMPLETADO' as any : idx === 0 ? 'EN_PROCESO' as any : 'PENDIENTE' as any,
        horaInicio:  c.llegadaReal,
        horaFin:     c.salidaReal,
        ...(idx === 0 && andenId ? { andenId } : {}),
      })),
    });

    // Evento inicial
    if (jefe) {
      await prisma.eventoCamion.create({
        data: { camionId: camion.id, estado: 'ESPERADO' as any, usuarioId: jefe.id, timestamp: c.llegadaPlan },
      });
      if (c.llegadaReal) {
        await prisma.eventoCamion.create({
          data: { camionId: camion.id, estado: 'EN_PORTERIA' as any, usuarioId: jefe.id, timestamp: c.llegadaReal },
        });
      }
      if (c.estado === 'DESPACHADO' && c.salidaReal) {
        await prisma.eventoCamion.create({
          data: { camionId: camion.id, estado: 'DESPACHADO' as any, usuarioId: jefe.id, timestamp: c.salidaReal },
        });
      }
    }

    // Inspección SAG para el rechazado
    if (c.estado === 'RECHAZADO_SAG' && jefe) {
      await prisma.inspeccionSAG.create({
        data: {
          camionId:            camion.id,
          inspectorId:         jefe.id,
          estado:              'RECHAZADO',
          observaciones:       'Temperatura no cumple estándar mínimo requerido',
          timestampInicio:     c.llegadaReal!,
          timestampResolucion: new Date(c.llegadaReal!.getTime() + 3600000),
        },
      });
    }
  }

  console.log('✅ 15 camiones de prueba creados');

  // --- Productos del catálogo ---
  type ProductoSeed = { sku: string; nombre: string; unidadMedida: string; pesoKgUnitario?: number };
  const productosData: ProductoSeed[] = [
    // Aves
    { sku: 'AVE-001', nombre: 'Pollo entero congelado',          unidadMedida: 'caja', pesoKgUnitario: 18.5 },
    { sku: 'AVE-002', nombre: 'Pechuga de pollo sin hueso',      unidadMedida: 'caja', pesoKgUnitario: 15.0 },
    { sku: 'AVE-003', nombre: 'Alitas de pollo',                 unidadMedida: 'caja', pesoKgUnitario: 12.0 },
    { sku: 'AVE-004', nombre: 'Pierna y muslo congelado',        unidadMedida: 'caja', pesoKgUnitario: 20.0 },
    { sku: 'AVE-005', nombre: 'Pollo trozado congelado',         unidadMedida: 'caja', pesoKgUnitario: 14.0 },
    { sku: 'AVE-006', nombre: 'Hígado de pollo congelado',       unidadMedida: 'caja', pesoKgUnitario: 10.0 },
    // Cerdo
    { sku: 'CER-001', nombre: 'Costillas de cerdo',              unidadMedida: 'caja', pesoKgUnitario: 22.0 },
    { sku: 'CER-002', nombre: 'Pernil de cerdo entero',          unidadMedida: 'caja', pesoKgUnitario: 25.0 },
    { sku: 'CER-003', nombre: 'Lomo de cerdo congelado',         unidadMedida: 'caja', pesoKgUnitario: 18.0 },
    { sku: 'CER-004', nombre: 'Panceta de cerdo',                unidadMedida: 'caja', pesoKgUnitario: 16.0 },
    { sku: 'CER-005', nombre: 'Chuletas de cerdo',               unidadMedida: 'caja', pesoKgUnitario: 14.0 },
    // Frigorífico / Procesados
    { sku: 'FRI-001', nombre: 'Salchicha Frankfurt',             unidadMedida: 'caja', pesoKgUnitario:  8.0 },
    { sku: 'FRI-002', nombre: 'Jamón cocido laminado',           unidadMedida: 'caja', pesoKgUnitario:  6.0 },
    { sku: 'FRI-003', nombre: 'Mortadela',                       unidadMedida: 'caja', pesoKgUnitario: 10.0 },
    { sku: 'FRI-004', nombre: 'Chorizo tradicional',             unidadMedida: 'caja', pesoKgUnitario:  7.5 },
    { sku: 'FRI-005', nombre: 'Cecina de vacuno laminada',       unidadMedida: 'caja', pesoKgUnitario:  5.0 },
  ];

  const productosCreados: Record<string, string> = {};
  for (const p of productosData) {
    const prod = await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    productosCreados[p.sku] = prod.id;
  }
  console.log(`✅ ${productosData.length} productos del catálogo creados`);

  // --- Entregas y picking simulado para camiones activos de hoy ---
  const pickinero = await prisma.usuario.findFirst({ where: { rol: 'PICKINERO' } });

  // Helper: obtener camión y sus paradas
  async function getCamionConParadas(patente: string) {
    return prisma.camion.findFirst({
      where: { patente },
      include: { paradas: { orderBy: { orden: 'asc' } } },
    });
  }

  // ── IJKL30 (INTERPLANTA · EN_CARGA · A1) → parada AVES ──────────────────
  const ijkl30 = await getCamionConParadas('IJKL30');
  if (ijkl30) {
    const paradaAves = ijkl30.paradas.find(p => p.edificioTipo === 'AVES');
    if (paradaAves) {
      // Crear entrega si no existe para esta parada
      let entregaAves = await prisma.entrega.findUnique({ where: { paradaId: paradaAves.id } });
      if (!entregaAves) {
        entregaAves = await prisma.entrega.create({
          data: { camionId: ijkl30.id, paradaId: paradaAves.id },
        });
      }

      // Items de la entrega (lo que pidió el cliente)
      const itemsAves = [
        { sku: 'AVE-001', cantidad: 20 },
        { sku: 'AVE-002', cantidad: 15 },
        { sku: 'AVE-003', cantidad: 10 },
        { sku: 'AVE-004', cantidad: 18 },
      ];
      for (const item of itemsAves) {
        await prisma.entregaItem.upsert({
          where: { entregaId_productoId: { entregaId: entregaAves.id, productoId: productosCreados[item.sku] } },
          update: {},
          create: { entregaId: entregaAves.id, productoId: productosCreados[item.sku], cantidadSolicitada: item.cantidad },
        });
      }

      // Pallet EN_ARMADO (picking parcialmente completado)
      const codigoPallet = `UMP-${Date.now().toString(36).toUpperCase()}-01`;
      const palletExistente = await prisma.pallet.findFirst({ where: { entregaId: entregaAves.id } });
      if (!palletExistente) {
        const pallet = await prisma.pallet.create({
          data: {
            codigoUnico:    codigoPallet,
            entregaId:      entregaAves.id,
            pickineroId:    pickinero?.id,
            estado:         'EN_ARMADO',
            timestampInicio: new Date(),
          },
        });
        // Items ya cargados en este pallet (parcial)
        await prisma.productoPallet.createMany({
          data: [
            { palletId: pallet.id, productoId: productosCreados['AVE-001'], descripcion: 'Pollo entero congelado', cantidad: 8  },
            { palletId: pallet.id, productoId: productosCreados['AVE-002'], descripcion: 'Pechuga de pollo sin hueso', cantidad: 5 },
          ],
        });
      }
    }
  }

  // ── MNOP40 (NACIONAL · EN_PORTERIA) → parada CERDO ──────────────────────
  const mnop40 = await getCamionConParadas('MNOP40');
  if (mnop40) {
    const paradaCerdo = mnop40.paradas.find(p => p.edificioTipo === 'CERDO');
    if (paradaCerdo) {
      let entregaCerdo = await prisma.entrega.findUnique({ where: { paradaId: paradaCerdo.id } });
      if (!entregaCerdo) {
        entregaCerdo = await prisma.entrega.create({
          data: { camionId: mnop40.id, paradaId: paradaCerdo.id },
        });
      }
      const itemsCerdo = [
        { sku: 'CER-001', cantidad: 12 },
        { sku: 'CER-002', cantidad:  8 },
        { sku: 'CER-003', cantidad: 15 },
      ];
      for (const item of itemsCerdo) {
        await prisma.entregaItem.upsert({
          where: { entregaId_productoId: { entregaId: entregaCerdo.id, productoId: productosCreados[item.sku] } },
          update: {},
          create: { entregaId: entregaCerdo.id, productoId: productosCreados[item.sku], cantidadSolicitada: item.cantidad },
        });
      }
    }
  }

  // ── QRST50 (EXPORTACION · ESPERADO) → paradas AVES + FRIGORIFICO ─────────
  const qrst50 = await getCamionConParadas('QRST50');
  if (qrst50) {
    const paradaAvesQ = qrst50.paradas.find(p => p.edificioTipo === 'AVES');
    if (paradaAvesQ) {
      let entregaAvesQ = await prisma.entrega.findUnique({ where: { paradaId: paradaAvesQ.id } });
      if (!entregaAvesQ) {
        entregaAvesQ = await prisma.entrega.create({
          data: { camionId: qrst50.id, paradaId: paradaAvesQ.id },
        });
      }
      const itemsAvesQ = [
        { sku: 'AVE-001', cantidad: 25 },
        { sku: 'AVE-005', cantidad: 20 },
        { sku: 'AVE-006', cantidad: 12 },
      ];
      for (const item of itemsAvesQ) {
        await prisma.entregaItem.upsert({
          where: { entregaId_productoId: { entregaId: entregaAvesQ.id, productoId: productosCreados[item.sku] } },
          update: {},
          create: { entregaId: entregaAvesQ.id, productoId: productosCreados[item.sku], cantidadSolicitada: item.cantidad },
        });
      }
    }

    const paradaFriQ = qrst50.paradas.find(p => p.edificioTipo === 'FRIGORIFICO');
    if (paradaFriQ) {
      let entregaFriQ = await prisma.entrega.findUnique({ where: { paradaId: paradaFriQ.id } });
      if (!entregaFriQ) {
        entregaFriQ = await prisma.entrega.create({
          data: { camionId: qrst50.id, paradaId: paradaFriQ.id },
        });
      }
      const itemsFriQ = [
        { sku: 'FRI-001', cantidad: 30 },
        { sku: 'FRI-002', cantidad: 15 },
        { sku: 'FRI-003', cantidad: 10 },
      ];
      for (const item of itemsFriQ) {
        await prisma.entregaItem.upsert({
          where: { entregaId_productoId: { entregaId: entregaFriQ.id, productoId: productosCreados[item.sku] } },
          update: {},
          create: { entregaId: entregaFriQ.id, productoId: productosCreados[item.sku], cantidadSolicitada: item.cantidad },
        });
      }
    }
  }

  console.log('✅ Entregas, items y pallet de picking simulado creados');
  console.log('🎉 Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
