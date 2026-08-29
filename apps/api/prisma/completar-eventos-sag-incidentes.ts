/**
 * Script de recuperación puntual: reconstruye EventoCamion, InspeccionSAG,
 * IncidenteCamion y JustificacionAtraso para el dataset de 180 días, que
 * quedaron completamente vacíos porque el corte de disco ocurrió antes de
 * llegar a insertarlos (solo alcanzaron a completarse pedidos, camiones,
 * paradas, entregas, ítems y pallets).
 *
 * Reconstruye a partir de los datos ya persistidos (horaLlegadaReal,
 * horaSalidaReal, horaSalidaPlanificada, estado final, timing de la parada),
 * siguiendo la misma lógica probabilística que generar-datos-demo.ts.
 */
import { PrismaClient, EstadoCamion, EstadoInspeccion, TipoIncidente, AccionIncidente, CausaJustificacion } from '@prisma/client';

const prisma = new PrismaClient();
const LOTE = 300;

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const random = rng(731049);
function entreEnteros(min: number, max: number) { return Math.floor(random() * (max - min + 1)) + min; }
function sumarMinutos(base: Date, minutos: number): Date { return new Date(base.getTime() + Math.round(minutos) * 60_000); }
function eligePeso<T extends string>(pesos: Record<T, number>): T {
  const entradas = Object.entries(pesos) as [T, number][];
  const total = entradas.reduce((a, [, p]) => a + p, 0);
  let r = random() * total;
  for (const [k, p] of entradas) { if (r < p) return k; r -= p; }
  return entradas[entradas.length - 1][0];
}

let contador = 0;
function nuevoId(prefijo: string) { contador++; return `${prefijo}_${contador.toString(36)}`; }

