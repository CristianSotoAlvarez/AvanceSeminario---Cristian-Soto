"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, Truck, CheckCircle2, LayoutDashboard, Clock } from "lucide-react";
import { Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useCamiones } from "@/hooks/use-camiones";
import { useAndenes } from "@/hooks/use-andenes";
import { useSocketCamiones, useSocketAndenes } from "@/hooks/use-socket";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { formatearHora, minutosAtraso, formatearAtraso } from "@/lib/formato";
import type { Camion } from "@/lib/api";

const TOTAL_ANDENES = 11;

function esAtrasado(camion: Camion): boolean {
  return (
    !!camion.horaSalidaPlanificada &&
    camion.estado !== "DESPACHADO" &&
    new Date(camion.horaSalidaPlanificada) < new Date()
  );
}

// ─── KPI Card con barra lateral de acento ────────────────────────────────────

function KpiAccent({
  label, value, sub, accentColor, icon: Icon, cargando, valueColor,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  accentColor: string;
  icon: React.ElementType;
  cargando?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      className="bg-bg-surface border border-bg-elevated rounded-lg h-28 flex overflow-hidden"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex-1 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <span className="font-display text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            {label}
          </span>
          <Icon size={15} style={{ color: accentColor }} className="opacity-70 shrink-0" />
        </div>
        {cargando ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="flex items-end gap-2">
            <span
              className="font-data text-3xl font-bold leading-none"
              style={{ color: valueColor ?? "var(--color-text-primary)" }}
            >
              {value}
            </span>
            {sub && <div className="mb-0.5">{sub}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI especial: Andenes con mini-mapa ─────────────────────────────────────

function KpiAndenes({ ocupados, cargando }: { ocupados: number; cargando?: boolean }) {
  return (
    <div
      className="bg-bg-surface border border-bg-elevated rounded-lg h-28 flex overflow-hidden"
      style={{ borderLeft: "4px solid #EA580C" }}
    >
      <div className="flex-1 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <span className="font-display text-[10px] font-semibold text-text-muted uppercase tracking-widest">
            Andenes Ocupados
          </span>
          <LayoutDashboard size={15} className="text-text-muted opacity-60 shrink-0" />
        </div>
        {cargando ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div>
            <div className="flex items-end gap-1.5 mb-2">
              <span className="font-data text-3xl font-bold text-text-primary leading-none">{ocupados}</span>
              <span className="font-data text-sm text-text-muted mb-0.5">/ {TOTAL_ANDENES}</span>
            </div>
            {/* Mini-mapa de andenes */}
            <div className="flex gap-0.5">
              {Array.from({ length: TOTAL_ANDENES }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-sm"
                  style={{ background: i < ocupados ? "#EA580C" : "#E2E8F0" }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fila de tabla mejorada ───────────────────────────────────────────────────

function FilaCamion({ camion, index, atrasado }: { camion: Camion; index: number; atrasado: boolean }) {
  const router = useRouter();
  const min = atrasado ? minutosAtraso(camion.horaSalidaPlanificada!) : 0;
  const colorAtraso = min > 120 ? "#DC2626" : min > 60 ? "#C2410C" : "#D97706";

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: 0.32 + index * 0.04, ease: "easeOut" }}
      onClick={() => router.push(`/camiones/${camion.id}`)}
      className="group border-b border-bg-elevated transition-colors duration-150 cursor-pointer"
      style={atrasado ? { background: "#FFF1F2" } : {}}
    >
      {/* Celda con borde izquierdo en hover */}
      <td className="py-3 px-4 border-l-[3px] border-transparent group-hover:border-accent transition-colors">
        <div className="flex items-center gap-1.5">
          {atrasado && <AlertTriangle size={11} className="text-semantic-error shrink-0" />}
          <span className="font-data text-sm font-semibold text-text-primary">
            {camion.numeroTransporte ?? camion.patente}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 font-display text-xs text-text-muted">
        {etiquetasTipo[camion.tipo] || camion.tipo}
      </td>
      <td className="py-3 px-4 font-display text-xs text-text-primary">
        {camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre ?? "—"}
      </td>
      <td className="py-3 px-4 font-data text-xs text-text-muted">
        {camion.anden?.codigo || <span className="text-text-muted/50">Sin asignar</span>}
      </td>
      <td className="py-3 px-4 font-data text-xs" style={atrasado ? { color: colorAtraso, fontWeight: 700 } : { color: "var(--color-text-primary)" }}>
        {camion.horaSalidaPlanificada
          ? `${formatearHora(camion.horaSalidaPlanificada)}${atrasado ? ` (+${formatearAtraso(min)})` : ""}`
          : "—"}
      </td>
      <td className="py-3 px-4">
        <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
          {etiquetasEstado[camion.estado] || camion.estado}
        </Badge>
      </td>
    </motion.tr>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { camiones, cargando, recargar } = useCamiones();
  const { andenes, recargar: recargarAndenes } = useAndenes();

  const handleActualizado = useCallback(() => recargar(), [recargar]);
  const handleAndenesActualizados = useCallback(() => recargarAndenes(), [recargarAndenes]);
  useSocketCamiones(handleActualizado);
  useSocketAndenes(handleAndenesActualizados);

  const totalCamiones   = camiones.length;
  const despachados     = camiones.filter((c) => c.estado === "DESPACHADO").length;
  const camionesActivos = camiones.filter((c) => c.estado !== "DESPACHADO");
  const andenesOcupados = andenes.filter((a) => a.camiones.length > 0).length;

  // Atrasados: unión de camiones de hoy + camiones activos en andenes (pueden ser de días anteriores)
  const camionesEnAndenes = andenes.flatMap((a) => a.camiones);
  const idsHoy = new Set(camiones.map((c) => c.id));
  const camionesExtraAndenes = camionesEnAndenes.filter((c) => !idsHoy.has(c.id));
  const todosActivos = [...camionesActivos, ...camionesExtraAndenes];
  const atrasados    = todosActivos.filter(esAtrasado);

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0 }}>
          <KpiAccent
            label="Camiones Hoy"
            value={cargando ? "—" : totalCamiones}
            accentColor="#0EA5E9"
            icon={Truck}
            cargando={cargando}
            valueColor="#0EA5E9"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.06 }}>
          <KpiAccent
            label="Despachados"
            value={cargando ? "—" : despachados}
            sub={totalCamiones > 0 && !cargando
              ? <span className="font-data text-[10px] text-text-muted">/ {totalCamiones} hoy</span>
              : undefined}
            accentColor="#16A34A"
            icon={CheckCircle2}
            cargando={cargando}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.12 }}>
          <KpiAndenes ocupados={andenesOcupados} cargando={cargando} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.18 }}>
          <KpiAccent
            label="Con Atraso"
            value={cargando ? "—" : atrasados.length}
            sub={atrasados.length > 0 && !cargando
              ? <span className="font-display text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "#FFF1F2", color: "#DC2626", border: "1px solid #FECDD3" }}>Requieren atención</span>
              : undefined}
            accentColor="#DC2626"
            icon={Clock}
            cargando={cargando}
            valueColor={atrasados.length > 0 ? "#DC2626" : undefined}
          />
        </motion.div>
      </div>

      {/* Tabla de atrasados */}
      {!cargando && atrasados.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.24 }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-semantic-error" />
            <h2 className="font-display text-xs font-bold text-semantic-error uppercase tracking-widest">
              Atrasados ({atrasados.length})
            </h2>
          </div>
          <div className="rounded-lg border-2 border-red-200 overflow-hidden bg-bg-surface">
            <TablaFilas camiones={atrasados} baseDelay={0.28} />
          </div>
        </motion.div>
      )}

      {/* Tabla de activos */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.28 }}>
        <h2 className="font-display text-xs font-bold text-text-primary uppercase tracking-widest mb-3">
          Camiones Activos
        </h2>

        {cargando ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : camionesActivos.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-text-muted font-display text-sm bg-bg-surface border border-bg-elevated rounded-lg">
            No hay camiones activos
          </div>
        ) : (
          <div className="bg-bg-surface border border-bg-elevated rounded-lg overflow-hidden">
            <TablaFilas camiones={camionesActivos} baseDelay={0.32} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TablaFilas({ camiones, baseDelay }: { camiones: Camion[]; baseDelay: number }) {
  return (
    <table className="w-full text-left border-collapse">
      <thead className="bg-bg-elevated/60">
        <tr>
          {["Transporte", "Tipo", "Cliente", "Andén", "Salida Plan.", "Estado"].map(h => (
            <th key={h} className="py-2.5 px-4 font-display text-[10px] font-semibold text-text-muted uppercase tracking-widest">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-bg-elevated">
        {camiones.map((camion, i) => (
          <FilaCamion
            key={camion.id}
            camion={camion}
            index={i}
            atrasado={esAtrasado(camion)}
          />
        ))}
      </tbody>
    </table>
  );
}
