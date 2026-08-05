/**
 * Generador de datos sintéticos realistas — 180 días terminando hoy.
 *
 * Contexto de negocio (recopilado del cliente para la defensa de título):
 *
 * - Calendario: planta opera lunes a sábado. Domingo cierra desde las 06:00 y
 *   reabre a las 22:30 para empezar a recibir camiones hasta el próximo sábado.
 * - Volumen: martes es el día pico (~100 camiones), miércoles/jueves altos,
 *   el resto de los días laborales ronda los 40-70. Domingo casi no recibe
 *   (solo la ventana de 22:30 a 23:59). Promedio semanal ~70-80/día laboral.
 * - Puntos de expedición: Aves exporta en fresco; Cerdo NUNCA exporta (solo
 *   nacional/interplanta); Frigorífico exporta congelado (aves, cerdo y
 *   salmón congelados). Los camiones de exportación predominan sobre
 *   nacional/interplanta en cualquier momento dentro de la planta.
 * - Tiempos: portería ≤10 min; carga ≤1h20-1h30 por punto; túnel de frío
 *   hasta presentación a SAG ~8-8.5h (esto excede estructuralmente el límite
 *   legal "de referencia" de 6h para exportación — es la norma, no la
 *   excepción, tal como describió el cliente). Límite legal referencial:
 *   3h nacional/interplanta, 6h exportación. 5-10% de los camiones exceden
 *   fuertemente ese límite por atrasos reales (mecánicos, reinspecciones, etc).
 * - SAG: 60-70% de rechazo en la inspección (calculado sobre el total de
 *   registros de inspección, incluyendo reinspecciones).
 * - Andenes fuera de servicio: 1-2 fallas por semana en total (cualquier
 *   andén de Aves o Cerdo), reparación de duración muy variable (30 min a
 *   un día completo). Frigorífico casi nunca falla (outlier ~4% de los casos)
 *   por la criticidad de temperatura de sus productos. Se guarda como
 *   historial permanente (HistorialAndenFueraServicio), no solo como estado
 *   actual, y al final del período se deja UN andén actualmente fuera de
 *   servicio para poder demostrar la función en vivo.
 *
 * Rendimiento: con ~70 camiones/día promedio durante 180 días (~11.000-12.000
 * camiones y varios cientos de miles de registros hijos), generar todo con
 * awaits individuales sería impracticable contra una BD remota. Por eso todo
 * el dataset se arma en memoria (IDs propios, sin depender de retornos de la
 * BD) y se inserta con createMany en lotes.
 *
 * Ejecutar con:  npm run generar-datos:demo
 *
 * IMPORTANTE: borra todos los datos transaccionales antes de generar.
 * Mantiene catálogos base (edificios, andenes, productos, clientes, usuarios).
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

// ─── Configuración general ──────────────────────────────────────────────────

const DIAS = 180;
const HOY = new Date(); HOY.setHours(0, 0, 0, 0);
const INICIO = new Date(HOY); INICIO.setDate(INICIO.getDate() - DIAS + 1);

const LOTE = 1000; // tamaño de lote para createMany

// Volumen diario por día de semana (Date.getDay(): 0=domingo ... 6=sábado)
const VOLUMEN_POR_DIA_SEMANA: Record<number, { min: number; max: number }> = {
  0: { min: 8,  max: 18  }, // domingo: solo ventana 22:30-23:59
  1: { min: 60, max: 70  }, // lunes
  2: { min: 95, max: 108 }, // martes: día pico
  3: { min: 85, max: 100 }, // miércoles
  4: { min: 80, max: 95  }, // jueves
  5: { min: 60, max: 70  }, // viernes
  6: { min: 52, max: 65  }, // sábado
};

// Exportación predomina sobre nacional/interplanta
const DISTRIBUCION_TIPO = {
  EXPORTACION: 0.48,
  NACIONAL: 0.32,
  INTERPLANTA: 0.20,
};

// Cerdo nunca exporta. Frigorífico exporta congelado, Aves exporta fresco.
const PESO_EDIFICIO_EXPORTACION: Record<string, number> = { AVES: 0.40, FRIGORIFICO: 0.60 };
const PESO_EDIFICIO_NAC_INTER: Record<string, number> = { AVES: 0.34, CERDO: 0.33, FRIGORIFICO: 0.33 };

const PALLETS_POR_TIPO: Record<TipoCamion, { min: number; max: number }> = {
  NACIONAL:    { min: 5,  max: 12 },
  EXPORTACION: { min: 18, max: 25 },
  INTERPLANTA: { min: 8,  max: 15 },
};
const PRODUCTOS_POR_PALLET = { min: 2, max: 3 };
const UNIDADES_POR_PRODUCTO = { min: 20, max: 80 };

// Tiempos (minutos)
const PORTERIA_MIN = { min: 3, max: 10 };            // portería ≤10 min
const HANDOFF_MIN = { min: 2, max: 8 };               // transiciones breves entre etapas
const TUNEL_MIN = { min: 480, max: 510 };             // 8 a 8.5 horas
const SAG_ESPERA_MIN = { min: 15, max: 45 };
const SAG_REESPERA_EXTRA_MIN = { min: 60, max: 180 };

const LIMITE_LEGAL_MIN: Record<TipoCamion, number> = {
  NACIONAL: 180, INTERPLANTA: 180, EXPORTACION: 360, // 3h / 3h / 6h de referencia
};

// Outliers: 5-10% de los camiones exceden fuertemente el límite legal
const PROB_OUTLIER = 0.07;
const PROB_OUTLIER_EXTREMO = 0.10; // de los outliers, ~10% llegan a 1-2 días (≈0.7% del total)
const OUTLIER_EXTRA_MIN = { min: 180, max: 720 };       // 3-12 horas extra
const OUTLIER_EXTRA_EXTREMO_MIN = { min: 1440, max: 2880 }; // 1-2 días extra

// SAG: calibrado para que la proporción de rechazo sobre el total de inspecciones
// (incluida la reinspección) quede en 60-70%, tal como describió el cliente.
const PROB_RECHAZO_SAG_PRIMERA = 0.70;
const PROB_APROBACION_SAG_SEGUNDA = 0.50;

// Andenes fuera de servicio: 1-2 fallas/semana en total, casi nunca Frigorífico
const OUTAGES_POR_SEMANA = { min: 1, max: 2 };
const PESO_EDIFICIO_OUTAGE: Record<string, number> = { AVES: 0.48, CERDO: 0.48, FRIGORIFICO: 0.04 };
const PROB_OUTAGE_CORTA = 0.60;
const OUTAGE_CORTA_MIN = { min: 30, max: 120 };
const OUTAGE_LARGA_MIN = { min: 240, max: 960 }; // 4-16 horas (tarde completa / al día siguiente)

const MOTIVOS_OUTAGE = [
  'Falla mecánica en el sistema de rampa hidráulica',
  'Falla eléctrica en la compuerta del andén',
  'Mantenimiento correctivo de urgencia',
  'Sensor de posicionamiento de camión dañado',
  'Falla en el sistema de sellado térmico del andén',
  'Desperfecto en la plataforma niveladora',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const random = rng(20260805); // seed determinista

function entreEnteros(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function entreFloats(min: number, max: number) {
  return random() * (max - min) + min;
}
function elemAleatorio<T>(arr: T[]): T {
  return arr[entreEnteros(0, arr.length - 1)];
}
function fechaConHora(base: Date, hora: number, minuto: number): Date {
  const d = new Date(base);
  d.setHours(hora, minuto, 0, 0);
  return d;
}
function sumarMinutos(base: Date, minutos: number): Date {
  return new Date(base.getTime() + Math.round(minutos) * 60_000);
}
function eligePeso<T extends string>(pesos: Record<T, number>): T {
  const entradas = Object.entries(pesos) as [T, number][];
  const total = entradas.reduce((a, [, p]) => a + p, 0);
  let r = random() * total;
  for (const [k, p] of entradas) {
    if (r < p) return k;
    r -= p;
  }
  return entradas[entradas.length - 1][0];
}

let contadorId = 0;
function nuevoId(prefijo: string): string {
  contadorId++;
  return `${prefijo}_${contadorId.toString(36)}`;
}

async function insertarEnLotes<T>(nombre: string, filas: T[], insertar: (lote: T[]) => Promise<unknown>) {
  if (filas.length === 0) return;
  for (let i = 0; i < filas.length; i += LOTE) {
    await insertar(filas.slice(i, i + LOTE));
  }
  console.log(`  ✅ ${nombre}: ${filas.length} filas`);
}

// ─── Reset transaccional ────────────────────────────────────────────────────

async function reset() {
  console.log('🧹 Limpiando datos transaccionales...');
  await prisma.eventoTunel.deleteMany();
  await prisma.atraso.deleteMany();
  await prisma.justificacionAtraso.deleteMany();
  await prisma.historialAndenFueraServicio.deleteMany();
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
  // Limpiar estado "en vivo" de andenes que hayan quedado de corridas previas
  await prisma.anden.updateMany({
    data: { ocupado: false, fueraDeServicio: false, motivoFueraServicio: null, fueraServicioDesde: null, fueraServicioPorId: null },
  });
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

// ─── Hora de llegada según día (respeta cierre dominical) ──────────────────

function horaLlegadaParaDia(fecha: Date): Date {
  const esDomingo = fecha.getDay() === 0;
  if (esDomingo) {
    // Solo recibe desde las 22:30 hasta las 23:59
    const hora = entreEnteros(22, 23);
    const minuto = hora === 22 ? entreEnteros(30, 59) : entreEnteros(0, 59);
    return fechaConHora(fecha, hora, minuto);
  }
  // Sesgo hacia la madrugada (horario principal de operación), con cola durante el día
  const bloque = eligePeso({ madrugada: 0.40, manana: 0.35, tarde: 0.15, noche: 0.10 });
  const rangos: Record<string, [number, number]> = {
    madrugada: [0, 6], manana: [6, 12], tarde: [12, 18], noche: [18, 24],
  };
  const [ini, fin] = rangos[bloque];
  const hora = entreEnteros(ini, fin - 1);
  const minuto = entreEnteros(0, 59);
  return fechaConHora(fecha, hora, minuto);
}

function elegirEdificio(tipo: TipoCamion): TipoEdificio {
  if (tipo === TipoCamion.EXPORTACION) {
    return eligePeso(PESO_EDIFICIO_EXPORTACION) as TipoEdificio;
  }
  return eligePeso(PESO_EDIFICIO_NAC_INTER) as TipoEdificio;
}

function duracionCargaMin(numPallets: number): number {
  const base = 20 + numPallets * 3;
  return Math.min(90, Math.max(25, Math.round(base * entreFloats(0.85, 1.15))));
}

// ─── Contenedores de filas a insertar ───────────────────────────────────────

interface Filas {
  pedidos: any[];
  camiones: any[];
  paradas: any[];
  entregas: any[];
  entregaItems: any[];
  pallets: any[];
  productosPallet: any[];
  eventosCamion: any[];
  inspeccionesSAG: any[];
  incidentesCamion: any[];
  justificacionesAtraso: any[];
  historialAnden: any[];
}

function filasVacias(): Filas {
  return {
    pedidos: [], camiones: [], paradas: [], entregas: [], entregaItems: [],
    pallets: [], productosPallet: [], eventosCamion: [], inspeccionesSAG: [],
    incidentesCamion: [], justificacionesAtraso: [], historialAnden: [],
  };
}

interface ContextoGen {
  pickineros: Usuario[];
  cargadores: Usuario[];
  andenesPorEdificio: Record<string, Anden[]>;
  productos: Producto[];
  clientesPorTipo: Record<TipoCamion, Cliente[]>;
  inspectorSAG: Usuario;
  supervisor: Usuario;
  jefe: Usuario;
}

// ─── Generación de un camión completo (en memoria) ─────────────────────────

function generarCamion(fecha: Date, diaIdx: number, ctx: ContextoGen, filas: Filas) {
  const tipo = eligePeso(DISTRIBUCION_TIPO) as TipoCamion;
  const edificioTipo = elegirEdificio(tipo);
  const clientesTipo = ctx.clientesPorTipo[tipo];
  const cliente = clientesTipo.length > 0 ? elemAleatorio(clientesTipo) : elemAleatorio(Object.values(ctx.clientesPorTipo).flat());
  const andenesEdif = ctx.andenesPorEdificio[edificioTipo];
  const anden = elemAleatorio(andenesEdif);

  const horaLlegadaPlanificada = horaLlegadaParaDia(fecha);
  const horaSalidaPlanificada = sumarMinutos(horaLlegadaPlanificada, LIMITE_LEGAL_MIN[tipo]);
  const horaLlegadaReal = sumarMinutos(horaLlegadaPlanificada, entreEnteros(-10, 15));

  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const patente = `${letras[entreEnteros(0, 25)]}${letras[entreEnteros(0, 25)]}${letras[entreEnteros(0, 25)]}${letras[entreEnteros(0, 25)]}${entreEnteros(10, 99)}`;
  const prefijo = tipo === TipoCamion.NACIONAL ? '600' : tipo === TipoCamion.EXPORTACION ? '800' : '700';
  const numeroTransporte = `${prefijo}-${nuevoId('t').slice(2)}`;

  const camionId = nuevoId('cm');
  const pedidoId = nuevoId('pd');
  const paradaId = nuevoId('pe');
  const entregaId = nuevoId('en');

  const numPallets = entreEnteros(PALLETS_POR_TIPO[tipo].min, PALLETS_POR_TIPO[tipo].max);

  filas.pedidos.push({
    id: pedidoId,
    numero: `PED-${diaIdx}-${numeroTransporte}`,
    clienteId: cliente.id,
    totalPallets: numPallets,
    totalBultos: numPallets * 25,
    fechaEntrega: horaLlegadaPlanificada,
  });

  // ── Timeline ──
  const porteriaMin = entreEnteros(PORTERIA_MIN.min, PORTERIA_MIN.max);
  const tAsignado = sumarMinutos(horaLlegadaReal, porteriaMin);
  const tInicioCarga = sumarMinutos(tAsignado, entreEnteros(HANDOFF_MIN.min, HANDOFF_MIN.max));
  const cargaMin = duracionCargaMin(numPallets);
  const tFinCarga = sumarMinutos(tInicioCarga, cargaMin);

  let estadoFinal: EstadoCamion = EstadoCamion.DESPACHADO;
  let horaSalidaReal: Date | null = null;
  let sagAprobadoFinal: boolean | null = null;

  const eventos: { estado: EstadoCamion; timestamp: Date }[] = [
    { estado: EstadoCamion.ESPERADO, timestamp: sumarMinutos(horaLlegadaPlanificada, -30) },
    { estado: EstadoCamion.EN_PORTERIA, timestamp: horaLlegadaReal },
    { estado: EstadoCamion.ASIGNADO, timestamp: tAsignado },
    { estado: EstadoCamion.EN_CARGA, timestamp: tInicioCarga },
  ];

  const esOutlier = random() < PROB_OUTLIER;
  const esOutlierExtremo = esOutlier && random() < PROB_OUTLIER_EXTREMO;
  const extraOutlierMin = esOutlierExtremo
    ? entreEnteros(OUTLIER_EXTRA_EXTREMO_MIN.min, OUTLIER_EXTRA_EXTREMO_MIN.max)
    : esOutlier
      ? entreEnteros(OUTLIER_EXTRA_MIN.min, OUTLIER_EXTRA_MIN.max)
      : 0;

  if (tipo === TipoCamion.EXPORTACION) {
    const tTunel = sumarMinutos(tFinCarga, entreEnteros(HANDOFF_MIN.min, HANDOFF_MIN.max));
    const tunelMin = entreEnteros(TUNEL_MIN.min, TUNEL_MIN.max);
    const tEsperandoSag = sumarMinutos(tTunel, tunelMin);

    eventos.push({ estado: EstadoCamion.EN_TUNEL_FRIO, timestamp: tTunel });
    eventos.push({ estado: EstadoCamion.ESPERANDO_SAG, timestamp: tEsperandoSag });

    const rechazoPrimera = random() < PROB_RECHAZO_SAG_PRIMERA;
    const tResolucionPrimera = sumarMinutos(tEsperandoSag, entreEnteros(SAG_ESPERA_MIN.min, SAG_ESPERA_MIN.max));

    filas.inspeccionesSAG.push({
      id: nuevoId('sag'),
      camionId,
      inspectorId: ctx.inspectorSAG.id,
      estado: rechazoPrimera ? EstadoInspeccion.RECHAZADO : EstadoInspeccion.APROBADO,
      timestampInicio: tEsperandoSag,
      timestampResolucion: tResolucionPrimera,
      observaciones: rechazoPrimera ? 'Temperatura o documentación no conforme en primera inspección.' : 'Conforme en primera inspección.',
    });

    let tAprobacionFinal: Date;
    if (!rechazoPrimera) {
      sagAprobadoFinal = true;
      eventos.push({ estado: EstadoCamion.APROBADO_SAG, timestamp: tResolucionPrimera });
      tAprobacionFinal = tResolucionPrimera;
    } else {
      eventos.push({ estado: EstadoCamion.RECHAZADO_SAG, timestamp: tResolucionPrimera });
      const aprobadaSegunda = random() < PROB_APROBACION_SAG_SEGUNDA;
      const tReinspeccion = sumarMinutos(tResolucionPrimera, entreEnteros(SAG_REESPERA_EXTRA_MIN.min, SAG_REESPERA_EXTRA_MIN.max));
      const tResolucionSegunda = sumarMinutos(tReinspeccion, entreEnteros(SAG_ESPERA_MIN.min, SAG_ESPERA_MIN.max));

      eventos.push({ estado: EstadoCamion.ESPERANDO_SAG, timestamp: tReinspeccion });
      filas.inspeccionesSAG.push({
        id: nuevoId('sag'),
        camionId,
        inspectorId: ctx.inspectorSAG.id,
        estado: aprobadaSegunda ? EstadoInspeccion.APROBADO : EstadoInspeccion.RECHAZADO,
        timestampInicio: tReinspeccion,
        timestampResolucion: tResolucionSegunda,
        observaciones: aprobadaSegunda ? 'Conforme en reinspección.' : 'Rechazo confirmado en reinspección. Requiere reprogramación.',
      });

      if (aprobadaSegunda) {
        sagAprobadoFinal = true;
        eventos.push({ estado: EstadoCamion.APROBADO_SAG, timestamp: tResolucionSegunda });
        tAprobacionFinal = tResolucionSegunda;
      } else {
        sagAprobadoFinal = false;
        tAprobacionFinal = tResolucionSegunda;
      }
    }

    if (sagAprobadoFinal) {
      const tListo = sumarMinutos(tAprobacionFinal, entreEnteros(5, 20) + extraOutlierMin);
      const tSalida = sumarMinutos(tListo, entreEnteros(5, 15));
      eventos.push({ estado: EstadoCamion.LISTO, timestamp: tListo });
      eventos.push({ estado: EstadoCamion.DESPACHADO, timestamp: tSalida });
      horaSalidaReal = tSalida;
      estadoFinal = EstadoCamion.DESPACHADO;
    } else {
      // Rechazo confirmado: el camión queda pendiente de reprogramación (no se despacha en este ciclo)
      estadoFinal = EstadoCamion.RECHAZADO_SAG;
      horaSalidaReal = null;
      filas.incidentesCamion.push({
        id: nuevoId('inc'),
        camionId,
        tipo: TipoIncidente.REPROGRAMACION,
        accion: AccionIncidente.REPROGRAMAR,
        estadoCamionEnIncidente: EstadoCamion.RECHAZADO_SAG,
        descripcion: 'Rechazo SAG confirmado en reinspección. Carga se reprograma para nuevo despacho.',
        registradoPorId: ctx.supervisor.id,
        timestamp: tAprobacionFinal,
        resueltoEn: sumarMinutos(tAprobacionFinal, entreEnteros(60, 300)),
      });
    }
  } else {
    // Nacional / Interplanta: sin túnel de frío ni SAG
    const tListo = sumarMinutos(tFinCarga, entreEnteros(5, 20) + extraOutlierMin);
    const tSalida = sumarMinutos(tListo, entreEnteros(5, 15));
    eventos.push({ estado: EstadoCamion.LISTO, timestamp: tListo });
    eventos.push({ estado: EstadoCamion.DESPACHADO, timestamp: tSalida });
    horaSalidaReal = tSalida;
    estadoFinal = EstadoCamion.DESPACHADO;
  }

  filas.camiones.push({
    id: camionId,
    patente,
    numeroTransporte,
    tipo,
    estado: estadoFinal,
    clienteId: cliente.id,
    pedidoId,
    andenId: anden.id,
    horaLlegadaPlanificada,
    horaSalidaPlanificada,
    horaLlegadaReal,
    horaSalidaReal,
  });

  filas.paradas.push({
    id: paradaId,
    camionId,
    andenId: anden.id,
    edificioTipo,
    orden: 1,
    estado: EstadoParada.COMPLETADO,
    cantidadPalletsSolicitados: numPallets,
    horaInicio: tInicioCarga,
    horaFin: tFinCarga,
  });

  filas.entregas.push({ id: entregaId, camionId, paradaId });

  const numProductosDistintos = entreEnteros(3, 6);
  const productosSel = [...ctx.productos].sort(() => random() - 0.5).slice(0, numProductosDistintos);
  const productosEntrega: { producto: Producto; cantidadSolicitada: number }[] = [];
  for (const prod of productosSel) {
    const cantidadSolicitada = entreEnteros(50, 200);
    filas.entregaItems.push({ id: nuevoId('ei'), entregaId, productoId: prod.id, cantidadSolicitada });
    productosEntrega.push({ producto: prod, cantidadSolicitada });
  }

  const inFull = !(estadoFinal === EstadoCamion.RECHAZADO_SAG) && random() < 0.90;

  for (let i = 0; i < numPallets; i++) {
    const pickinero = elemAleatorio(ctx.pickineros);
    const cargador = elemAleatorio(ctx.cargadores);
    const palletId = nuevoId('pl');
    const tInicioPallet = sumarMinutos(tInicioCarga, entreEnteros(0, Math.max(1, Math.round(cargaMin * 0.6))));
    const tArmadoSegundos = Math.round(entreFloats(180, 480));
    const tFinPallet = new Date(tInicioPallet.getTime() + tArmadoSegundos * 1000);

    filas.pallets.push({
      id: palletId,
      codigoUnico: nuevoId('P'),
      entregaId,
      pedidoId,
      pickineroId: pickinero.id,
      cargadorId: cargador.id,
      edificioId: anden.edificioId,
      estado: EstadoPallet.CARGADO,
      timestampInicio: tInicioPallet,
      timestampFin: tFinPallet,
      tiempoArmadoSegundos: tArmadoSegundos,
    });

    const cuantosProds = entreEnteros(PRODUCTOS_POR_PALLET.min, PRODUCTOS_POR_PALLET.max);
    const prodsDistintos = [...productosEntrega].sort(() => random() - 0.5).slice(0, cuantosProds);
    for (const pe of prodsDistintos) {
      let cantidad = entreEnteros(UNIDADES_POR_PRODUCTO.min, UNIDADES_POR_PRODUCTO.max);
      if (!inFull && random() < 0.4) cantidad = Math.round(cantidad * entreFloats(0.5, 0.85));
      filas.productosPallet.push({
        id: nuevoId('pp'),
        palletId,
        productoId: pe.producto.id,
        descripcion: pe.producto.nombre,
        cantidad,
        pesoKg: pe.producto.pesoKgUnitario ? cantidad * pe.producto.pesoKgUnitario : null,
      });
    }
  }

  for (const ev of eventos) {
    filas.eventosCamion.push({ id: nuevoId('ev'), camionId, estado: ev.estado, timestamp: ev.timestamp, usuarioId: ctx.jefe.id });
  }

  // Justificación de atraso para outliers con salida real tardía
  if (horaSalidaReal && horaSalidaReal > horaSalidaPlanificada && random() < 0.7) {
    const causa = eligePeso({
      FALLA_ANDEN: 0.18, FALLA_MECANICA: 0.22, FALTA_PERSONAL: 0.15,
      FALTA_PRODUCTO: 0.12, VOLUMEN_EXCESIVO: 0.20, PROBLEMA_CALIDAD: 0.08, OTRO: 0.05,
    }) as CausaJustificacion;
    filas.justificacionesAtraso.push({
      id: nuevoId('ja'),
      paradaId,
      causa,
      descripcion: 'Atraso justificado por el supervisor de turno.',
      excluirDelCalculo: random() < 0.5,
      registradoPorId: ctx.supervisor.id,
    });
  }
}

// ─── Fallas de andén (historial completo, no solo estado actual) ───────────

function generarFallasAnden(ctx: ContextoGen, filas: Filas) {
  const semanas = Math.ceil(DIAS / 7);
  const eventosGenerados: { andenId: string; desde: Date }[] = [];

  for (let s = 0; s < semanas; s++) {
    const outagesEstaSemana = entreEnteros(OUTAGES_POR_SEMANA.min, OUTAGES_POR_SEMANA.max);
    for (let o = 0; o < outagesEstaSemana; o++) {
      const edificioTipo = eligePeso(PESO_EDIFICIO_OUTAGE) as TipoEdificio;
      const andenesEdif = ctx.andenesPorEdificio[edificioTipo];
      if (!andenesEdif || andenesEdif.length === 0) continue;
      const anden = elemAleatorio(andenesEdif);

      const diaEnSemana = entreEnteros(1, 6); // evita domingo
      const fechaBase = new Date(INICIO);
      fechaBase.setDate(fechaBase.getDate() + s * 7 + diaEnSemana);
      if (fechaBase > HOY) continue;

      const desde = fechaConHora(fechaBase, entreEnteros(0, 20), entreEnteros(0, 59));
      const esCorta = random() < PROB_OUTAGE_CORTA;
      const duracionMin = esCorta
        ? entreEnteros(OUTAGE_CORTA_MIN.min, OUTAGE_CORTA_MIN.max)
        : entreEnteros(OUTAGE_LARGA_MIN.min, OUTAGE_LARGA_MIN.max);
      const hasta = sumarMinutos(desde, duracionMin);

      filas.historialAnden.push({
        id: nuevoId('hf'),
        andenId: anden.id,
        motivo: elemAleatorio(MOTIVOS_OUTAGE),
        desde,
        hasta,
        marcadoPorId: ctx.supervisor.id,
        reactivadoPorId: ctx.supervisor.id,
      });
      eventosGenerados.push({ andenId: anden.id, desde });
    }
  }
  console.log(`  🔧 ${filas.historialAnden.length} fallas de andén generadas a lo largo de ${semanas} semanas`);
}

/** Deja un andén (Aves o Cerdo) actualmente fuera de servicio para demo en vivo. */
async function dejarAndenFueraDeServicioEnVivo(ctx: ContextoGen) {
  const candidatos = [...ctx.andenesPorEdificio[TipoEdificio.AVES], ...ctx.andenesPorEdificio[TipoEdificio.CERDO]];
  const anden = elemAleatorio(candidatos);
  const desde = sumarMinutos(new Date(), -entreEnteros(30, 240));

  await prisma.anden.update({
    where: { id: anden.id },
    data: {
      fueraDeServicio: true,
      motivoFueraServicio: elemAleatorio(MOTIVOS_OUTAGE),
      fueraServicioDesde: desde,
      fueraServicioPorId: ctx.supervisor.id,
    },
  });
  await prisma.historialAndenFueraServicio.create({
    data: {
      andenId: anden.id,
      motivo: 'Falla detectada esta jornada — pendiente de reparación',
      desde,
      marcadoPorId: ctx.supervisor.id,
    },
  });
  console.log(`  🔴 Andén ${anden.codigo} dejado fuera de servicio (en vivo, para demo)`);
}

