/**
 * Generador de datos sintéticos realistas para la presentación del proyecto de título.
 *
 * Periodo: 90 días terminando hoy.
 * Curva de mejora gradual: OTIF, cumplimiento, atrasos y tiempo de ciclo mejoran
 *   progresivamente a lo largo de los 90 días para evidenciar el aporte del sistema.
 * 4 días emblemáticos con incidentes específicos (avería, falla de andén, falta de
 *   producto, día pico) para demostrar el manejo de excepciones.
 *
 * Ejecutar con:  npm run generar-datos:demo
 *
 * IMPORTANTE: borra todos los datos transaccionales antes de generar.
 * Mantiene catálogos base (edificios, andenes, productos, clientes, usuarios del seed).
 */
import {
  PrismaClient,
  RolUsuario,
  EstadoCamion,
  EstadoPallet,
  EstadoParada,
  TipoCamion,
  TipoEdificio,
  EstadoInspeccion,
  CausaJustificacion,
  TipoIncidente,
  AccionIncidente,
  Cliente,
  Producto,
  Anden,
  Usuario,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Configuración ──────────────────────────────────────────────────────────

const DIAS = 90;
const HOY = new Date(); HOY.setHours(0, 0, 0, 0);
const INICIO = new Date(HOY); INICIO.setDate(INICIO.getDate() - DIAS + 1);

const CAMIONES_POR_DIA = {
  laboral: { min: 16, max: 22 },   // L-V
  sabado:  { min: 10, max: 14 },
  domingo: { min: 0,  max: 3 },
};

const DISTRIBUCION_TIPO = {
  NACIONAL: 0.60,
  EXPORTACION: 0.25,
  INTERPLANTA: 0.15,
};

const PALLETS_POR_TIPO: Record<TipoCamion, { min: number; max: number }> = {
  NACIONAL:    { min: 5,  max: 12 },
  EXPORTACION: { min: 18, max: 25 },
  INTERPLANTA: { min: 8,  max: 15 },
};

const PRODUCTOS_POR_PALLET = { min: 2, max: 4 };
const UNIDADES_POR_PRODUCTO = { min: 20, max: 80 };

// Días emblemáticos (offsets desde INICIO)
const DIA_AVERIA = 47;
const DIA_FALLA_ANDEN = 62;
const DIA_FALTA_PRODUCTO = 71;
const DIA_PICO = 85;

// ─── Helpers ────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const random = rng(20260609); // seed determinista

function entreEnteros(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function entreFloats(min: number, max: number) {
  return random() * (max - min) + min;
}

function elemAleatorio<T>(arr: T[]): T {
  return arr[entreEnteros(0, arr.length - 1)];
}

function diaSemana(d: Date): 'domingo' | 'sabado' | 'laboral' {
  const ds = d.getDay();
  if (ds === 0) return 'domingo';
  if (ds === 6) return 'sabado';
  return 'laboral';
}

function fechaConHora(base: Date, hora: number, minuto: number): Date {
  const d = new Date(base);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

function sumarMinutos(base: Date, minutos: number): Date {
  return new Date(base.getTime() + minutos * 60_000);
}

function eligePeso<T>(items: T[], pesos: number[]): T {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    if (r < pesos[i]) return items[i];
    r -= pesos[i];
  }
  return items[items.length - 1];
}

/**
 * Factor de mejora a lo largo del periodo (0 al inicio, 1 al final).
 * Curva sigmoide suave para mostrar mejora gradual y plateau hacia el final.
 */
function factorMejora(diaIdx: number): number {
  const t = diaIdx / (DIAS - 1);
  return 1 / (1 + Math.exp(-6 * (t - 0.5)));
}

// ─── Reset transaccional ────────────────────────────────────────────────────

async function reset() {
  console.log('🧹 Limpiando datos transaccionales...');
  // Orden: dependientes primero
  await prisma.eventoTunel.deleteMany();
  await prisma.atraso.deleteMany();
  await prisma.justificacionAtraso.deleteMany();
  await prisma.incidenteCamion.deleteMany();
  await prisma.inspeccionSAG.deleteMany();
  await prisma.productoPallet.deleteMany();
  await prisma.pallet.deleteMany();
  await prisma.entregaItem.deleteMany();
  await prisma.entrega.deleteMany();
  await prisma.eventoCamion.deleteMany();
  await prisma.paradaExpedicion.deleteMany();
  await prisma.camion.deleteMany();
  await prisma.pedido.deleteMany();
  // No tocar: usuarios del seed base, clientes, productos, andenes, edificios
}

// ─── Operadores extra ───────────────────────────────────────────────────────

async function crearOperadoresExtra(): Promise<{ pickineros: Usuario[]; cargadores: Usuario[] }> {
  const passwordHash = await bcrypt.hash('clave123', 10);
  const edificios = await prisma.edificio.findMany();
  const aves = edificios.find(e => e.tipo === TipoEdificio.AVES);
  const cerdo = edificios.find(e => e.tipo === TipoEdificio.CERDO);
  const frigorifico = edificios.find(e => e.tipo === TipoEdificio.FRIGORIFICO);

  const nombresPickineros = ['Diego Ramírez', 'Felipe Soto', 'Andrés Fuentes', 'Patricia Henríquez', 'Marcelo Donoso', 'Cristina Bravo'];
  const nombresCargadores = ['Joaquín Castillo', 'Sergio Carrasco', 'Verónica Rojas', 'Hugo Espinoza', 'Carlos Tapia', 'Lorena Salas'];

  for (let i = 0; i < nombresPickineros.length; i++) {
    const edif = i % 3 === 0 ? aves : i % 3 === 1 ? cerdo : frigorifico;
    await prisma.usuario.upsert({
      where: { rut: `30.000.${String(101 + i).padStart(3, '0')}-K` },
      update: {},
      create: {
        nombre: nombresPickineros[i],
        rut: `30.000.${String(101 + i).padStart(3, '0')}-K`,
        email: `pickinero.${i + 2}@dispatch.cl`,
        passwordHash,
        rol: RolUsuario.PICKINERO,
        polivalente: false,
        edificioId: edif?.id ?? null,
      },
    });
  }
  for (let i = 0; i < nombresCargadores.length; i++) {
    const edif = i % 3 === 0 ? aves : i % 3 === 1 ? cerdo : frigorifico;
    await prisma.usuario.upsert({
      where: { rut: `30.000.${String(201 + i).padStart(3, '0')}-K` },
      update: {},
      create: {
        nombre: nombresCargadores[i],
        rut: `30.000.${String(201 + i).padStart(3, '0')}-K`,
        email: `cargador.${i + 2}@dispatch.cl`,
        passwordHash,
        rol: RolUsuario.CARGADOR,
        polivalente: false,
        edificioId: edif?.id ?? null,
      },
    });
  }

  const pickineros = await prisma.usuario.findMany({ where: { rol: RolUsuario.PICKINERO } });
  const cargadores = await prisma.usuario.findMany({ where: { rol: RolUsuario.CARGADOR } });
  console.log(`✅ Operadores: ${pickineros.length} pickineros, ${cargadores.length} cargadores`);
  return { pickineros, cargadores };
}

// ─── Plan diario de camiones ────────────────────────────────────────────────

interface PlanCamion {
  fecha: Date;
  tipo: TipoCamion;
  cliente: Cliente;
  horaPlanificada: Date;
  duracionPlanificadaMin: number;
}

function generarPlanDiario(fecha: Date, clientes: Cliente[], diaIdx: number, esPico: boolean): PlanCamion[] {
  const ds = diaSemana(fecha);
  const cfg = CAMIONES_POR_DIA[ds];
  let total = entreEnteros(cfg.min, cfg.max);
  if (esPico) total = Math.max(total, 30);

  const plan: PlanCamion[] = [];
  for (let i = 0; i < total; i++) {
    const tipo = eligePeso<TipoCamion>(
      [TipoCamion.NACIONAL, TipoCamion.EXPORTACION, TipoCamion.INTERPLANTA],
      [DISTRIBUCION_TIPO.NACIONAL, DISTRIBUCION_TIPO.EXPORTACION, DISTRIBUCION_TIPO.INTERPLANTA],
    );
    const clientesTipo = clientes.filter(c => c.tipoDestino === tipo);
    const cliente = clientesTipo.length > 0 ? elemAleatorio(clientesTipo) : elemAleatorio(clientes);

    // Distribuir llegada entre 6:00 y 19:00
    const hora = entreEnteros(6, 18);
    const minuto = entreEnteros(0, 59);
    const horaPlanificada = fechaConHora(fecha, hora, minuto);

    // Duración planificada típica: NACIONAL 3h, EXPO 5-6h, INTERPLANTA 2h
    const duracionPlanificadaMin =
      tipo === TipoCamion.EXPORTACION ? entreEnteros(300, 360) :
      tipo === TipoCamion.NACIONAL ? entreEnteros(150, 210) :
      entreEnteros(100, 150);

    plan.push({ fecha, tipo, cliente, horaPlanificada, duracionPlanificadaMin });
  }
  return plan;
}

// ─── Generar un camión completo (con todos los eventos, entregas, pallets) ──

interface ContextoGen {
  pickineros: Usuario[];
  cargadores: Usuario[];
  polivalentes: Usuario[];
  andenes: Anden[];
  productos: Producto[];
  inspectorSAG: Usuario;
  porteroId: string | null;
  supervisor: Usuario | null;
}

let contadorTransporte = { NACIONAL: 1, EXPORTACION: 1, INTERPLANTA: 1 };
let contadorPallet = 1;

async function generarCamion(plan: PlanCamion, diaIdx: number, ctx: ContextoGen, escenario?: 'AVERIA' | 'FALLA_ANDEN' | 'FALTA_PRODUCTO') {
  const mejora = factorMejora(diaIdx);

  // Parámetros según día: mejora gradual
  // pOnTime sube de 0.78 -> 0.95
  const pOnTime = 0.78 + 0.17 * mejora;
  // multiplicador de ciclo: 1.15 -> 0.92 (más rápido al final)
  const multCiclo = 1.15 - 0.23 * mejora;
  // pCumplimiento (probabilidad de cumplir 100%): 0.85 -> 0.97
  const pCumplimientoCamion = 0.85 + 0.12 * mejora;

  const onTime = random() < pOnTime;
  const inFull = escenario === 'FALTA_PRODUCTO' ? false : random() < pCumplimientoCamion;

  // Número de transporte
  const prefijo = plan.tipo === TipoCamion.NACIONAL ? '600' : plan.tipo === TipoCamion.EXPORTACION ? '800' : '700';
  const numeroTransporte = `${prefijo}-${String(contadorTransporte[plan.tipo]).padStart(4, '0')}`;
  contadorTransporte[plan.tipo]++;

  // Patente aleatoria
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const patente = `${letras[entreEnteros(0, 25)]}${letras[entreEnteros(0, 25)]}${letras[entreEnteros(0, 25)]}${letras[entreEnteros(0, 25)]}${entreEnteros(10, 99)}`;

  // Horarios reales
  const offsetLlegada = onTime ? entreEnteros(-15, 5) : entreEnteros(8, 60);
  const horaLlegadaReal = sumarMinutos(plan.horaPlanificada, offsetLlegada);
  const duracionReal = Math.round(plan.duracionPlanificadaMin * multCiclo * entreFloats(0.92, 1.08));
  const horaSalidaPlanificada = sumarMinutos(plan.horaPlanificada, plan.duracionPlanificadaMin);
  const horaSalidaReal = sumarMinutos(horaLlegadaReal, duracionReal);

  // Pedido
  const numPallets = entreEnteros(PALLETS_POR_TIPO[plan.tipo].min, PALLETS_POR_TIPO[plan.tipo].max);
  const pedido = await prisma.pedido.create({
    data: {
      numero: `PED-${diaIdx}-${numeroTransporte}`,
      clienteId: plan.cliente.id,
      totalPallets: numPallets,
      totalBultos: numPallets * 25,
      fechaEntrega: plan.horaPlanificada,
    },
  });

  // Elegir andenes según tipo de edificio del cliente (asumimos un edificio por camión por simplicidad de demo)
  const edificioTipo: TipoEdificio =
    plan.cliente.tipoDestino === TipoCamion.EXPORTACION ? TipoEdificio.FRIGORIFICO :
    random() < 0.5 ? TipoEdificio.AVES : TipoEdificio.CERDO;
  const andenesEdif = ctx.andenes.filter(a => {
    const inicial = a.codigo[0];
    return (edificioTipo === TipoEdificio.AVES && inicial === 'A')
        || (edificioTipo === TipoEdificio.CERDO && inicial === 'C')
        || (edificioTipo === TipoEdificio.FRIGORIFICO && inicial === 'F');
  });
  const anden = elemAleatorio(andenesEdif);

  // Crear camión en estado DESPACHADO
  const estadoFinal = EstadoCamion.DESPACHADO;
  const camion = await prisma.camion.create({
    data: {
      patente,
      numeroTransporte,
      tipo: plan.tipo,
      estado: estadoFinal,
      clienteId: plan.cliente.id,
      pedidoId: pedido.id,
      andenId: anden.id,
      horaLlegadaPlanificada: plan.horaPlanificada,
      horaSalidaPlanificada,
      horaLlegadaReal,
      horaSalidaReal,
    },
  });

  // Parada de expedición
  const horaInicioParada = sumarMinutos(horaLlegadaReal, 15);
  const horaFinParada = sumarMinutos(horaInicioParada, Math.round(duracionReal * 0.6));
  const parada = await prisma.paradaExpedicion.create({
    data: {
      camionId: camion.id,
      andenId: anden.id,
      edificioTipo,
      orden: 1,
      estado: EstadoParada.COMPLETADO,
      cantidadPalletsSolicitados: numPallets,
      horaInicio: horaInicioParada,
      horaFin: horaFinParada,
    },
  });

  // Entrega
  const entrega = await prisma.entrega.create({
    data: {
      camionId: camion.id,
      paradaId: parada.id,
    },
  });

  // EntregaItems: cantidades solicitadas por producto
  const productosEntrega = [];
  const numProductosDistintos = entreEnteros(3, 6);
  const productosSel = [...ctx.productos].sort(() => random() - 0.5).slice(0, numProductosDistintos);
  for (const prod of productosSel) {
    const cantidadSolicitada = entreEnteros(50, 200);
    await prisma.entregaItem.create({
      data: { entregaId: entrega.id, productoId: prod.id, cantidadSolicitada },
    });
    productosEntrega.push({ producto: prod, cantidadSolicitada });
  }

  // Pallets: armar + cargar
  for (let i = 0; i < numPallets; i++) {
    const pickinero = elemAleatorio(ctx.pickineros);
    const cargador = elemAleatorio(ctx.cargadores);
    const tInicio = sumarMinutos(horaInicioParada, entreEnteros(0, Math.max(1, Math.round(duracionReal * 0.4))));
    const tArmadoSegundos = Math.round(entreFloats(180, 480) * (1.15 - 0.25 * mejora)); // mejora baja el tiempo
    const tFin = new Date(tInicio.getTime() + tArmadoSegundos * 1000);

    const pallet = await prisma.pallet.create({
      data: {
        codigoUnico: `P-${String(contadorPallet++).padStart(7, '0')}`,
        entregaId: entrega.id,
        pedidoId: pedido.id,
        pickineroId: pickinero.id,
        cargadorId: cargador.id,
        edificioId: anden.edificioId,
        estado: EstadoPallet.CARGADO,
        timestampInicio: tInicio,
        timestampFin: tFin,
        tiempoArmadoSegundos: tArmadoSegundos,
      },
    });

    // Productos del pallet
    const cuantosProds = entreEnteros(PRODUCTOS_POR_PALLET.min, PRODUCTOS_POR_PALLET.max);
    const prodsDistintos = [...productosEntrega].sort(() => random() - 0.5).slice(0, cuantosProds);
    for (const pe of prodsDistintos) {
      // Si in-full=false y el camión es de exportación falta producto: cargar menos
      let cantidad = entreEnteros(UNIDADES_POR_PRODUCTO.min, UNIDADES_POR_PRODUCTO.max);
      if (!inFull && random() < 0.4) cantidad = Math.round(cantidad * entreFloats(0.5, 0.85));
      await prisma.productoPallet.create({
        data: {
          palletId: pallet.id,
          productoId: pe.producto.id,
          descripcion: pe.producto.nombre,
          cantidad,
          pesoKg: pe.producto.pesoKgUnitario ? cantidad * pe.producto.pesoKgUnitario : null,
        },
      });
    }
  }

  // Eventos de camión (timeline)
  const usuarioGenericoId = ctx.supervisor?.id ?? ctx.pickineros[0]?.id;
  const eventos: { estado: EstadoCamion; timestamp: Date }[] = [
    { estado: EstadoCamion.ESPERADO, timestamp: sumarMinutos(plan.horaPlanificada, -60) },
    { estado: EstadoCamion.EN_PORTERIA, timestamp: horaLlegadaReal },
    { estado: EstadoCamion.ASIGNADO, timestamp: sumarMinutos(horaLlegadaReal, 5) },
    { estado: EstadoCamion.EN_CARGA, timestamp: horaInicioParada },
  ];
  if (plan.tipo === TipoCamion.EXPORTACION) {
    eventos.push({ estado: EstadoCamion.EN_TUNEL_FRIO, timestamp: sumarMinutos(horaFinParada, 5) });
    eventos.push({ estado: EstadoCamion.ESPERANDO_SAG, timestamp: sumarMinutos(horaFinParada, 50) });
    const sagAprobado = random() < 0.93;
    eventos.push({ estado: sagAprobado ? EstadoCamion.APROBADO_SAG : EstadoCamion.RECHAZADO_SAG, timestamp: sumarMinutos(horaFinParada, 80) });
    if (!sagAprobado) {
      eventos.push({ estado: EstadoCamion.ESPERANDO_SAG, timestamp: sumarMinutos(horaFinParada, 120) });
      eventos.push({ estado: EstadoCamion.APROBADO_SAG, timestamp: sumarMinutos(horaFinParada, 145) });
    }
    // Inspección SAG
    await prisma.inspeccionSAG.create({
      data: {
        camionId: camion.id,
        inspectorId: ctx.inspectorSAG.id,
        estado: sagAprobado ? EstadoInspeccion.APROBADO : EstadoInspeccion.RECHAZADO,
        timestampInicio: sumarMinutos(horaFinParada, 50),
        timestampResolucion: sumarMinutos(horaFinParada, sagAprobado ? 80 : 145),
      },
    });
  }
  eventos.push({ estado: EstadoCamion.LISTO, timestamp: sumarMinutos(horaSalidaReal, -10) });
  eventos.push({ estado: EstadoCamion.DESPACHADO, timestamp: horaSalidaReal });

  await prisma.eventoCamion.createMany({
    data: eventos.map(e => ({
      camionId: camion.id,
      estado: e.estado,
      timestamp: e.timestamp,
      usuarioId: usuarioGenericoId,
    })),
  });

  // Justificación de atraso
  if (!onTime && random() < 0.65) {
    const causa = escenario === 'FALLA_ANDEN'
      ? CausaJustificacion.FALLA_ANDEN
      : escenario === 'FALTA_PRODUCTO'
        ? CausaJustificacion.FALTA_PRODUCTO
        : eligePeso<CausaJustificacion>(
          [
            CausaJustificacion.FALLA_ANDEN,
            CausaJustificacion.FALLA_MECANICA,
            CausaJustificacion.FALTA_PERSONAL,
            CausaJustificacion.FALTA_PRODUCTO,
            CausaJustificacion.VOLUMEN_EXCESIVO,
            CausaJustificacion.PROBLEMA_CALIDAD,
            CausaJustificacion.OTRO,
          ],
          [0.20, 0.15, 0.18, 0.12, 0.20, 0.08, 0.07],
        );
    await prisma.justificacionAtraso.create({
      data: {
        paradaId: parada.id,
        causa,
        descripcion: 'Atraso justificado por el supervisor.',
        excluirDelCalculo: random() < 0.5,
        registradoPorId: ctx.supervisor?.id ?? usuarioGenericoId!,
      },
    });
  }

  return { camion, parada };
}

// ─── Escenarios emblemáticos ────────────────────────────────────────────────

async function aplicarEscenarioAveria(camionAfectadoId: string, fecha: Date, ctx: ContextoGen) {
  // Crear sustituto Y simulado: marcar camion X como AVERIADO con sustituto en evento
  const x = await prisma.camion.findUnique({ where: { id: camionAfectadoId } });
  if (!x) return;
  await prisma.camion.update({
    where: { id: x.id },
    data: { estado: EstadoCamion.AVERIADO },
  });
  await prisma.incidenteCamion.create({
    data: {
      camionId: x.id,
      tipo: TipoIncidente.AVERIA,
      accion: AccionIncidente.SUSTITUIR,
      estadoCamionEnIncidente: EstadoCamion.EN_CARGA,
      descripcion: 'Falla mecánica del remolque. Se gestiona sustitución con transportista.',
      registradoPorId: ctx.supervisor!.id,
      timestamp: sumarMinutos(fecha, 11 * 60),
      resueltoEn: sumarMinutos(fecha, 12 * 60),
    },
  });
}

async function aplicarEscenarioFallaAnden(fecha: Date, ctx: ContextoGen) {
  // Marcar varios camiones del día con justificación FALLA_ANDEN
  const camionesDia = await prisma.camion.findMany({
    where: { horaLlegadaPlanificada: { gte: fecha, lt: sumarMinutos(fecha, 24 * 60) } },
    take: 5,
  });
  for (const c of camionesDia) {
    const parada = await prisma.paradaExpedicion.findFirst({ where: { camionId: c.id } });
    if (!parada) continue;
    const existing = await prisma.justificacionAtraso.findUnique({ where: { paradaId: parada.id } });
    if (!existing) {
      await prisma.justificacionAtraso.create({
        data: {
          paradaId: parada.id,
          causa: CausaJustificacion.FALLA_ANDEN,
          descripcion: 'Andén F2 fuera de servicio por mantenimiento de emergencia.',
          excluirDelCalculo: true,
          registradoPorId: ctx.supervisor!.id,
        },
      });
    }
  }
}

// ─── Generador principal ────────────────────────────────────────────────────

async function main() {
  console.log(`📅 Periodo: ${INICIO.toISOString().slice(0, 10)} → ${HOY.toISOString().slice(0, 10)} (${DIAS} días)`);

  await reset();
  const { pickineros, cargadores } = await crearOperadoresExtra();
  const polivalentes = [...pickineros, ...cargadores].filter(u => u.polivalente);
  const clientes = await prisma.cliente.findMany();
  const andenes = await prisma.anden.findMany();
  const productos = await prisma.producto.findMany();
  const inspectorSAG = await prisma.usuario.findFirst({ where: { rol: RolUsuario.SAG } });
  const supervisor = await prisma.usuario.findFirst({ where: { rol: RolUsuario.SUPERVISOR } });
  const portero = await prisma.usuario.findFirst({ where: { rol: RolUsuario.PORTERO } });

  if (!inspectorSAG || !supervisor) throw new Error('Faltan usuarios base. Corré npm run prisma:seed primero.');

  const ctx: ContextoGen = {
    pickineros,
    cargadores,
    polivalentes,
    andenes,
    productos,
    inspectorSAG,
    porteroId: portero?.id ?? null,
    supervisor,
  };

  console.log('🚚 Generando camiones día por día...');
  let totalCamiones = 0;
  let camionAveriaId: string | null = null;

  for (let d = 0; d < DIAS; d++) {
    const fecha = new Date(INICIO); fecha.setDate(fecha.getDate() + d);
    const esPico = d === DIA_PICO;
    const plan = generarPlanDiario(fecha, clientes, d, esPico);

    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      let escenario: 'AVERIA' | 'FALLA_ANDEN' | 'FALTA_PRODUCTO' | undefined;

      if (d === DIA_AVERIA && i === 3 && p.tipo === TipoCamion.NACIONAL) escenario = 'AVERIA';
      else if (d === DIA_FALTA_PRODUCTO && p.tipo === TipoCamion.EXPORTACION && !camionAveriaId) escenario = 'FALTA_PRODUCTO';

      const { camion } = await generarCamion(p, d, ctx, escenario);
      if (escenario === 'AVERIA') camionAveriaId = camion.id;
      totalCamiones++;
    }

    if (d === DIA_AVERIA && camionAveriaId) await aplicarEscenarioAveria(camionAveriaId, fecha, ctx);
    if (d === DIA_FALLA_ANDEN) await aplicarEscenarioFallaAnden(fecha, ctx);

    if ((d + 1) % 10 === 0) console.log(`  ... día ${d + 1}/${DIAS} (${totalCamiones} camiones acumulados)`);
  }

  console.log(`✅ Datos sintéticos generados: ${totalCamiones} camiones a lo largo de ${DIAS} días.`);
  console.log('🎯 Curva de mejora: OTIF y cumplimiento crecen, atrasos y tiempo de ciclo decrecen.');
  console.log('🚩 Días emblemáticos:');
  console.log(`   - Día ${DIA_AVERIA + 1}: avería + sustitución de camión NACIONAL`);
  console.log(`   - Día ${DIA_FALLA_ANDEN + 1}: falla de andén F2 (5 camiones afectados)`);
  console.log(`   - Día ${DIA_FALTA_PRODUCTO + 1}: falta de producto en EXPORTACIÓN`);
  console.log(`   - Día ${DIA_PICO + 1}: día pico (30+ camiones)`);
}

main()
  .catch(e => {
    console.error('❌ Error generando datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