async function main() {
  const jefe = await prisma.usuario.findFirst({ where: { rol: 'JEFE_DESPACHO' } });
  const supervisor = await prisma.usuario.findFirst({ where: { rol: 'SUPERVISOR' } });
  const inspectorSAG = await prisma.usuario.findFirst({ where: { rol: 'SAG' } });
  if (!jefe || !supervisor || !inspectorSAG) throw new Error('Faltan usuarios base');

  const camiones = await prisma.camion.findMany({
    select: {
      id: true, tipo: true, estado: true,
      horaLlegadaPlanificada: true, horaLlegadaReal: true,
      horaSalidaPlanificada: true, horaSalidaReal: true,
      paradas: { where: { orden: 1 }, select: { id: true, horaInicio: true, horaFin: true } },
    },
  });
  console.log(`🔍 ${camiones.length} camiones a procesar`);

  const eventos: any[] = [];
  const inspecciones: any[] = [];
  const incidentes: any[] = [];
  const justificaciones: any[] = [];

  for (const c of camiones) {
    const parada = c.paradas[0];
    if (!c.horaLlegadaReal || !parada?.horaInicio) continue; // camión aún no operado (ESPERADO/EN_PORTERIA de hoy)

    const tInicioCarga = parada.horaInicio;
    const tFinCarga = parada.horaFin ?? sumarMinutos(tInicioCarga, 40);

    eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.ESPERADO, timestamp: sumarMinutos(c.horaLlegadaPlanificada, -30), usuarioId: jefe.id });
    eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.EN_PORTERIA, timestamp: c.horaLlegadaReal, usuarioId: jefe.id });
    eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.ASIGNADO, timestamp: sumarMinutos(c.horaLlegadaReal, entreEnteros(3, 10)), usuarioId: jefe.id });
    eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.EN_CARGA, timestamp: tInicioCarga, usuarioId: supervisor.id });

    if (c.tipo === 'EXPORTACION') {
      const tTunel = sumarMinutos(tFinCarga, entreEnteros(2, 8));
      const tunelMin = entreEnteros(480, 510);
      const tEsperandoSag = sumarMinutos(tTunel, tunelMin);
      eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.EN_TUNEL_FRIO, timestamp: tTunel, usuarioId: supervisor.id });
      eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.ESPERANDO_SAG, timestamp: tEsperandoSag, usuarioId: supervisor.id });

      const tResolucionPrimera = sumarMinutos(tEsperandoSag, entreEnteros(15, 45));

      if (c.estado === EstadoCamion.RECHAZADO_SAG) {
        // Permanentemente rechazado: dos inspecciones, ambas RECHAZADO
        inspecciones.push({ id: nuevoId('sag'), camionId: c.id, inspectorId: inspectorSAG.id, estado: EstadoInspeccion.RECHAZADO, timestampInicio: tEsperandoSag, timestampResolucion: tResolucionPrimera, observaciones: 'Temperatura o documentación no conforme en primera inspección.' });
        eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.RECHAZADO_SAG, timestamp: tResolucionPrimera, usuarioId: inspectorSAG.id });

        const tReinspeccion = sumarMinutos(tResolucionPrimera, entreEnteros(60, 180));
        const tResolucionSegunda = sumarMinutos(tReinspeccion, entreEnteros(15, 45));
        eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.ESPERANDO_SAG, timestamp: tReinspeccion, usuarioId: supervisor.id });
        inspecciones.push({ id: nuevoId('sag'), camionId: c.id, inspectorId: inspectorSAG.id, estado: EstadoInspeccion.RECHAZADO, timestampInicio: tReinspeccion, timestampResolucion: tResolucionSegunda, observaciones: 'Rechazo confirmado en reinspección. Requiere reprogramación.' });
        eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.RECHAZADO_SAG, timestamp: tResolucionSegunda, usuarioId: inspectorSAG.id });

        incidentes.push({
          id: nuevoId('inc'), camionId: c.id, tipo: TipoIncidente.REPROGRAMACION, accion: AccionIncidente.REPROGRAMAR,
          estadoCamionEnIncidente: EstadoCamion.RECHAZADO_SAG,
          descripcion: 'Rechazo SAG confirmado en reinspección. Carga se reprograma para nuevo despacho.',
          registradoPorId: supervisor.id, timestamp: tResolucionSegunda, resueltoEn: sumarMinutos(tResolucionSegunda, entreEnteros(60, 300)),
        });
      } else {
        // Terminó despachado: probabilidad condicional de aprobación en primer intento ≈ 0.30/0.65
        const aprobadoPrimeraVez = random() < 0.4615;
        if (aprobadoPrimeraVez) {
          inspecciones.push({ id: nuevoId('sag'), camionId: c.id, inspectorId: inspectorSAG.id, estado: EstadoInspeccion.APROBADO, timestampInicio: tEsperandoSag, timestampResolucion: tResolucionPrimera, observaciones: 'Conforme en primera inspección.' });
          eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.APROBADO_SAG, timestamp: tResolucionPrimera, usuarioId: inspectorSAG.id });
        } else {
          inspecciones.push({ id: nuevoId('sag'), camionId: c.id, inspectorId: inspectorSAG.id, estado: EstadoInspeccion.RECHAZADO, timestampInicio: tEsperandoSag, timestampResolucion: tResolucionPrimera, observaciones: 'Temperatura o documentación no conforme en primera inspección.' });
          eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.RECHAZADO_SAG, timestamp: tResolucionPrimera, usuarioId: inspectorSAG.id });

          const tReinspeccion = sumarMinutos(tResolucionPrimera, entreEnteros(60, 180));
          const tResolucionSegunda = sumarMinutos(tReinspeccion, entreEnteros(15, 45));
          eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.ESPERANDO_SAG, timestamp: tReinspeccion, usuarioId: supervisor.id });
          inspecciones.push({ id: nuevoId('sag'), camionId: c.id, inspectorId: inspectorSAG.id, estado: EstadoInspeccion.APROBADO, timestampInicio: tReinspeccion, timestampResolucion: tResolucionSegunda, observaciones: 'Conforme en reinspección.' });
          eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.APROBADO_SAG, timestamp: tResolucionSegunda, usuarioId: inspectorSAG.id });
        }
      }
    }

    if (c.estado === EstadoCamion.DESPACHADO && c.horaSalidaReal) {
      const tListo = sumarMinutos(c.horaSalidaReal, -entreEnteros(5, 15));
      eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.LISTO, timestamp: tListo, usuarioId: supervisor.id });
      eventos.push({ id: nuevoId('ev'), camionId: c.id, estado: EstadoCamion.DESPACHADO, timestamp: c.horaSalidaReal, usuarioId: jefe.id });
    }

    // Justificación de atraso si la salida real superó la planificada
    if (c.horaSalidaReal && c.horaSalidaPlanificada && c.horaSalidaReal > c.horaSalidaPlanificada && random() < 0.7) {
      const causa = eligePeso({
        FALLA_ANDEN: 0.18, FALLA_MECANICA: 0.22, FALTA_PERSONAL: 0.15,
        FALTA_PRODUCTO: 0.12, VOLUMEN_EXCESIVO: 0.20, PROBLEMA_CALIDAD: 0.08, OTRO: 0.05,
      }) as CausaJustificacion;
      justificaciones.push({
        id: nuevoId('ja'), paradaId: parada.id, causa, descripcion: 'Atraso justificado por el supervisor de turno.',
        excluirDelCalculo: random() < 0.5, registradoPorId: supervisor.id,
      });
    }
  }

  console.log(`📝 Eventos: ${eventos.length} | Inspecciones SAG: ${inspecciones.length} | Incidentes: ${incidentes.length} | Justificaciones: ${justificaciones.length}`);

  for (let i = 0; i < eventos.length; i += LOTE) await prisma.eventoCamion.createMany({ data: eventos.slice(i, i + LOTE) });
  console.log('✅ EventoCamion insertado');
  for (let i = 0; i < inspecciones.length; i += LOTE) await prisma.inspeccionSAG.createMany({ data: inspecciones.slice(i, i + LOTE) });
  console.log('✅ InspeccionSAG insertado');
  for (let i = 0; i < incidentes.length; i += LOTE) await prisma.incidenteCamion.createMany({ data: incidentes.slice(i, i + LOTE) });
  console.log('✅ IncidenteCamion insertado');
  for (let i = 0; i < justificaciones.length; i += LOTE) await prisma.justificacionAtraso.createMany({ data: justificaciones.slice(i, i + LOTE) });
  console.log('✅ JustificacionAtraso insertado');

  console.log('🎉 Recuperación completada.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
