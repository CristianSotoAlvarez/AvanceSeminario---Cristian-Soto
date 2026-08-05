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

    // Período anterior del mismo largo (para deltas)
    const largoMs = hasta.getTime() - desde.getTime();
    const desdePrev = new Date(desde.getTime() - largoMs);
    const hastaPrev = new Date(desde.getTime());

    const rango = { gte: desde, lte: hasta };

    // Filtro común para excluir camiones averiados de cuentas operativas
    const excluirAveriado = { estado: { not: 'AVERIADO' as const } };

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
      this.prisma.camion.count({ where: { horaLlegadaPlanificada: rango, ...excluirAveriado } }),

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
        where: { horaLlegadaPlanificada: { gte: desde, lte: hasta }, ...excluirAveriado },
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
        where: { horaLlegadaPlanificada: rango, ...excluirAveriado },
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

    // Métricas nuevas (rediseño 2026-05-06) — se ejecutan en paralelo
    const [cumplimientoYOtif, productividad, tiempoTunel, comparativo, incidentesOperativos, fallasAnden] = await Promise.all([
      this.calcularCumplimientoYOtif(desde, hasta),
      this.calcularProductividadOperadores(desde, hasta),
      this.calcularTiempoTunel(desde, hasta),
      this.calcularComparativoPeriodoAnterior(desdePrev, hastaPrev),
      this.calcularIncidentesOperativos(desde, hasta),
      this.calcularFallasAnden(desde, hasta),
    ]);

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
      // ─── Métricas nuevas (rediseño 2026-05-06) ──────────────────────────────
      cumplimientoServicio: cumplimientoYOtif.cumplimientoServicio,
      otif: cumplimientoYOtif.otif,
      cumplimientoPorTipo: cumplimientoYOtif.cumplimientoPorTipo,
      productividadOperadores: productividad,
      tiempoPromedioTunelMinutos: tiempoTunel,
      comparativoPeriodoAnterior: comparativo,
      incidentesOperativos,
      fallasAnden,
    };
  }

  /**
   * Historial de fallas de andén dentro del rango: frecuencia por andén y
   * tiempo promedio de resolución (desde que se marca fuera de servicio
   * hasta que se reactiva). Se apoya en HistorialAndenFueraServicio, que
   * a diferencia de los campos de Anden persiste incluso tras reactivar.
   */
  private async calcularFallasAnden(desde: Date, hasta: Date) {
    const filas = await this.prisma.$queryRaw<Array<{
      codigo: string;
      cantidad: bigint;
      minutos_promedio: number | null;
      abiertas: bigint;
    }>>(Prisma.sql`
      SELECT
        a.codigo AS codigo,
        COUNT(h.id) AS cantidad,
        AVG(EXTRACT(EPOCH FROM (h.hasta - h.desde)) / 60) FILTER (WHERE h.hasta IS NOT NULL) AS minutos_promedio,
        COUNT(*) FILTER (WHERE h.hasta IS NULL) AS abiertas
      FROM historial_anden_fuera_servicio h
      INNER JOIN andenes a ON a.id = h."andenId"
      WHERE h.desde >= ${desde} AND h.desde <= ${hasta}
      GROUP BY a.codigo
      ORDER BY cantidad DESC
    `);

    const total = filas.reduce((s, f) => s + Number(f.cantidad), 0);

    return {
      total,
      porAnden: filas.map(f => ({
        andenCodigo: f.codigo,
        cantidad: Number(f.cantidad),
        tiempoPromedioResolucionMinutos: f.minutos_promedio != null ? Math.round(Number(f.minutos_promedio)) : null,
        actualmenteFueraDeServicio: Number(f.abiertas) > 0,
      })),
    };
  }

  /**
   * Cuenta los incidentes operativos del rango por (tipo, accion).
   * En esta versión solo aparece AVERIA con sus dos acciones.
   */
  private async calcularIncidentesOperativos(desde: Date, hasta: Date) {
    const filas = await this.prisma.incidenteCamion.groupBy({
      by: ['tipo', 'accion'],
      where: { timestamp: { gte: desde, lte: hasta } },
      _count: { id: true },
    });
    const total = filas.reduce((s, f) => s + f._count.id, 0);
    return {
      total,
      desglose: filas.map(f => ({
        tipo: f.tipo,
        accion: f.accion,
        cantidad: f._count.id,
        porcentaje: total > 0 ? Math.round((f._count.id / total) * 1000) / 10 : 0,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers métricas nuevas (rediseño 2026-05-06)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Calcula cumplimiento de servicio, OTIF y desglose por tipo de cliente.
   *
   * - cumplimientoServicio = Σ min(cargada, solicitada) / Σ solicitada (a nivel línea)
   * - OTIF = camiones con (onTime AND inFull) / camiones con al menos una entrega
   * - cumplimientoPorTipo = mismo cálculo agrupado por TipoCamion
   *
   * Universo OTIF: camiones con horaLlegadaPlanificada en [desde, hasta] que tienen
   * al menos una Entrega registrada (sin entregas no podemos evaluar In-Full).
   */
  private async calcularCumplimientoYOtif(desde: Date, hasta: Date) {
    const filas = await this.prisma.$queryRaw<Array<{
      camionId: string;
      tipo: string;
      onTime: boolean | null;
      itemId: string | null;
      cantidadSolicitada: number | null;
      cantidadCargada: number | null;
    }>>(Prisma.sql`
      SELECT
        c.id AS "camionId",
        c.tipo AS tipo,
        CASE
          WHEN c."horaSalidaReal" IS NOT NULL AND c."horaSalidaPlanificada" IS NOT NULL
          THEN c."horaSalidaReal" <= c."horaSalidaPlanificada"
          ELSE NULL
        END AS "onTime",
        ei.id AS "itemId",
        ei."cantidadSolicitada" AS "cantidadSolicitada",
        COALESCE((
          SELECT SUM(pp.cantidad)
          FROM pallets p
          INNER JOIN productos_pallet pp ON pp."palletId" = p.id
          WHERE p."entregaId" = e.id
            AND pp."productoId" = ei."productoId"
        ), 0) AS "cantidadCargada"
      FROM camiones c
      LEFT JOIN entregas e ON e."camionId" = c.id
      LEFT JOIN entrega_items ei ON ei."entregaId" = e.id
      WHERE c."horaLlegadaPlanificada" >= ${desde} AND c."horaLlegadaPlanificada" <= ${hasta}
        AND c.estado != 'AVERIADO'
    `);

    type EstadoCamion = { tipo: string; onTime: boolean | null; solicitado: number; cargado: number; tieneEntregas: boolean };
    const porCamion = new Map<string, EstadoCamion>();

    for (const f of filas) {
      let est = porCamion.get(f.camionId);
      if (!est) {
        est = { tipo: f.tipo, onTime: f.onTime, solicitado: 0, cargado: 0, tieneEntregas: false };
        porCamion.set(f.camionId, est);
      }
      if (f.itemId && f.cantidadSolicitada != null) {
        est.tieneEntregas = true;
        est.solicitado += Number(f.cantidadSolicitada);
        est.cargado += Math.min(Number(f.cantidadCargada ?? 0), Number(f.cantidadSolicitada));
      }
    }

    let solicitadoTotal = 0;
    let cargadoTotal = 0;
    let camionesConEntregas = 0;
    let camionesOtif = 0;

    const porTipo: Record<string, { camiones: number; conEntregas: number; onTime: number; solicitado: number; cargado: number; otif: number }> = {};

    for (const est of porCamion.values()) {
      const t = porTipo[est.tipo] ??= { camiones: 0, conEntregas: 0, onTime: 0, solicitado: 0, cargado: 0, otif: 0 };
      t.camiones += 1;

      if (!est.tieneEntregas) continue;

      camionesConEntregas += 1;
      t.conEntregas += 1;
      solicitadoTotal += est.solicitado;
      cargadoTotal += est.cargado;
      t.solicitado += est.solicitado;
      t.cargado += est.cargado;

      const inFull = est.solicitado > 0 && est.cargado >= est.solicitado;
      const onTime = est.onTime === true;
      if (onTime) t.onTime += 1;
      if (onTime && inFull) {
        camionesOtif += 1;
        t.otif += 1;
      }
    }

    const cumplimientoServicio = solicitadoTotal > 0
      ? Math.round((cargadoTotal / solicitadoTotal) * 1000) / 10
      : null;
    const otif = camionesConEntregas > 0
      ? Math.round((camionesOtif / camionesConEntregas) * 1000) / 10
      : null;

    const cumplimientoPorTipo = Object.entries(porTipo).map(([tipo, t]) => ({
      tipo,
      camiones: t.camiones,
      onTime: t.conEntregas > 0 ? Math.round((t.onTime / t.conEntregas) * 1000) / 10 : null,
      cumplimientoServicio: t.solicitado > 0 ? Math.round((t.cargado / t.solicitado) * 1000) / 10 : null,
      otif: t.conEntregas > 0 ? Math.round((t.otif / t.conEntregas) * 1000) / 10 : null,
    }));

    return { cumplimientoServicio, otif, cumplimientoPorTipo, camionesConEntregas };
  }

  /**
   * Productividad de operadores (pickineros y cargadores) en el rango.
   *
   * Pickinero: pallets que armó, tiempo promedio de armado (filtrado IQR), días activos.
   * Cargador: pallets que cargó, camiones distintos atendidos, días activos.
   * palletsPorTurno = palletsArmados/Cargados / diasActivos.
   */
  private async calcularProductividadOperadores(desde: Date, hasta: Date) {
    const pickineros = await this.prisma.$queryRaw<Array<{
      usuarioId: string;
      nombre: string;
      palletsArmados: bigint;
      diasActivos: bigint;
      tiempos: number[];
    }>>(Prisma.sql`
      SELECT
        u.id AS "usuarioId",
        u.nombre AS nombre,
        COUNT(p.id) AS "palletsArmados",
        COUNT(DISTINCT DATE(COALESCE(p."timestampFin", p."timestampInicio"))) AS "diasActivos",
        ARRAY_AGG(p."tiempoArmadoSegundos") FILTER (WHERE p."tiempoArmadoSegundos" IS NOT NULL) AS tiempos
      FROM usuarios u
      INNER JOIN pallets p ON p."pickineroId" = u.id
      WHERE p."timestampInicio" >= ${desde} AND p."timestampInicio" <= ${hasta}
      GROUP BY u.id, u.nombre
      ORDER BY "palletsArmados" DESC
    `);

    const cargadores = await this.prisma.$queryRaw<Array<{
      usuarioId: string;
      nombre: string;
      palletsCargados: bigint;
      camionesAtendidos: bigint;
      diasActivos: bigint;
    }>>(Prisma.sql`
      SELECT
        u.id AS "usuarioId",
        u.nombre AS nombre,
        COUNT(p.id) AS "palletsCargados",
        COUNT(DISTINCT e."camionId") AS "camionesAtendidos",
        COUNT(DISTINCT DATE(p."timestampFin")) AS "diasActivos"
      FROM usuarios u
      INNER JOIN pallets p ON p."cargadorId" = u.id
      LEFT JOIN entregas e ON e.id = p."entregaId"
      WHERE p."timestampFin" IS NOT NULL
        AND p."timestampFin" >= ${desde} AND p."timestampFin" <= ${hasta}
      GROUP BY u.id, u.nombre
      ORDER BY "palletsCargados" DESC
    `);

    return {
      pickineros: pickineros.map(p => {
        const tiempos = (p.tiempos ?? []).map(Number).filter(n => Number.isFinite(n));
        const limpios = filtrarOutliers(tiempos);
        const promedio = limpios.length > 0
          ? Math.round(limpios.reduce((s, v) => s + v, 0) / limpios.length)
          : null;
        const palletsArmados = Number(p.palletsArmados);
        const diasActivos = Number(p.diasActivos);
        return {
          usuarioId: p.usuarioId,
          nombre: p.nombre,
          palletsArmados,
          tiempoPromedioSegundos: promedio,
          diasActivos,
          palletsPorTurno: diasActivos > 0 ? Math.round((palletsArmados / diasActivos) * 10) / 10 : 0,
        };
      }),
      cargadores: cargadores.map(c => {
        const palletsCargados = Number(c.palletsCargados);
        const diasActivos = Number(c.diasActivos);
        return {
          usuarioId: c.usuarioId,
          nombre: c.nombre,
          palletsCargados,
          camionesAtendidos: Number(c.camionesAtendidos),
          diasActivos,
          palletsPorTurno: diasActivos > 0 ? Math.round((palletsCargados / diasActivos) * 10) / 10 : 0,
        };
      }),
    };
  }

  /**
   * Tiempo promedio que los camiones de exportación pasan en el túnel de frío.
   * Se deriva de EventoCamion: diferencia entre el primer evento EN_TUNEL_FRIO
   * y el siguiente cambio de estado, por camión.
   */
  private async calcularTiempoTunel(desde: Date, hasta: Date): Promise<number | null> {
    const filas = await this.prisma.$queryRaw<Array<{ promedio_minutos: number | null }>>(Prisma.sql`
      WITH eventos_ordenados AS (
        SELECT
          ec."camionId",
          ec.estado,
          ec.timestamp,
          LEAD(ec.timestamp) OVER (PARTITION BY ec."camionId" ORDER BY ec.timestamp) AS proximo_timestamp,
          LEAD(ec.estado)    OVER (PARTITION BY ec."camionId" ORDER BY ec.timestamp) AS proximo_estado
        FROM eventos_camion ec
        INNER JOIN camiones c ON c.id = ec."camionId"
        WHERE c."horaLlegadaPlanificada" >= ${desde}
          AND c."horaLlegadaPlanificada" <= ${hasta}
      )
      SELECT AVG(EXTRACT(EPOCH FROM (proximo_timestamp - timestamp)) / 60) AS promedio_minutos
      FROM eventos_ordenados
      WHERE estado = 'EN_TUNEL_FRIO'
        AND proximo_timestamp IS NOT NULL
        AND proximo_estado != 'AVERIADO'
    `);
    const v = filas[0]?.promedio_minutos;
    return v != null ? Math.round(Number(v)) : null;
  }

  /**
   * Calcula los KPIs principales para el período inmediatamente anterior del
   * mismo largo, para alimentar deltas en las cards.
   */
  private async calcularComparativoPeriodoAnterior(desde: Date, hasta: Date) {
    const rango = { gte: desde, lte: hasta };
    const excluirAveriado = { estado: { not: 'AVERIADO' as const } };

    const [totalCamiones, despachados, atrasadosRaw, tiempoCicloRaw, cumpl] = await Promise.all([
      this.prisma.camion.count({ where: { horaLlegadaPlanificada: rango, ...excluirAveriado } }),

      this.prisma.camion.count({ where: { horaLlegadaPlanificada: rango, estado: 'DESPACHADO' } }),

      this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*) AS count FROM camiones
        WHERE "horaLlegadaPlanificada" >= ${desde} AND "horaLlegadaPlanificada" <= ${hasta}
        AND estado = 'DESPACHADO'
        AND "horaSalidaReal" IS NOT NULL AND "horaSalidaPlanificada" IS NOT NULL
        AND "horaSalidaReal" > "horaSalidaPlanificada"
      `).then(r => Number(r[0].count)),

      this.prisma.$queryRaw<Array<{ promedio_minutos: number | null }>>(Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM ("horaSalidaReal" - "horaLlegadaReal")) / 60) AS promedio_minutos
        FROM camiones
        WHERE estado = 'DESPACHADO'
          AND "horaLlegadaReal" IS NOT NULL AND "horaSalidaReal" IS NOT NULL
          AND "horaLlegadaPlanificada" >= ${desde} AND "horaLlegadaPlanificada" <= ${hasta}
      `),

      this.calcularCumplimientoYOtif(desde, hasta),
    ]);

    const tiempoCiclo = tiempoCicloRaw[0]?.promedio_minutos != null
      ? Math.round(Number(tiempoCicloRaw[0].promedio_minutos))
      : null;

    return {
      totalCamiones,
      despachados,
      atrasados: atrasadosRaw,
      tiempoCicloPromedioMinutos: tiempoCiclo,
      cumplimientoServicio: cumpl.cumplimientoServicio,
      otif: cumpl.otif,
      camionesConEntregas: cumpl.camionesConEntregas,
    };
  }
}
