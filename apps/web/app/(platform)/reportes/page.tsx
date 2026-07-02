"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Truck, CheckCircle2, Clock, TrendingUp,
  Calendar, BarChart3, AlertTriangle, MapPin, FileText, Scale,
  Download, Printer,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { obtenerResumenReportesApi, type ResumenReportes } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { BotonActualizar } from "@/components/boton-actualizar";

const MUESTRA_MIN_DELTA = 5;
const DIAS_MIN_DELTA = 3;

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
  icon: Icon, label, value, sub, color, delay = 0, delta, glosario,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; delay?: number;
  delta?: { texto: string; positivo: boolean | null } | null;
  glosario?: string;
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
        <p className="font-display text-[11px] uppercase text-text-muted tracking-widest flex items-center gap-1">
          {label}
          {glosario && (
            <span
              title={glosario}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-bg-elevated text-text-muted text-[9px] cursor-help"
            >
              ?
            </span>
          )}
        </p>
      </div>
      <p className="font-data text-3xl font-bold text-text-primary">{value}</p>
      {sub && <p className="font-display text-xs text-text-muted mt-1">{sub}</p>}
      {delta && (
        <p
          className="font-display text-[10px] mt-1"
          style={{ color: delta.positivo === null ? "#94A3B8" : delta.positivo ? "#16A34A" : "#DC2626" }}
        >
          {delta.texto}
        </p>
      )}
    </motion.div>
  );
}

// Calcula delta entre actual y anterior; null si la muestra es insuficiente.
function calcularDelta(
  actual: number | null,
  anterior: number | null,
  unidad: "%" | "min",
  muestraSuficiente: boolean,
): { texto: string; positivo: boolean | null } | null {
  if (!muestraSuficiente) {
    return { texto: "Muestra insuficiente para tendencia", positivo: null };
  }
  if (actual == null || anterior == null) return null;
  const diff = actual - anterior;
  if (Math.abs(diff) < 0.1) return { texto: "vs período anterior: =", positivo: null };
  const signo = diff > 0 ? "+" : "";
  const texto = `vs período anterior: ${signo}${unidad === "%" ? `${diff.toFixed(1)}pp` : `${Math.round(diff)}m`}`;
  return { texto, positivo: diff > 0 };
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

// ─── Gráfico de barras — despachos por día (Recharts) ────────────────────────

const TOOLTIP_STYLE = {
  fontFamily: "var(--font-display, sans-serif)",
  fontSize: "11px",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
};

function GraficoBarras({ datos }: { datos: { dia: string | Date; cantidad: number }[] }) {
  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted font-display text-sm">
        Sin datos de despachos en el período
      </div>
    );
  }

  const paso = datos.length <= 7 ? 0 : datos.length <= 14 ? 1 : Math.ceil(datos.length / 7) - 1;
  const datosFormateados = datos.map(d => ({ dia: formatFechaCorta(d.dia), cantidad: d.cantidad }));

  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={datosFormateados} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-display, sans-serif)" }}
          tickLine={false}
          axisLine={false}
          interval={paso}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-data, monospace)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "#F8FAFC", radius: 4 }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [v ?? 0, "Despachos"]}
        />
        <Bar dataKey="cantidad" fill="#EA580C" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}


// ─── Barras horizontales — causas justificación (Recharts) ────────────────────

