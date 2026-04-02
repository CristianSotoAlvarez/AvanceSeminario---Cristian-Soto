import { PrismaClient, RolUsuario, TipoEdificio } from '@prisma/client';
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
    { nombre: 'Luis Pickinero', rut: '44.444.444-4', email: 'pickinero@dispatch.cl', rol: RolUsuario.PICKINERO, edificioId: aves.id },
    { nombre: 'María Cargadora', rut: '55.555.555-5', email: 'cargador@dispatch.cl', rol: RolUsuario.CARGADOR, edificioId: aves.id },
    { nombre: 'Jorge Supervisor', rut: '66.666.666-6', email: 'supervisor@dispatch.cl', rol: RolUsuario.SUPERVISOR, edificioId: aves.id },
    { nombre: 'Roberto Operador Túnel', rut: '77.777.777-7', email: 'tunel@dispatch.cl', rol: RolUsuario.OPERADOR_TUNEL, edificioId: frigorifico.id },
    { nombre: 'Inspector García (SAG)', rut: '88.888.888-8', email: 'sag@dispatch.cl', rol: RolUsuario.SAG, edificioId: null },
  ];

  for (const usuario of usuariosData) {
    await prisma.usuario.upsert({
      where: { rut: usuario.rut },
      update: {},
      create: { ...usuario, passwordHash },
    });
  }

  console.log('✅ 8 usuarios de prueba creados (contraseña: clave123)');

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
    { patente: 'ABCD10', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(0, 8, 0),  salidaPlan: diaOffset(0, 12, 0), llegadaReal: diaOffset(0, 8, 15), salidaReal: diaOffset(0, 12, 30), edificios: ['AVES'] },
    { patente: 'EFGH20', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(0, 9, 0),  salidaPlan: diaOffset(0, 14, 0), llegadaReal: diaOffset(0, 9, 5),  salidaReal: diaOffset(0, 14, 10), edificios: ['CERDO', 'FRIGORIFICO'] },
    { patente: 'IJKL30', tipo: 'INTERPLANTA', estado: 'EN_CARGA',      llegadaPlan: diaOffset(0, 10, 0), salidaPlan: diaOffset(0, 15, 0), llegadaReal: diaOffset(0, 10, 0), salidaReal: null, edificios: ['AVES'], andenCodigo: 'A1' },
    { patente: 'MNOP40', tipo: 'NACIONAL',    estado: 'EN_PORTERIA',   llegadaPlan: diaOffset(0, 11, 0), salidaPlan: diaOffset(0, 16, 0), llegadaReal: null, salidaReal: null, edificios: ['CERDO'] },
    { patente: 'QRST50', tipo: 'EXPORTACION', estado: 'ESPERADO',      llegadaPlan: diaOffset(0, 13, 0), salidaPlan: diaOffset(0, 18, 0), llegadaReal: null, salidaReal: null, edificios: ['AVES', 'FRIGORIFICO'] },
    // Ayer
    { patente: 'UVWX60', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(1, 7, 0),  salidaPlan: diaOffset(1, 11, 0), llegadaReal: diaOffset(1, 7, 20), salidaReal: diaOffset(1, 11, 45), edificios: ['CERDO'] },
    { patente: 'YZAB70', tipo: 'INTERPLANTA', estado: 'DESPACHADO',    llegadaPlan: diaOffset(1, 8, 30), salidaPlan: diaOffset(1, 13, 0), llegadaReal: diaOffset(1, 8, 35), salidaReal: diaOffset(1, 13, 20), edificios: ['AVES', 'CERDO', 'FRIGORIFICO'] },
    { patente: 'CDEF80', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(1, 10, 0), salidaPlan: diaOffset(1, 15, 0), llegadaReal: diaOffset(1, 10, 0), salidaReal: diaOffset(1, 15, 5), edificios: ['FRIGORIFICO'] },
    // Hace 3 días
    { patente: 'GHIJ90', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(3, 8, 0),  salidaPlan: diaOffset(3, 12, 0), llegadaReal: diaOffset(3, 8, 10), salidaReal: diaOffset(3, 12, 30), edificios: ['AVES'] },
    { patente: 'KLMN01', tipo: 'EXPORTACION', estado: 'RECHAZADO_SAG', llegadaPlan: diaOffset(3, 9, 0),  salidaPlan: diaOffset(3, 14, 0), llegadaReal: diaOffset(3, 9, 0),  salidaReal: null, edificios: ['CERDO', 'FRIGORIFICO'] },
    // Hace 7 días
    { patente: 'OPQR11', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(7, 7, 30), salidaPlan: diaOffset(7, 11, 0), llegadaReal: diaOffset(7, 7, 35), salidaReal: diaOffset(7, 11, 10), edificios: ['AVES'] },
    { patente: 'STUV22', tipo: 'INTERPLANTA', estado: 'DESPACHADO',    llegadaPlan: diaOffset(7, 9, 0),  salidaPlan: diaOffset(7, 13, 0), llegadaReal: diaOffset(7, 9, 5),  salidaReal: diaOffset(7, 13, 30), edificios: ['CERDO'] },
    { patente: 'WXYZ33', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(7, 10, 0), salidaPlan: diaOffset(7, 15, 0), llegadaReal: diaOffset(7, 10, 0), salidaReal: diaOffset(7, 15, 20), edificios: ['AVES', 'FRIGORIFICO'] },
    // Hace 15 días
    { patente: 'ABCD44', tipo: 'NACIONAL',    estado: 'DESPACHADO',    llegadaPlan: diaOffset(15, 8, 0), salidaPlan: diaOffset(15, 12, 0), llegadaReal: diaOffset(15, 8, 0),  salidaReal: diaOffset(15, 12, 15), edificios: ['CERDO'] },
    { patente: 'EFGH55', tipo: 'EXPORTACION', estado: 'DESPACHADO',    llegadaPlan: diaOffset(15, 9, 0), salidaPlan: diaOffset(15, 14, 0), llegadaReal: diaOffset(15, 9, 30), salidaReal: diaOffset(15, 14, 45), edificios: ['AVES', 'CERDO', 'FRIGORIFICO'] },
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

    const camion = await prisma.camion.create({
      data: {
        patente:                c.patente,
        tipo:                   c.tipo as any,
        estado:                 c.estado as any,
        horaLlegadaPlanificada: c.llegadaPlan,
        horaSalidaPlanificada:  c.salidaPlan,
        horaLlegadaReal:        c.llegadaReal,
        horaSalidaReal:         c.salidaReal,
        ...(andenId ? { andenId } : {}),
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
