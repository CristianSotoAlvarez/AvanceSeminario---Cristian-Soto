"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Truck, CheckCircle2, Clock, TrendingUp,
  Calendar, BarChart3, AlertTriangle, MapPin, FileText, Scale,
} from "lucide-react";
import { obtenerResumenReportesApi, type ResumenReportes } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { BotonActualizar } from "@/components/boton-actualizar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function hace30Dias(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatFechaCorta(iso: string | Date): string {
  const d = typeof iso === "string"
    ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso)
    : new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay }}
      className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <p className="font-display text-[11px] uppercase text-text-muted tracking-widest">{label}</p>
      </div>
      <p className="font-data text-3xl font-bold text-text-primary">{value}</p>
      {sub && <p className="font-display text-xs text-text-muted mt-1">{sub}</p>}
    </motion.div>
  );
}

// ─── Barra horizontal simple ──────────────────────────────────────────────────

function BarraHorizontal({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xs text-text-muted w-28 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="font-data text-xs text-text-primary w-8 text-right">{valor}</span>
      <span className="font-display text-[10px] text-text-muted w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Gráfico de barras verticales ────────────────────────────────────────────

function GraficoBarras({ datos }: { datos: { dia: string | Date; cantidad: number }[] }) {
  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted font-display text-sm">
        Sin datos de despachos en el período
      </div>
    );
  }

  const max = Math.max(...datos.map(d => d.cantidad), 1);
  const ALTURA = 80;

  return (
    <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
      {datos.map((d, i) => {
        const h = Math.round((d.cantidad / max) * ALTURA);
        const paso = datos.length <= 7 ? 1 : datos.length <= 14 ? 2 : Math.ceil(datos.length / 7);
        return (
          <div key={String(d.dia)} className="flex flex-col items-center gap-1 flex-1 min-w-[24px] group">
            <span className="font-data text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              {d.cantidad}
            </span>
            <motion.div
              className="w-full rounded-t-sm bg-accent/70 group-hover:bg-accent transition-colors"
              style={{ height: `${h}px` }}
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.4, delay: i * 0.02, ease: "easeOut" }}
              title={`${formatFechaCorta(d.dia)}: ${d.cantidad}`}
            />
            {(i % paso === 0 || i === datos.length - 1) ? (
              <span className="font-display text-[8px] text-text-muted whitespace-nowrap">
                {formatFechaCorta(d.dia)}
              </span>
            ) : <span className="h-3" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Colores ──────────────────────────────────────────────────────────────────

const COLOR_ESTADO: Record<string, string> = {
  ESPERADO:      "#94A3B8",
  EN_PORTERIA:   "#D97706",
  ASIGNADO:      "#3B82F6",
  EN_CARGA:      "#8B5CF6",
  EN_TUNEL_FRIO: "#0E7490",
  ESPERANDO_SAG: "#F59E0B",
  APROBADO_SAG:  "#16A34A",
  RECHAZADO_SAG: "#DC2626",
  LISTO:         "#059669",
  DESPACHADO:    "#1E3A8A",
};

const COLOR_TIPO: Record<string, string> = {
  NACIONAL:     "#3B82F6",
  EXPORTACION:  "#8B5CF6",
  INTERPLANTA:  "#F59E0B",
};

const CONFIG_EDIFICIO: Record<string, { color: string; label: string }> = {
  AVES:        { color: "#B45309", label: "Aves" },
  CERDO:       { color: "#BE185D", label: "Cerdo" },
  FRIGORIFICO: { color: "#0E7490", label: "Frigorífico" },
};

const ETIQUETA_CAUSA: Record<string, string> = {
  FALLA_ANDEN:      "Falla de andén",
  FALLA_MECANICA:   "Falla mecánica",
  FALTA_PERSONAL:   "Falta de personal",
  FALTA_PRODUCTO:   "Falta de producto",
  VOLUMEN_EXCESIVO: "Volumen excesivo",
  PROBLEMA_CALIDAD: "Problema de calidad",
  OTRO:             "Otro",
};

// ─── Tabla presupuesto por edificio (motor medianas) ─────────────────────────

function TablaPesosMediana({ datos }: { datos: ResumenReportes["pesosMediana"] }) {
  if (!datos.length) {
    return <p className="font-display text-sm text-text-muted text-center py-4">Sin datos históricos (30 días)</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-elevated">
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-left py-2 pr-4">Punto</th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Mediana</th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">
              Presup. Nacional <span className="normal-case">(3h)</span>
            </th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2">
              Presup. Export. <span className="normal-case">(6h)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {datos.map((row) => {
            const cfg = CONFIG_EDIFICIO[row.edificio] ?? { color: "#94A3B8", label: row.edificio };
            return (
              <tr key={row.edificio} className="border-b border-bg-elevated/50 last:border-0">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    <span className="font-display text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                </td>
                <td className="font-data text-xs text-text-primary text-right pr-4 py-2.5">
                  {formatMinutos(row.medianaMinutos)}
                </td>
                <td className="font-data text-xs text-right pr-4 py-2.5" style={{ color: "#3B82F6" }}>
                  {row.presupuestoNacional ? formatMinutos(row.presupuestoNacional) : "—"}
                </td>
                <td className="font-data text-xs text-right py-2.5" style={{ color: "#8B5CF6" }}>
                  {row.presupuestoExportacion ? formatMinutos(row.presupuestoExportacion) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="font-display text-[10px] text-text-muted mt-3 italic">
        Calculado con mediana + filtro IQR sobre los últimos 30 días, excluyendo paradas con justificación marcada.
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [desde, setDesde] = useState(hace30Dias());
  const [hasta, setHasta] = useState(hoy());
  const [datos, setDatos] = useState<ResumenReportes | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await obtenerResumenReportesApi({ desde, hasta });
      setDatos(res);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const tasaDespacho = datos && datos.totalCamiones > 0
    ? Math.round((datos.despachados / datos.totalCamiones) * 100)
    : 0;

  const totalSAG = datos ? datos.inspeccionesSAG.aprobados + datos.inspeccionesSAG.rechazados : 0;
  const tasaAprobSAG = totalSAG > 0
    ? Math.round((datos!.inspeccionesSAG.aprobados / totalSAG) * 100)
    : null;

  const totalPorEstado = datos?.porEstado.reduce((s, e) => s + e.cantidad, 0) ?? 0;
  const totalPorTipo   = datos?.camionesTorta.reduce((s, e) => s + e.cantidad, 0) ?? 0;
  const totalCausas    = datos?.topCausasJustificacion.reduce((s, c) => s + c.cantidad, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Selector de rango */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 bg-bg-surface border border-bg-elevated rounded-lg px-4 py-2">
          <Calendar size={14} className="text-text-muted" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desde}
              max={hasta}
              onChange={e => setDesde(e.target.value)}
              className="font-data text-sm text-text-primary bg-transparent border-none outline-none cursor-pointer"
            />
            <span className="text-text-muted font-display text-xs">→</span>
            <input
              type="date"
              value={hasta}
              min={desde}
              max={hoy()}
              onChange={e => setHasta(e.target.value)}
              className="font-data text-sm text-text-primary bg-transparent border-none outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { label: "7 días",  dias: 7 },
            { label: "30 días", dias: 30 },
            { label: "90 días", dias: 90 },
          ].map(({ label, dias }) => {
            const d = new Date(); d.setDate(d.getDate() - dias);
            const iso = d.toISOString().slice(0, 10);
            const activo = desde === iso && hasta === hoy();
            return (
              <button
                key={dias}
                onClick={() => { setDesde(iso); setHasta(hoy()); }}
                className={`px-3 py-1.5 rounded-lg font-display text-xs transition-all cursor-pointer border ${
                  activo ? "bg-accent text-white border-accent" : "bg-bg-surface border-bg-elevated text-text-muted hover:border-accent/30"
                }`}
              >
                {label}
              </button>
            );
          })}
          <BotonActualizar onClick={cargar} disabled={cargando} />
        </div>
      </div>

      {cargando ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      ) : datos ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Truck}         label="Total camiones"  value={datos.totalCamiones}   color="#3B82F6" delay={0} />
            <KpiCard icon={CheckCircle2}  label="Despachados"     value={datos.despachados}      color="#16A34A" delay={0.05}
              sub={`${tasaDespacho}% del total`} />
            <KpiCard icon={AlertTriangle} label="Con atraso"      value={datos.atrasados}        color="#DC2626" delay={0.1}
              sub={datos.despachados > 0 ? `${Math.round((datos.atrasados / datos.despachados) * 100)}% de los despachados` : undefined} />
            <KpiCard icon={Clock}         label="Tiempo de ciclo" color="#8B5CF6" delay={0.15}
              value={datos.tiempoCicloPromedioMinutos ? formatMinutos(datos.tiempoCicloPromedioMinutos) : "—"}
              sub="promedio en planta" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Despachados por día */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.2 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Despachos por día</h3>
              </div>
              <GraficoBarras datos={datos.despachadosPorDia} />
            </motion.div>

            {/* Por estado */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.25 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Distribución por estado</h3>
              </div>
              <div className="space-y-2.5">
                {datos.porEstado
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .map(e => (
                    <BarraHorizontal
                      key={e.estado}
                      label={etiquetasEstado[e.estado] ?? e.estado}
                      valor={e.cantidad}
                      total={totalPorEstado}
                      color={COLOR_ESTADO[e.estado] ?? "#94A3B8"}
                    />
                  ))}
              </div>
            </motion.div>

            {/* Por tipo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.3 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Truck size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Distribución por tipo</h3>
              </div>
              <div className="space-y-2.5">
                {datos.camionesTorta
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .map(e => (
                    <BarraHorizontal
                      key={e.tipo}
                      label={etiquetasTipo[e.tipo] ?? e.tipo}
                      valor={e.cantidad}
                      total={totalPorTipo}
                      color={COLOR_TIPO[e.tipo] ?? "#94A3B8"}
                    />
                  ))}
              </div>
            </motion.div>

            {/* SAG */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.35 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Inspecciones SAG</h3>
              </div>
              {totalSAG === 0 ? (
                <p className="font-display text-sm text-text-muted text-center py-6">Sin inspecciones en el período</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs text-text-muted">Total inspecciones</span>
                    <span className="font-data text-lg font-bold text-text-primary">{totalSAG}</span>
                  </div>
                  <div className="space-y-2.5">
                    <BarraHorizontal label="Aprobados"  valor={datos.inspeccionesSAG.aprobados}  total={totalSAG} color="#16A34A" />
                    <BarraHorizontal label="Rechazados" valor={datos.inspeccionesSAG.rechazados} total={totalSAG} color="#DC2626" />
                  </div>
                  {tasaAprobSAG !== null && (
                    <div className="pt-2 border-t border-bg-elevated">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs text-text-muted">Tasa de aprobación</span>
                        <span className="font-data text-xl font-bold" style={{ color: tasaAprobSAG >= 80 ? "#16A34A" : "#DC2626" }}>
                          {tasaAprobSAG}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Tiempo y atrasos por punto de expedición */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.3 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4 md:col-span-2"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Tiempo por punto de expedición</h3>
                {datos.atrasonesJustificados > 0 && (
                  <span className="ml-auto font-display text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }}>
                    <FileText size={9} /> {datos.atrasonesJustificados} justificado{datos.atrasonesJustificados !== 1 ? "s" : ""} excluido{datos.atrasonesJustificados !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {datos.tiempoPorEdificio.length === 0 ? (
                <p className="font-display text-sm text-text-muted text-center py-4">Sin datos de paradas completadas</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const maxMin = Math.max(...datos.tiempoPorEdificio.map(e => e.promedioMinutos), 1);
                    return datos.tiempoPorEdificio.map((e, i) => {
                      const cfg = CONFIG_EDIFICIO[e.edificio] ?? { color: "#94A3B8", label: e.edificio };
                      const atraso = datos.atrasosPorEdificio.find(a => a.edificio === e.edificio);
                      const pct = (e.promedioMinutos / maxMin) * 100;
                      const presupuesto = e.presupuestoNacional;
                      const sobrePresupuesto = presupuesto && e.promedioMinutos > presupuesto;

                      return (
                        <div key={e.edificio} className="space-y-1.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                              <span className="font-display text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                              <span className="font-display text-[10px] text-text-muted">({e.cantidad} paradas)</span>
                              {sobrePresupuesto && (
                                <span className="font-display text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: "#FFF1F2", color: "#DC2626", border: "1px solid #FECDD3" }}>
                                  sobre presupuesto
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {presupuesto && (
                                <span className="font-display text-[10px] text-text-muted">
                                  Presup. <span style={{ color: "#3B82F6" }} className="font-data">{formatMinutos(presupuesto)}</span>
                                </span>
                              )}
                              <span className="font-data text-sm font-bold text-text-primary">{formatMinutos(e.promedioMinutos)}</span>
                              {atraso && (
                                <span className="font-display text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                  style={{ background: "#FFF1F2", color: "#DC2626" }}>
                                  <AlertTriangle size={9} />
                                  +{formatMinutos(atraso.atrasoPromedioMinutos)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Barra con presupuesto marcado */}
                          <div className="relative h-2 bg-bg-elevated rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: sobrePresupuesto ? "#DC2626" : cfg.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                            />
                            {/* Marca del presupuesto */}
                            {presupuesto && (
                              <div
                                className="absolute top-0 bottom-0 w-px bg-white/70"
                                style={{ left: `${Math.min((presupuesto / (e.promedioMinutos || 1)) * pct, 98)}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {datos.atrasosPorEdificio.length > 0 && (
                    <div className="pt-3 border-t border-bg-elevated">
                      <p className="font-display text-[10px] uppercase text-text-muted tracking-widest mb-1">Atribución de atrasos</p>
                      <p className="font-display text-xs text-text-muted">
                        El punto con mayor atraso promedio es{" "}
                        <span className="font-semibold text-semantic-error">
                          {(() => {
                            const peor = datos.atrasosPorEdificio[0];
                            const cfg = CONFIG_EDIFICIO[peor.edificio];
                            return `${cfg?.label ?? peor.edificio} (+${formatMinutos(peor.atrasoPromedioMinutos)} promedio)`;
                          })()}
                        </span>
                        {" "}— identificado como el último punto completado antes de la salida tardía.
                        {datos.atrasonesJustificados > 0 && (
                          <span className="ml-1" style={{ color: "#B45309" }}>
                            {datos.atrasonesJustificados} incidente{datos.atrasonesJustificados !== 1 ? "s" : ""} justificado{datos.atrasonesJustificados !== 1 ? "s" : ""} excluido{datos.atrasonesJustificados !== 1 ? "s" : ""} del cálculo.
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Motor de presupuesto por mediana + IQR */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.4 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4 md:col-span-2"
            >
              <div className="flex items-center gap-2 mb-4">
                <Scale size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">
                  Presupuesto de tiempo por punto (últimos 30 días)
                </h3>
              </div>
              <TablaPesosMediana datos={datos.pesosMediana} />
            </motion.div>

            {/* Top causas de justificación */}
            {datos.topCausasJustificacion.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.45 }}
                className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={14} className="text-accent" />
                  <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Causas de justificación</h3>
                </div>
                <div className="space-y-2.5">
                  {datos.topCausasJustificacion.map(c => (
                    <BarraHorizontal
                      key={c.causa}
                      label={ETIQUETA_CAUSA[c.causa] ?? c.causa}
                      valor={c.cantidad}
                      total={totalCausas}
                      color="#B45309"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