function GraficoCausas({ datos }: { datos: { causa: string; cantidad: number }[] }) {
  const items = datos.map(d => ({ name: ETIQUETA_CAUSA[d.causa] ?? d.causa, cantidad: d.cantidad }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(items.length * 38, 80)}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-data, monospace)" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: "#64748B", fontFamily: "var(--font-display, sans-serif)" }}
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "#F8FAFC", radius: 4 }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [v ?? 0, "Casos"]}
        />
        <Bar dataKey="cantidad" fill="#B45309" radius={[0, 3, 3, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Barras agrupadas — tiempo por edificio vs presupuesto (Recharts) ─────────

function GraficoTiempoEdificio({ datos }: { datos: ResumenReportes["tiempoPorEdificio"] }) {
  if (datos.length === 0) {
    return <p className="font-display text-sm text-text-muted text-center py-4">Sin datos de paradas completadas</p>;
  }

  const items = datos.map(e => {
    const cfg = CONFIG_EDIFICIO[e.edificio] ?? { color: "#94A3B8", label: e.edificio };
    return {
      name: cfg.label,
      promedio: e.promedioMinutos,
      presupuesto: e.presupuestoNacional ?? undefined,
      color: cfg.color,
      sobrePresupuesto: e.presupuestoNacional ? e.promedioMinutos > e.presupuestoNacional : false,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={items} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "#64748B", fontFamily: "var(--font-display, sans-serif)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 9, fill: "#94A3B8", fontFamily: "var(--font-data, monospace)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}m`}
        />
        <Tooltip
          cursor={{ fill: "#F8FAFC", radius: 4 }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [
            formatMinutos(Number(v ?? 0)),
            name === "promedio" ? "Promedio real" : "Presupuesto",
          ]}
        />
        <Bar dataKey="presupuesto" fill="#0EA5E9" radius={[3, 3, 0, 0]} maxBarSize={32} opacity={0.35} name="presupuesto" />
        <Bar dataKey="promedio" radius={[3, 3, 0, 0]} maxBarSize={32} name="promedio">
          {items.map((entry, i) => (
            <Cell key={i} fill={entry.sobrePresupuesto ? "#DC2626" : entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
  NACIONAL:     "#1E3A5F",
  EXPORTACION:  "#8B5CF6",
  INTERPLANTA:  "#EA580C",
};

const CONFIG_EDIFICIO: Record<string, { color: string; label: string }> = {
  AVES:        { color: "#B45309", label: "Aves" },
  CERDO:       { color: "#BE185D", label: "Cerdo" },
  FRIGORIFICO: { color: "#0E7490", label: "Frigorífico" },
};

const ETIQUETA_INCIDENTE: Record<string, string> = {
  AVERIA_ESPERAR_REPARACION: "Avería · reparación in situ",
  AVERIA_SUSTITUIR:          "Avería · sustitución de camión",
  FALTA_PRODUCTO_REGISTRAR_FALTANTE: "Falta de producto · entrega parcial",
  CAMBIO_ANDEN_REASIGNAR_ANDEN:      "Cambio de andén",
  REPROGRAMACION_REPROGRAMAR:        "Reprogramación de horario",
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

// ─── Tabla cumplimiento por tipo de cliente ──────────────────────────────────

function colorPorcentaje(pct: number | null): string {
  if (pct == null) return "#94A3B8";
  if (pct < 80) return "#DC2626";
  if (pct < 90) return "#D97706";
  return "#16A34A";
}

function CeldaPorcentaje({ valor, destacar = false }: { valor: number | null; destacar?: boolean }) {
  const color = colorPorcentaje(valor);
  return (
    <td
      className={`font-data text-right py-2.5 pr-4 ${destacar ? "text-sm font-bold" : "text-xs font-medium"}`}
      style={{ color }}
    >
      {valor != null ? `${valor}%` : "—"}
    </td>
  );
}

function TablaCumplimientoPorTipo({ datos }: { datos: ResumenReportes["cumplimientoPorTipo"] }) {
  if (datos.length === 0) {
    return <p className="font-display text-sm text-text-muted text-center py-4">Sin datos en el período</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-elevated">
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-left py-2 pr-4">Tipo</th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Camiones</th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">On-Time</th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Cumpl. servicio</th>
            <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">OTIF</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((row) => (
            <tr key={row.tipo} className="border-b border-bg-elevated/50 last:border-0">
              <td className="py-2.5 pr-4">
                <span className="font-display text-xs font-semibold" style={{ color: COLOR_TIPO[row.tipo] ?? "#64748B" }}>
                  {etiquetasTipo[row.tipo] ?? row.tipo}
                </span>
              </td>
              <td className="font-data text-xs text-text-primary text-right pr-4 py-2.5">{row.camiones}</td>
              <CeldaPorcentaje valor={row.onTime} />
              <CeldaPorcentaje valor={row.cumplimientoServicio} />
              <CeldaPorcentaje valor={row.otif} destacar />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabla productividad de operadores ───────────────────────────────────────

function formatSegundos(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function TablaProductividad({ datos }: { datos: ResumenReportes["productividadOperadores"] }) {
  const [rol, setRol] = useState<"pickineros" | "cargadores">("pickineros");
  const filas = datos[rol];

  const total = filas.length;
  const palletsArr = filas.map(f => "palletsArmados" in f ? f.palletsArmados : f.palletsCargados);
  const turnosArr = filas.map(f => f.palletsPorTurno).filter(v => v > 0);
  const medianaTurno = (() => {
    if (turnosArr.length === 0) return 0;
    const sorted = [...turnosArr].sort((a, b) => a - b);
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  })();
  const totalPallets = palletsArr.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          {(["pickineros", "cargadores"] as const).map(r => (
            <button
              key={r}
              onClick={() => setRol(r)}
              className={`px-3 py-1 rounded-md font-display text-[11px] uppercase tracking-wide transition-colors cursor-pointer border ${
                rol === r
                  ? "bg-accent text-white border-accent"
                  : "bg-bg-surface border-bg-elevated text-text-muted hover:border-accent/30"
              }`}
            >
              {r === "pickineros" ? "Pickineros" : "Cargadores"}
            </button>
          ))}
        </div>
        <div className="flex gap-4 font-display text-[10px] text-text-muted">
          <span>{total} operadores</span>
          <span>{totalPallets} pallets</span>
          <span>Mediana/turno: {medianaTurno.toFixed(1)}</span>
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="font-display text-sm text-text-muted text-center py-4">
          Sin actividad de {rol === "pickineros" ? "pickineros" : "cargadores"} en el período
        </p>
      ) : (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-surface">
              <tr className="border-b border-bg-elevated">
                <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-left py-2 pr-4">Operador</th>
                <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">
                  {rol === "pickineros" ? "Armados" : "Cargados"}
                </th>
                {rol === "pickineros" ? (
                  <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Tiempo/pallet</th>
                ) : (
                  <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Camiones</th>
                )}
                <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Días activos</th>
                <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2">Pallets/turno</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.usuarioId} className="border-b border-bg-elevated/50 last:border-0">
                  <td className="py-2 pr-4 font-display text-xs text-text-primary">{f.nombre}</td>
                  <td className="font-data text-xs text-text-primary text-right pr-4 py-2">
                    {"palletsArmados" in f ? f.palletsArmados : f.palletsCargados}
                  </td>
                  {"tiempoPromedioSegundos" in f ? (
                    <td className="font-data text-xs text-text-muted text-right pr-4 py-2">{formatSegundos(f.tiempoPromedioSegundos)}</td>
                  ) : (
                    <td className="font-data text-xs text-text-muted text-right pr-4 py-2">{(f as { camionesAtendidos: number }).camionesAtendidos}</td>
                  )}
                  <td className="font-data text-xs text-text-muted text-right pr-4 py-2">{f.diasActivos}</td>
                  <td className="font-data text-xs font-semibold text-text-primary text-right py-2">{f.palletsPorTurno.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
                <td className="font-data text-xs text-right pr-4 py-2.5" style={{ color: "#0EA5E9" }}>
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

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportarCSV(datos: ResumenReportes, desde: string, hasta: string) {
  const filas: string[][] = [];

  filas.push([`Reporte DispatchTrack — ${desde} al ${hasta}`]);
  filas.push([]);
  filas.push(['RESUMEN GENERAL']);
  filas.push(['Cumplimiento de servicio', datos.cumplimientoServicio != null ? `${datos.cumplimientoServicio}%` : '—']);
  filas.push(['OTIF', datos.otif != null ? `${datos.otif}%` : '—']);
  filas.push(['Total camiones', String(datos.totalCamiones)]);
  filas.push(['Despachados', String(datos.despachados)]);
  filas.push(['Con atraso', String(datos.atrasados)]);
  filas.push(['Ciclo promedio', datos.tiempoCicloPromedioMinutos != null ? `${datos.tiempoCicloPromedioMinutos} min` : '—']);
  filas.push(['Tiempo promedio en túnel', datos.tiempoPromedioTunelMinutos != null ? `${datos.tiempoPromedioTunelMinutos} min` : '—']);
  filas.push([]);

  filas.push(['CUMPLIMIENTO POR TIPO DE CLIENTE']);
  filas.push(['Tipo', 'Camiones', 'On-Time %', 'Cumpl. servicio %', 'OTIF %']);
  datos.cumplimientoPorTipo.forEach(r => filas.push([
    r.tipo,
    String(r.camiones),
    r.onTime != null ? String(r.onTime) : '—',
    r.cumplimientoServicio != null ? String(r.cumplimientoServicio) : '—',
    r.otif != null ? String(r.otif) : '—',
  ]));
  filas.push([]);

  filas.push(['PRODUCTIVIDAD PICKINEROS']);
  filas.push(['Operador', 'Pallets armados', 'Tiempo promedio (s)', 'Días activos', 'Pallets/turno']);
  datos.productividadOperadores.pickineros.forEach(p => filas.push([
    p.nombre,
    String(p.palletsArmados),
    p.tiempoPromedioSegundos != null ? String(p.tiempoPromedioSegundos) : '—',
    String(p.diasActivos),
    p.palletsPorTurno.toFixed(1),
  ]));
  filas.push([]);

  filas.push(['PRODUCTIVIDAD CARGADORES']);
  filas.push(['Operador', 'Pallets cargados', 'Camiones atendidos', 'Días activos', 'Pallets/turno']);
  datos.productividadOperadores.cargadores.forEach(c => filas.push([
    c.nombre,
    String(c.palletsCargados),
    String(c.camionesAtendidos),
    String(c.diasActivos),
    c.palletsPorTurno.toFixed(1),
  ]));
  filas.push([]);

  filas.push(['DESPACHOS POR DÍA']);
  filas.push(['Fecha', 'Cantidad']);
  datos.despachadosPorDia.forEach(r => filas.push([String(r.dia), String(r.cantidad)]));
  filas.push([]);

  filas.push(['TIEMPOS POR EDIFICIO']);
  filas.push(['Edificio', 'Promedio (min)', 'Cantidad', 'Presupuesto Nacional', 'Presupuesto Exportación']);
  datos.tiempoPorEdificio.forEach(r => filas.push([
    r.edificio,
    String(r.promedioMinutos),
    String(r.cantidad),
    r.presupuestoNacional ? String(r.presupuestoNacional) : '—',
    r.presupuestoExportacion ? String(r.presupuestoExportacion) : '—',
  ]));
  filas.push([]);

  filas.push(['TOP CAUSAS DE JUSTIFICACIÓN']);
  filas.push(['Causa', 'Cantidad']);
  datos.topCausasJustificacion.forEach(r => filas.push([ETIQUETA_CAUSA[r.causa] ?? r.causa, String(r.cantidad)]));

  const csv = filas.map(fila => fila.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-${desde}-${hasta}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [desde, setDesde] = useState(hace30Dias());
  const [hasta, setHasta] = useState(hoy());
  const [datos, setDatos] = useState<ResumenReportes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const res = await obtenerResumenReportesApi({ desde, hasta });
      setDatos(res);
    } catch (e: unknown) {
      setErrorCarga(e instanceof Error ? e.message : 'Error al cargar reportes');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalSAG = datos ? datos.inspeccionesSAG.aprobados + datos.inspeccionesSAG.rechazados : 0;
  const tasaAprobSAG = totalSAG > 0
    ? Math.round((datos!.inspeccionesSAG.aprobados / totalSAG) * 100)
    : null;

  const totalPorEstado = datos?.porEstado.reduce((s, e) => s + e.cantidad, 0) ?? 0;

  // Tasa de atrasos sobre despachados (usado en card de atrasos)
  const tasaAtrasos = datos && datos.despachados > 0
    ? Math.round((datos.atrasados / datos.despachados) * 100)
    : null;
  const tasaAtrasosPrev = datos && datos.comparativoPeriodoAnterior.despachados > 0
    ? (datos.comparativoPeriodoAnterior.atrasados / datos.comparativoPeriodoAnterior.despachados) * 100
    : null;

  // Días del rango y muestra mínima para mostrar deltas
  const diasRango = Math.max(
    1,
    Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000) + 1,
  );
  const muestraSuficiente =
    !!datos &&
    diasRango >= DIAS_MIN_DELTA &&
    datos.cumplimientoPorTipo.reduce((s, t) => s + t.camiones, 0) >= MUESTRA_MIN_DELTA &&
    datos.comparativoPeriodoAnterior.totalCamiones >= MUESTRA_MIN_DELTA;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabecera solo visible al imprimir */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold text-slate-900">DispatchTrack — Reporte operacional</h1>
        <p className="text-sm text-slate-600 mt-1">
          Período: {desde} a {hasta} · Generado {new Date().toLocaleString("es-CL")}
        </p>
      </div>

      {errorCarga && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={15} className="shrink-0" />
          {errorCarga}
          <button onClick={cargar} className="ml-auto text-xs font-medium underline hover:no-underline">Reintentar</button>
        </div>
      )}
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
          <button
            onClick={() => datos && exportarCSV(datos, desde, hasta)}
            disabled={!datos || cargando}
            title="Exportar CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bg-elevated text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors text-xs font-display disabled:opacity-40 cursor-pointer"
          >
            <Download size={13} />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            title="Imprimir / Exportar PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bg-elevated text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors text-xs font-display cursor-pointer"
          >
            <Printer size={13} />
            PDF
          </button>
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
            <KpiCard
              icon={Scale}
              label="Cumplimiento de servicio"
              color="#1E3A5F"
              delay={0}
              value={datos.cumplimientoServicio != null ? `${datos.cumplimientoServicio}%` : "—"}
              sub="Unidades entregadas vs solicitadas"
              glosario="Porcentaje de unidades efectivamente cargadas respecto a las solicitadas. Mide la capacidad de la planta de cumplir lo prometido al cliente. Saludable ≥95%."
              delta={calcularDelta(
                datos.cumplimientoServicio,
                datos.comparativoPeriodoAnterior.cumplimientoServicio,
                "%",
                muestraSuficiente,
              )}
            />
            <KpiCard
              icon={CheckCircle2}
              label="OTIF"
              color="#16A34A"
              delay={0.05}
              value={datos.otif != null ? `${datos.otif}%` : "—"}
              sub="A tiempo y completos"
              glosario="On-Time In-Full: porcentaje de camiones que salieron a tiempo Y con el 100% de las líneas cumplidas. Estándar logístico. Bueno ≥90%, crítico <80%."
              delta={calcularDelta(
                datos.otif,
                datos.comparativoPeriodoAnterior.otif,
                "%",
                muestraSuficiente,
              )}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Con atraso"
              color="#DC2626"
              delay={0.1}
              value={datos.atrasados}
              sub={tasaAtrasos != null ? `${tasaAtrasos}% de los despachados` : undefined}
              glosario="Camiones cuya hora de salida real fue posterior a la planificada. Bajo 10% se considera saludable."
              delta={calcularDelta(
                tasaAtrasos,
                tasaAtrasosPrev,
                "%",
                muestraSuficiente,
              )}
            />
            <KpiCard
              icon={Clock}
              label="Tiempo de ciclo"
              color="#8B5CF6"
              delay={0.15}
              value={datos.tiempoCicloPromedioMinutos ? formatMinutos(datos.tiempoCicloPromedioMinutos) : "—"}
              sub="Promedio en planta"
              glosario="Minutos promedio desde llegada real hasta salida real del camión. Indicador directo de productividad. Compárese con el período anterior."
              delta={calcularDelta(
                datos.tiempoCicloPromedioMinutos,
                datos.comparativoPeriodoAnterior.tiempoCicloPromedioMinutos,
                "min",
                muestraSuficiente,
              )}
            />
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

            {/* Cumplimiento por tipo de cliente — tabla */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.3 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Truck size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Cumplimiento por tipo de cliente</h3>
              </div>
              <TablaCumplimientoPorTipo datos={datos.cumplimientoPorTipo} />
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
                  {datos.tiempoPromedioTunelMinutos != null && (
                    <div className="pt-2 border-t border-bg-elevated">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs text-text-muted">Tiempo promedio en túnel</span>
                        <span className="font-data text-sm font-semibold text-text-primary">
                          {formatMinutos(datos.tiempoPromedioTunelMinutos)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Productividad de operadores */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.4 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4 md:col-span-2"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Productividad de operadores</h3>
              </div>
              <TablaProductividad datos={datos.productividadOperadores} />
            </motion.div>

            {/* Tiempo por punto de expedición — barras agrupadas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.3 }}
              className="bg-bg-surface border border-bg-elevated rounded-xl p-4 md:col-span-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={14} className="text-accent" />
                <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Tiempo por punto de expedición</h3>
                {datos.atrasonesJustificados > 0 && (
                  <span className="ml-auto font-display text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }}>
                    <FileText size={9} /> {datos.atrasonesJustificados} justificado{datos.atrasonesJustificados !== 1 ? "s" : ""} excluido{datos.atrasonesJustificados !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {/* Leyenda */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm opacity-40" style={{ background: "#0EA5E9" }} />
                  <span className="font-display text-[10px] text-text-muted">Presupuesto</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "#B45309" }} />
                  <span className="font-display text-[10px] text-text-muted">Promedio real</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "#DC2626" }} />
                  <span className="font-display text-[10px] text-text-muted">Sobre presupuesto</span>
                </div>
              </div>
              <GraficoTiempoEdificio datos={datos.tiempoPorEdificio} />
              {datos.atrasosPorEdificio.length > 0 && (
                <div className="pt-3 border-t border-bg-elevated mt-2">
                  <p className="font-display text-xs text-text-muted">
                    Mayor atraso promedio:{" "}
                    <span className="font-semibold text-semantic-error">
                      {(() => {
                        const peor = datos.atrasosPorEdificio[0];
                        const cfg = CONFIG_EDIFICIO[peor.edificio];
                        return `${cfg?.label ?? peor.edificio} (+${formatMinutos(peor.atrasoPromedioMinutos)})`;
                      })()}
                    </span>
                    {datos.atrasonesJustificados > 0 && (
                      <span className="ml-1" style={{ color: "#B45309" }}>
                        · {datos.atrasonesJustificados} incidente{datos.atrasonesJustificados !== 1 ? "s" : ""} justificado{datos.atrasonesJustificados !== 1 ? "s" : ""} excluido{datos.atrasonesJustificados !== 1 ? "s" : ""} del cálculo.
                      </span>
                    )}
                  </p>
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

            {/* Incidentes operativos */}
            {datos.incidentesOperativos.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.42 }}
                className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-accent" />
                  <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Incidentes operativos</h3>
                  <span className="ml-auto font-data text-xs text-text-muted">{datos.incidentesOperativos.total} total</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bg-elevated">
                      <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-left py-2 pr-4">Tipo</th>
                      <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2 pr-4">Cantidad</th>
                      <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-right py-2">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.incidentesOperativos.desglose.map((row, i) => (
                      <tr key={i} className="border-b border-bg-elevated/50 last:border-0">
                        <td className="py-2 pr-4 font-display text-xs text-text-primary">
                          {ETIQUETA_INCIDENTE[`${row.tipo}_${row.accion}`] ?? `${row.tipo} / ${row.accion}`}
                        </td>
                        <td className="font-data text-xs text-text-primary text-right pr-4 py-2">{row.cantidad}</td>
                        <td className="font-data text-xs text-text-muted text-right py-2">{row.porcentaje}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {/* Top causas de justificación — barras horizontales */}
            {datos.topCausasJustificacion.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.45 }}
                className="bg-bg-surface border border-bg-elevated rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-accent" />
                  <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Causas de justificación</h3>
                </div>
                <GraficoCausas datos={datos.topCausasJustificacion} />
              </motion.div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
