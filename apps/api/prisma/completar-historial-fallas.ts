/**
 * Script de recuperación puntual: genera el historial de fallas de andén
 * (que quedó pendiente por el corte de disco durante generar-datos-demo.ts)
 * y el historial equivalente para túneles de frío (feature nueva).
 * Deja un andén y un túnel actualmente fuera de servicio para demo en vivo.
 */
import { PrismaClient, TipoEdificio } from '@prisma/client';

const prisma = new PrismaClient();
const DIAS = 180;
const HOY = new Date(); HOY.setHours(0, 0, 0, 0);
const INICIO = new Date(HOY); INICIO.setDate(INICIO.getDate() - DIAS + 1);

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const random = rng(55221);
function entreEnteros(min: number, max: number) { return Math.floor(random() * (max - min + 1)) + min; }
function elemAleatorio<T>(arr: T[]): T { return arr[entreEnteros(0, arr.length - 1)]; }
function fechaConHora(base: Date, hora: number, minuto: number): Date { const d = new Date(base); d.setHours(hora, minuto, 0, 0); return d; }
function sumarMinutos(base: Date, minutos: number): Date { return new Date(base.getTime() + Math.round(minutos) * 60_000); }
function eligePeso<T extends string>(pesos: Record<T, number>): T {
  const entradas = Object.entries(pesos) as [T, number][];
  const total = entradas.reduce((a, [, p]) => a + p, 0);
  let r = random() * total;
  for (const [k, p] of entradas) { if (r < p) return k; r -= p; }
  return entradas[entradas.length - 1][0];
}

const MOTIVOS = [
  'Falla mecánica en el sistema de rampa hidráulica',
  'Falla eléctrica en la compuerta',
  'Mantenimiento correctivo de urgencia',
  'Sensor de posicionamiento dañado',
  'Falla en el sistema de sellado térmico',
  'Desperfecto en la plataforma niveladora',
];

async function main() {
  const supervisor = await prisma.usuario.findFirst({ where: { rol: 'SUPERVISOR' } });
  if (!supervisor) throw new Error('Falta usuario SUPERVISOR');

  const andenes = await prisma.anden.findMany({ include: { edificio: true } });
  const tuneles = await prisma.tunelFrio.findMany({ include: { edificio: true } });

  const andenesPorEdificio: Record<string, typeof andenes> = {};
  for (const a of andenes) (andenesPorEdificio[a.edificio.tipo] ??= []).push(a);

  // ── Historial de fallas de andén: 1-2 por semana, casi nunca Frigorífico ──
  const PESO_EDIFICIO_OUTAGE: Record<string, number> = { AVES: 0.48, CERDO: 0.48, FRIGORIFICO: 0.04 };
  const semanas = Math.ceil(DIAS / 7);
  const historialAnden: any[] = [];

  for (let s = 0; s < semanas; s++) {
    const outages = entreEnteros(1, 2);
    for (let o = 0; o < outages; o++) {
      const edificioTipo = eligePeso(PESO_EDIFICIO_OUTAGE) as TipoEdificio;
      const lista = andenesPorEdificio[edificioTipo];
      if (!lista || lista.length === 0) continue;
      const anden = elemAleatorio(lista);

      const diaEnSemana = entreEnteros(1, 6);
      const fechaBase = new Date(INICIO);
      fechaBase.setDate(fechaBase.getDate() + s * 7 + diaEnSemana);
      if (fechaBase > HOY) continue;

      const desde = fechaConHora(fechaBase, entreEnteros(0, 20), entreEnteros(0, 59));
      const esCorta = random() < 0.6;
      const duracionMin = esCorta ? entreEnteros(30, 120) : entreEnteros(240, 960);
      const hasta = sumarMinutos(desde, duracionMin);

      historialAnden.push({
        andenId: anden.id,
        motivo: elemAleatorio(MOTIVOS),
        desde,
        hasta,
        marcadoPorId: supervisor.id,
        reactivadoPorId: supervisor.id,
      });
    }
  }

  for (let i = 0; i < historialAnden.length; i += 200) {
    await prisma.historialAndenFueraServicio.createMany({ data: historialAnden.slice(i, i + 200) });
  }
  console.log(`✅ ${historialAnden.length} fallas de andén generadas (${semanas} semanas)`);

  // ── Historial de fallas de túnel: mismo patrón, menor frecuencia (5 túneles) ──
  const historialTunel: any[] = [];
  for (let s = 0; s < semanas; s++) {
    // ~1 falla cada 2 semanas en promedio entre los 5 túneles
    if (random() < 0.5) continue;
    const tunel = elemAleatorio(tuneles);
    const diaEnSemana = entreEnteros(1, 6);
    const fechaBase = new Date(INICIO);
    fechaBase.setDate(fechaBase.getDate() + s * 7 + diaEnSemana);
    if (fechaBase > HOY) continue;

    const desde = fechaConHora(fechaBase, entreEnteros(0, 20), entreEnteros(0, 59));
    const esCorta = random() < 0.6;
    const duracionMin = esCorta ? entreEnteros(30, 120) : entreEnteros(240, 960);
    const hasta = sumarMinutos(desde, duracionMin);

    historialTunel.push({
      tunelId: tunel.id,
      motivo: elemAleatorio(MOTIVOS),
      desde,
      hasta,
      marcadoPorId: supervisor.id,
      reactivadoPorId: supervisor.id,
    });
  }

  for (let i = 0; i < historialTunel.length; i += 200) {
    await prisma.historialTunelFueraServicio.createMany({ data: historialTunel.slice(i, i + 200) });
  }
  console.log(`✅ ${historialTunel.length} fallas de túnel generadas (${semanas} semanas)`);

  // ── Dejar un andén (Aves o Cerdo) fuera de servicio en vivo ──
  const candidatosAnden = [...(andenesPorEdificio['AVES'] ?? []), ...(andenesPorEdificio['CERDO'] ?? [])];
  const andenLibre = candidatosAnden.find(a => !a.ocupado) ?? candidatosAnden[0];
  const desdeAnden = sumarMinutos(new Date(), -entreEnteros(30, 240));
  await prisma.anden.update({
    where: { id: andenLibre.id },
    data: { fueraDeServicio: true, motivoFueraServicio: elemAleatorio(MOTIVOS), fueraServicioDesde: desdeAnden, fueraServicioPorId: supervisor.id },
  });
  await prisma.historialAndenFueraServicio.create({
    data: { andenId: andenLibre.id, motivo: 'Falla detectada esta jornada — pendiente de reparación', desde: desdeAnden, marcadoPorId: supervisor.id },
  });
  console.log(`🔴 Andén ${andenLibre.codigo} dejado fuera de servicio (en vivo, para demo)`);

  // ── Dejar un túnel fuera de servicio en vivo ──
  const tunelLibre = tuneles.find(t => !t.ocupado) ?? tuneles[0];
  const desdeTunel = sumarMinutos(new Date(), -entreEnteros(30, 180));
  await prisma.tunelFrio.update({
    where: { id: tunelLibre.id },
    data: { fueraDeServicio: true, motivoFueraServicio: elemAleatorio(MOTIVOS), fueraServicioDesde: desdeTunel, fueraServicioPorId: supervisor.id },
  });
  await prisma.historialTunelFueraServicio.create({
    data: { tunelId: tunelLibre.id, motivo: 'Falla detectada esta jornada — pendiente de reparación', desde: desdeTunel, marcadoPorId: supervisor.id },
  });
  console.log(`🔴 Túnel ${tunelLibre.codigo} dejado fuera de servicio (en vivo, para demo)`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
