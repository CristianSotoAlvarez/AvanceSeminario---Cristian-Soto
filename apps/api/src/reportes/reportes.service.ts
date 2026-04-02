import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function iqr(valores: number[]): { q1: number; q3: number } {
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const bajos = sorted.slice(0, mid);
  const altos = sorted.length % 2 !== 0 ? sorted.slice(mid + 1) : sorted.slice(mid);
  return { q1: mediana(bajos) ?? 0, q3: mediana(altos) ?? 0 };
}

function filtrarOutliers(valores: number[]): number[] {
  if (valores.length < 4) return valores;
  const { q1, q3 } = iqr(valores);
  const rango = q3 - q1;
  const limite_inf = q1 - 1.5 * rango;
  const limite_sup = q3 + 1.5 * rango;
  return valores.filter(v => v >= limite_inf && v <= limite_sup);
}

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async resumen(query: { desde?: string; hasta?: string }) {
    const ahora = new Date();
    const hace30Dias = new Date(ahora);
    hace30Dias.setDate(ahora.getDate() - 30);

    const desde = query.desde ? new Date(query.desde) : hace30Dias;
    const hasta = query.hasta ? new Date(query.hasta) : ahora;

    const rango = { gte: desde, lte: hasta };

    const [
      totalCamiones,
      despachados,
      atrasados,
      rechazadosSAG,
      aprobadosSAG,
      tiempoCicloRaw,
      camionesTorta,
      despachadosPorDia,
      porEstado,
      tiempoPorEdificioRaw,
      atrasosPorEdificioRaw,
      atrasos30DiasRaw,
      justificadasCount,
      topCausasRaw,
    ] = await Promise.all([
      this.prisma.camion.count({ where: { horaLlegadaPlanificada: rango } }),

      this.prisma.camion.count({ where: { horaLlegadaPlanificada: rango, estado: 'DESPACHADO' } }),

      this.prisma.$queryRaw<[{ count: bigint }]>(
        Prisma.sql`SELECT COUNT(*) AS count FROM camiones
          WHERE "horaLlegadaPlanificada" >= ${desde} AND "horaLlegadaPlanificada" <= ${hasta}
          AND estado = 'DESPACHADO'
          AND "horaSalidaReal" IS NOT NULL AND "horaSalidaPlanificada" IS NOT NULL
          AND "horaSalidaReal" > "horaSalidaPlanificada"`,
      ).then(r => Number(r[0].count)),

      this.prisma.inspeccionSAG.count({
        where: { estado: 'RECHAZADO', timestampInicio: { gte: desde, lte: hasta } },
      }),

      this.prisma.inspeccionSAG.count({
        where: { estado: 'APROBADO', timestampInicio: { gte: desde, lte: hasta } },
      }),

      this.prisma.$queryRaw<Array<{ promedio_minutos: number | null }>>(
        Prisma.sql`
          SELECT AVG(
            EXTRACT(EPOCH FROM ("horaSalidaReal" - "horaLlegadaReal")) / 60
          ) AS promedio_minutos
          FROM camiones
          WHERE estado = 'DESPACHADO'
            AND "horaLlegadaReal" IS NOT NULL
            AND "horaSalidaReal" IS NOT NULL
            AND "horaLlegadaPlanificada" >= ${desde}
            AND "horaLlegadaPlanificada" <= ${hasta}
        `,
      ),

      this.prisma.camion.groupBy({
        by: ['tipo'],
        where: { horaLlegadaPlanificada: { gte: desde, lte: hasta } },
        _count: { id: true },
      }),

      this.prisma.$queryRaw<Array<{ dia: string; cantidad: number }>>(
        Prisma.sql`
          SELECT
            DATE("horaSalidaReal") AS dia,
            COUNT(*) AS cantidad
          FROM camiones
          WHERE estado = 'DESPACHADO'
            AND "horaSalidaReal" IS NOT NULL
            AND "horaSalidaReal" >= NOW() - INTERVAL '30 days'
          GROUP BY DATE("horaSalidaReal")
          ORDER BY dia ASC
        `,
      ),

      this.prisma.camion.groupBy({
        by: ['estado'],
        where: { horaLlegadaPlanificada: rango },
        _count: { id: true },
      }),

      // Tiempo por edificio — excluye paradas con justificación marcada como excluirDelCalculo
      this.prisma.$queryRaw<Array<{ edificio: string; promedio_minutos: number; cantidad: bigint }>>(
        Prisma.sql`
          SELECT
            p."edificioTipo" AS edificio,
            AVG(EXTRACT(EPOCH FROM (p."horaFin" - p."horaInicio")) / 60) AS promedio_minutos,
            COUNT(*) AS cantidad
          FROM paradas_expedicion p
          INNER JOIN camiones c ON c.id = p."camionId"
          LEFT JOIN justificaciones_atraso j ON j."paradaId" = p.id AND j."excluirDelCalculo" = true
          WHERE p.estado = 'COMPLETADO'
            AND p."horaInicio" IS NOT NULL
            AND p."horaFin" IS NOT NULL
            AND c."horaLlegadaPlanificada" >= ${desde}
            AND c."horaLlegadaPlanificada" <= ${hasta}
            AND j.id IS NULL
          GROUP BY p."edificioTipo"
          ORDER BY promedio_minutos DESC
        `,
      ),

      this.prisma.$queryRaw<Array<{ edificio: string; atraso_promedio: number; cantidad: bigint }>>(
        Prisma.sql`
          SELECT
            p."edificioTipo" AS edificio,
            AVG(EXTRACT(EPOCH FROM (c."horaSalidaReal" - c."horaSalidaPlanificada")) / 60) AS atraso_promedio,
            COUNT(DISTINCT c.id) AS cantidad
          FROM camiones c
          INNER JOIN paradas_expedicion p ON p."camionId" = c.id
          LEFT JOIN justificaciones_atraso j ON j."paradaId" = p.id AND j."excluirDelCalculo" = true
          WHERE c.estado = 'DESPACHADO'
            AND c."horaSalidaReal" > c."horaSalidaPlanificada"
            AND c."horaLlegadaPlanificada" >= ${desde}
            AND c."horaLlegadaPlanificada" <= ${hasta}
            AND p.estado = 'COMPLETADO'
            AND j.id IS NULL
            AND p.orden = (
              SELECT MAX(p2.orden) FROM paradas_expedicion p2
              WHERE p2."camionId" = c.id AND p2.estado = 'COMPLETADO'
            )
          GROUP BY p."edificioTipo"
          ORDER BY atraso_promedio DESC
        `,
      ),

      // Datos crudos de los últimos 30 días para motor de medianas por edificio (excluye justificados)
      this.prisma.$queryRaw<Array<{ edificio: string; minutos: number }>> (
        Prisma.sql`
          SELECT
            p."edificioTipo" AS edificio,
            EXTRACT(EPOCH FROM (p."horaFin" - p."horaInicio")) / 60 AS minutos
          FROM paradas_expedicion p
          INNER JOIN camiones c ON c.id = p."camionId"
          LEFT JOIN justificaciones_atraso j ON j."paradaId" = p.id AND j."excluirDelCalculo" = true
          WHERE p.estado = 'COMPLETADO'
            AND p."horaInicio" IS NOT NULL
            AND p."horaFin" IS NOT NULL
            AND c."horaLlegadaPlanificada" >= NOW() - INTERVAL '30 days'
            AND j.id IS NULL
        `,
      ),

      // Atrasos justificados en el rango (excluyendo del cálculo)
      this.prisma.justificacionAtraso.count({
        where: {
          excluirDelCalculo: true,
          parada: {
            camion: { horaLlegadaPlanificada: rango },
          },
        },
      }),

      // Top causas de justificación en el rango
      this.prisma.$queryRaw<Array<{ causa: string; cantidad: bigint }>>(
        Prisma.sql`
          SELECT j.causa, COUNT(*) AS cantidad
          FROM justificaciones_atraso j
          INNER JOIN paradas_expedicion p ON p.id = j."paradaId"
          INNER JOIN camiones c ON c.id = p."camionId"
          WHERE c."horaLlegadaPlanificada" >= ${desde}
            AND c."horaLlegadaPlanificada" <= ${hasta}
          GROUP BY j.causa
          ORDER BY cantidad DESC
        `,
      ),
    ]);

    const tiempoCicloPromedio =
      tiempoCicloRaw[0]?.promedio_minutos != null
        ? Math.round(Number(tiempoCicloRaw[0].promedio_minutos))
        : null;

    // Motor de medianas + IQR por edificio (últimos 30 días, sin justificados)
    const minutosPorEdificio: Record<string, number[]> = {};
    for (const row of atrasos30DiasRaw) {
      if (!minutosPorEdificio[row.edificio]) minutosPorEdificio[row.edificio] = [];
      minutosPorEdificio[row.edificio].push(Number(row.minutos));
    }

    const pesosMediana: Record<string, number> = {};
    for (const [edificio, valores] of Object.entries(minutosPorEdificio)) {
      const limpios = filtrarOutliers(valores);
      const med = mediana(limpios);
      if (med !== null) pesosMediana[edificio] = med;
    }

    // Distribución proporcional del presupuesto de tiempo
    const BUDGET_NACIONAL = 3 * 60;   // 180 min
    const BUDGET_EXPORTACION = 6 * 60; // 360 min

    const sumaTotal = Object.values(pesosMediana).reduce((s, v) => s + v, 0);
    const presupuestoPorEdificio: Record<string, { nacional: number; exportacion: number }> = {};
    for (const [edificio, med] of Object.entries(pesosMediana)) {
      const peso = sumaTotal > 0 ? med / sumaTotal : 1 / Object.keys(pesosMediana).length;
      presupuestoPorEdificio[edificio] = {
        nacional:    Math.round(peso * BUDGET_NACIONAL),
        exportacion: Math.round(peso * BUDGET_EXPORTACION),
      };
    }

    return {
      rango: { desde, hasta },
      totalCamiones,
      despachados,
      atrasados: Number(atrasados),
      atrasonesJustificados: justificadasCount,
      inspeccionesSAG: {
        aprobados: aprobadosSAG,
        rechazados: rechazadosSAG,
      },
      tiempoCicloPromedioMinutos: tiempoCicloPromedio,
      camionesTorta: camionesTorta.map((g) => ({
        tipo: g.tipo,
        cantidad: g._count.id,
      })),
      despachadosPorDia: despachadosPorDia.map((r) => ({
        dia: (r.dia as unknown) instanceof Date
          ? (r.dia as unknown as Date).toISOString().slice(0, 10)
          : String(r.dia).slice(0, 10),
        cantidad: Number(r.cantidad),
      })),
      porEstado: porEstado.map((g) => ({
        estado: g.estado,
        cantidad: g._count.id,
      })),
      tiempoPorEdificio: tiempoPorEdificioRaw.map((r) => ({
        edificio: r.edificio,
        promedioMinutos: Math.round(Number(r.promedio_minutos)),
        cantidad: Number(r.cantidad),
        presupuestoNacional:    presupuestoPorEdificio[r.edificio]?.nacional ?? null,
        presupuestoExportacion: presupuestoPorEdificio[r.edificio]?.exportacion ?? null,
        medianadMinutos:        pesosMediana[r.edificio] != null ? Math.round(pesosMediana[r.edificio]) : null,
      })),
      atrasosPorEdificio: atrasosPorEdificioRaw.map((r) => ({
        edificio: r.edificio,
        atrasoPromedioMinutos: Math.round(Number(r.atraso_promedio)),
        cantidad: Number(r.cantidad),
      })),
      topCausasJustificacion: topCausasRaw.map((r) => ({
        causa: r.causa,
        cantidad: Number(r.cantidad),
      })),
      pesosMediana: Object.entries(pesosMediana).map(([edificio, med]) => ({
        edificio,
        medianaMinutos: Math.round(med),
        presupuestoNacional:    presupuestoPorEdificio[edificio]?.nacional ?? null,
        presupuestoExportacion: presupuestoPorEdificio[edificio]?.exportacion ?? null,
      })),
    };
  }
}
