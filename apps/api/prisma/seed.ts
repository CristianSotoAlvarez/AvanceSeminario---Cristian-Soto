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
