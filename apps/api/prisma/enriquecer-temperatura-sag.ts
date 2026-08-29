/**
 * Enriquece el dataset con temperatura de túnel real y causalmente ligada
 * al resultado de la inspección SAG — decisión de modelado deliberada para
 * el árbol de decisión de riesgo SAG (ver bitácora, sección 9.6).
 *
 * Regla de negocio: temperatura objetivo de cadena de frío -18°C. Camiones
 * aprobados tienden a estar cerca de ese objetivo (con algo de ruido);
 * camiones rechazados tienden a estar más alejados (más "calientes"),
 * con solapamiento realista en la zona límite — no es un corte perfecto.
 *
 * Genera la temperatura HACIA ATRÁS a partir del resultado SAG ya existente
 * (no se tocan las inspecciones ya generadas), y crea el registro
 * EventoTunel correspondiente para cada camión de exportación.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LOTE = 300;

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const random = rng(48213);

/** Aproximación de ruido gaussiano (suma de 3 uniformes, escalada) */
function ruidoGaussiano(desviacion: number): number {
  const suma = random() + random() + random() - 1.5; // media 0, rango aprox [-1.5, 1.5]
  return suma * desviacion;
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

let contador = 0;
function nuevoId() { contador++; return `evt_${contador.toString(36)}`; }

async function main() {
  const operador = await prisma.usuario.findFirst({ where: { rol: 'OPERADOR_TUNEL' } });
  if (!operador) throw new Error('Falta usuario OPERADOR_TUNEL');

  const camiones = await prisma.camion.findMany({
    where: { tipo: 'EXPORTACION' },
    select: {
      id: true,
      inspecciones: { orderBy: { timestampResolucion: 'desc' }, take: 1, select: { estado: true } },
      eventos: { where: { estado: 'ESPERANDO_SAG' }, orderBy: { timestamp: 'asc' }, take: 1, select: { timestamp: true } },
    },
  });
  console.log(`🔍 ${camiones.length} camiones de exportación a procesar`);

  const filas: any[] = [];
  let sinInspeccion = 0;

  for (const c of camiones) {
    const inspeccionFinal = c.inspecciones[0];
    if (!inspeccionFinal) { sinInspeccion++; continue; }

    const aprobado = inspeccionFinal.estado === 'APROBADO';
    // Regla causal: aprobado → cerca de -18°C; rechazado → más cálido, con más dispersión
    const temperatura = aprobado
      ? clamp(-18 + ruidoGaussiano(1.6), -24, -13)
      : clamp(-13 + ruidoGaussiano(2.8), -20, -4);

    const timestamp = c.eventos[0]?.timestamp ?? new Date();

    filas.push({
      id: nuevoId(),
      camionId: c.id,
      operadorId: operador.id,
      temperaturaRegistrada: Math.round(temperatura * 10) / 10,
      timestamp,
      observaciones: aprobado ? 'Temperatura dentro de rango de cadena de frío.' : 'Temperatura fuera del rango esperado.',
    });
  }

  console.log(`📝 ${filas.length} registros de temperatura a insertar (${sinInspeccion} camiones sin inspección resuelta, omitidos)`);

  for (let i = 0; i < filas.length; i += LOTE) {
    await prisma.eventoTunel.createMany({ data: filas.slice(i, i + LOTE) });
  }
  console.log('✅ EventoTunel insertado');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