// ─── Generador principal ────────────────────────────────────────────────────

async function main() {
  console.log(`📅 Periodo: ${INICIO.toISOString().slice(0, 10)} → ${HOY.toISOString().slice(0, 10)} (${DIAS} días)`);

  await reset();
  const { pickineros, cargadores } = await crearOperadoresExtra();
  const clientes = await prisma.cliente.findMany();
  const andenes = await prisma.anden.findMany({ include: { edificio: true } });
  const productos = await prisma.producto.findMany();
  const inspectorSAG = await prisma.usuario.findFirst({ where: { rol: RolUsuario.SAG } });
  const supervisor = await prisma.usuario.findFirst({ where: { rol: RolUsuario.SUPERVISOR } });
  const jefe = await prisma.usuario.findFirst({ where: { rol: RolUsuario.JEFE_DESPACHO } });

  if (!inspectorSAG || !supervisor || !jefe) throw new Error('Faltan usuarios base. Corré npm run prisma:seed primero.');

  const andenesPorEdificio: Record<string, Anden[]> = {};
  for (const a of andenes) {
    const tipo = a.edificio.tipo;
    (andenesPorEdificio[tipo] ??= []).push(a);
  }

  const clientesPorTipo: Record<TipoCamion, Cliente[]> = {
    NACIONAL: clientes.filter(c => c.tipoDestino === TipoCamion.NACIONAL),
    EXPORTACION: clientes.filter(c => c.tipoDestino === TipoCamion.EXPORTACION),
    INTERPLANTA: clientes.filter(c => c.tipoDestino === TipoCamion.INTERPLANTA),
  };

  const ctx: ContextoGen = { pickineros, cargadores, andenesPorEdificio, productos, clientesPorTipo, inspectorSAG, supervisor, jefe };

  console.log('🚚 Generando camiones día por día (en memoria)...');
  const filas = filasVacias();
  let totalCamiones = 0;

  for (let d = 0; d < DIAS; d++) {
    const fecha = new Date(INICIO); fecha.setDate(fecha.getDate() + d);
    const cfg = VOLUMEN_POR_DIA_SEMANA[fecha.getDay()];
    const totalDia = entreEnteros(cfg.min, cfg.max);

    for (let i = 0; i < totalDia; i++) {
      generarCamion(fecha, d, ctx, filas);
      totalCamiones++;
    }

    if ((d + 1) % 30 === 0) console.log(`  ... día ${d + 1}/${DIAS} (${totalCamiones} camiones acumulados)`);
  }

  generarFallasAnden(ctx, filas);

  console.log(`📦 Insertando ${totalCamiones} camiones y todos sus registros asociados...`);
  await insertarEnLotes('Pedidos', filas.pedidos, (l) => prisma.pedido.createMany({ data: l }));
  await insertarEnLotes('Camiones', filas.camiones, (l) => prisma.camion.createMany({ data: l }));
  await insertarEnLotes('Paradas de expedición', filas.paradas, (l) => prisma.paradaExpedicion.createMany({ data: l }));
  await insertarEnLotes('Entregas', filas.entregas, (l) => prisma.entrega.createMany({ data: l }));
  await insertarEnLotes('Ítems de entrega', filas.entregaItems, (l) => prisma.entregaItem.createMany({ data: l }));
  await insertarEnLotes('Pallets', filas.pallets, (l) => prisma.pallet.createMany({ data: l }));
  await insertarEnLotes('Productos por pallet', filas.productosPallet, (l) => prisma.productoPallet.createMany({ data: l }));
  await insertarEnLotes('Eventos de camión', filas.eventosCamion, (l) => prisma.eventoCamion.createMany({ data: l }));
  await insertarEnLotes('Inspecciones SAG', filas.inspeccionesSAG, (l) => prisma.inspeccionSAG.createMany({ data: l }));
  await insertarEnLotes('Incidentes de camión', filas.incidentesCamion, (l) => prisma.incidenteCamion.createMany({ data: l }));
  await insertarEnLotes('Justificaciones de atraso', filas.justificacionesAtraso, (l) => prisma.justificacionAtraso.createMany({ data: l }));
  await insertarEnLotes('Historial de andenes fuera de servicio', filas.historialAnden, (l) => prisma.historialAndenFueraServicio.createMany({ data: l }));

  await dejarAndenFueraDeServicioEnVivo(ctx);

  console.log(`✅ Dataset sintético generado: ${totalCamiones} camiones a lo largo de ${DIAS} días.`);
  console.log('🎯 Contexto reflejado: martes pico, cierre dominical, cerdo sin exportación,');
  console.log('   túnel de frío 8-8.5h, rechazo SAG 60-70%, outliers de atraso 5-10%,');
  console.log('   historial de fallas de andén y un andén dejado fuera de servicio en vivo.');
}

main()
  .catch(e => {
    console.error('❌ Error generando datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
