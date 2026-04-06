"use client";

import { useEffect, useState, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import {
  ArrowLeft, Truck, Clock, CheckCircle2, XCircle, AlertTriangle,
  User, Calendar, Package, Shield, FileText, Trash2, X, Plus, Loader2, ExternalLink, Info,
  ChevronUp, ChevronDown, Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  obtenerCamionApi, justificarParadaApi, eliminarJustificacionApi,
  crearPalletApi, crearEntregaApi, reordenarParadasApi,
  type CamionDetalle, type ParadaExpedicion, type EntregaResumen,
} from "@/lib/api";
import { QrCamion } from "@/components/qr-camion";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { formatearFechaHora, formatearAtraso, minutosAtraso } from "@/lib/formato";
import { AuthContext } from "@/lib/auth-context";

// ─── Config visual ────────────────────────────────────────────────────────────

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AVES:        { label: "Aves",        color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  CERDO:       { label: "Cerdo",       color: "#BE185D", bg: "#FFE4E6", border: "#FECDD3" },
  FRIGORIFICO: { label: "Frigorífico", color: "#0E7490", bg: "#CFFAFE", border: "#A5F3FC" },
};

const COLOR_EVENTO: Record<string, string> = {
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

const ETIQUETA_ROL: Record<string, string> = {
  JEFE_DESPACHO:           "Jefe Despacho",
  COORDINADOR_TRANSPORTE:  "Coordinador",
  COORDINADOR:             "Coordinador",
  SAG:                     "Inspector SAG",
  OPERADOR_TUNEL:          "Op. Túnel",
  CARGADOR:                "Cargador",
  PICKINERO:               "Pickinero",
  SUPERVISOR:              "Supervisor",
};

// Genera causas con el nombre del edificio embebido
function causasParaEdificio(edificio: string): { value: string; label: string }[] {
  const lugar = { AVES: "Aves", CERDO: "Cerdo", FRIGORIFICO: "Frigorífico" }[edificio] ?? edificio;
  return [
    { value: "FALLA_ANDEN",      label: `Falla de andén — ${lugar}` },
    { value: "FALLA_MECANICA",   label: `Falla mecánica — ${lugar}` },
    { value: "FALTA_PERSONAL",   label: `Falta de personal — ${lugar}` },
    { value: "FALTA_PRODUCTO",   label: `Falta de producto — ${lugar}` },
    { value: "VOLUMEN_EXCESIVO", label: `Volumen excesivo de carga — ${lugar}` },
    { value: "PROBLEMA_CALIDAD", label: `Problema de calidad — ${lugar}` },
    { value: "OTRO",             label: "Otro" },
  ];
}

// Etiqueta corta para mostrar en el banner de justificación
const ETIQUETA_CAUSA: Record<string, string> = {
  FALLA_ANDEN:      "Falla de andén",
  FALLA_MECANICA:   "Falla mecánica",
  FALTA_PERSONAL:   "Falta de personal",
  FALTA_PRODUCTO:   "Falta de producto",
  VOLUMEN_EXCESIVO: "Volumen excesivo",
  PROBLEMA_CALIDAD: "Problema de calidad",
  OTRO:             "Otro",
};

const ROLES_PUEDEN_JUSTIFICAR = ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function duracion(inicio: string, fin: string): string {
  const mins = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Modal de justificación ───────────────────────────────────────────────────

interface ModalJustificarProps {
  parada: ParadaExpedicion;
  onCerrar: () => void;
  onGuardado: (parada: ParadaExpedicion) => void;
}

function ModalJustificar({ parada, onCerrar, onGuardado }: ModalJustificarProps) {
  const cfg = CONFIG_EDIFICIO[parada.edificioTipo];
  const [causa, setCausa] = useState(parada.justificacion?.causa ?? "");
  const [descripcion, setDescripcion] = useState(parada.justificacion?.descripcion ?? "");
  const [excluir, setExcluir] = useState(parada.justificacion?.excluirDelCalculo ?? true);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!causa) { toast.error("Selecciona una causa"); return; }
    setGuardando(true);
    try {
      const justificacion = await justificarParadaApi(parada.id, { causa, descripcion: descripcion || undefined, excluirDelCalculo: excluir });
      toast.success("Justificación guardada");
      onGuardado({ ...parada, justificacion });
    } catch {
      toast.error("Error al guardar la justificación");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, background: "rgba(15,23,42,0.6)" }}
      onClick={onCerrar}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-bg-surface rounded-xl border border-bg-elevated shadow-xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-sm font-bold text-text-primary">Justificar atraso</h2>
            <p className="font-display text-xs text-text-muted mt-0.5">
              Parada <span style={{ color: cfg?.color }} className="font-bold">{cfg?.label ?? parada.edificioTipo}</span>
              {parada.horaInicio && parada.horaFin && (
                <span className="ml-1">· {duracion(parada.horaInicio, parada.horaFin)}</span>
              )}
            </p>
          </div>
          <button onClick={onCerrar} className="text-text-muted hover:text-text-primary cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Causa */}
          <div>
            <label className="font-display text-[10px] uppercase tracking-widest text-text-muted block mb-1">
              Causa
            </label>
            <select
              value={causa}
              onChange={(e) => setCausa(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Selecciona una causa...</option>
              {causasParaEdificio(parada.edificioTipo).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="font-display text-[10px] uppercase tracking-widest text-text-muted block mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales sobre el atraso..."
              className="w-full bg-bg-elevated border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-text-muted/50"
            />
          </div>

          {/* Excluir del cálculo */}
          <label className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg cursor-pointer hover:bg-bg-elevated/80 transition-colors">
            <input
              type="checkbox"
              checked={excluir}
              onChange={(e) => setExcluir(e.target.checked)}
              className="rounded accent-accent"
            />
            <div>
              <p className="font-display text-xs font-semibold text-text-primary">Excluir del cálculo de pesos</p>
              <p className="font-display text-[10px] text-text-muted mt-0.5">
                Esta parada no afectará la mediana de tiempos del punto de expedición
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onCerrar}
            className="flex-1 px-4 py-2 rounded-lg border border-bg-elevated font-display text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !causa}
            className="flex-1 px-4 py-2 rounded-lg font-display text-sm text-white transition-colors cursor-pointer disabled:opacity-50"
            style={{ background: "#EA580C" }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sección: KPIs de tiempos ─────────────────────────────────────────────────

function KpiTiempos({ camion }: { camion: CamionDetalle }) {
  const llegadaReal  = camion.horaLlegadaReal;
  const salidaReal   = camion.horaSalidaReal;
  const llegadaPlan  = camion.horaLlegadaPlanificada;
  const salidaPlan   = camion.horaSalidaPlanificada;

  const retrasoLlegada = llegadaReal && llegadaPlan
    ? Math.round((new Date(llegadaReal).getTime() - new Date(llegadaPlan).getTime()) / 60000)
    : null;

  const tiempoTotal = llegadaReal && salidaReal
    ? duracion(llegadaReal, salidaReal)
    : null;

  const atrasoSalida = salidaPlan && !salidaReal && camion.estado !== "DESPACHADO"
    ? minutosAtraso(salidaPlan)
    : null;

  const kpis = [
    {
      label: "Llegada planif.",
      value: formatearFechaHora(llegadaPlan),
      icon: Calendar,
      color: "text-text-primary",
    },
    {
      label: "Llegada real",
      value: llegadaReal ? formatearFechaHora(llegadaReal) : "—",
      sub: retrasoLlegada !== null
        ? retrasoLlegada > 0
          ? `+${formatearAtraso(retrasoLlegada)} tarde`
          : `${formatearAtraso(Math.abs(retrasoLlegada))} antes`
        : null,
      subColor: retrasoLlegada !== null ? (retrasoLlegada > 5 ? "#DC2626" : "#16A34A") : undefined,
      icon: Clock,
      color: "text-text-primary",
    },
    {
      label: "Salida planif.",
      value: salidaPlan ? formatearFechaHora(salidaPlan) : "—",
      sub: atrasoSalida !== null && atrasoSalida > 0 ? `+${formatearAtraso(atrasoSalida)} de atraso` : null,
      subColor: "#DC2626",
      icon: Calendar,
      color: atrasoSalida && atrasoSalida > 0 ? "text-semantic-error" : "text-text-primary",
    },
    {
      label: "Tiempo total",
      value: tiempoTotal ?? (llegadaReal ? "En curso" : "—"),
      icon: Clock,
      color: tiempoTotal ? "text-semantic-success" : "text-text-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(({ label, value, sub, subColor, icon: Icon, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
          className="bg-bg-surface border border-bg-elevated rounded-lg p-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={11} className="text-text-muted" />
            <p className="font-display text-[10px] uppercase text-text-muted tracking-widest">{label}</p>
          </div>
          <p className={`font-data text-sm font-bold ${color}`}>{value}</p>
          {sub && <p className="font-display text-[10px] mt-0.5" style={{ color: subColor }}>{sub}</p>}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Sección: Ruta de paradas ─────────────────────────────────────────────────

function SeccionParadas({
  camion,
  puedeJustificar,
  puedeReordenar,
  onParadaActualizada,
  onCamionActualizado,
}: {
  camion: CamionDetalle;
  puedeJustificar: boolean;
  puedeReordenar: boolean;
  onParadaActualizada: (p: ParadaExpedicion) => void;
  onCamionActualizado: (c: CamionDetalle) => void;
}) {
  const [paradaJustificando, setParadaJustificando] = useState<ParadaExpedicion | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [reordenando, setReordenando] = useState(false);

  if (!camion.paradas?.length) return null;

  const paradasPendientes = camion.paradas.filter(p => p.estado === "PENDIENTE");

  async function moverParada(paradaId: string, direccion: "arriba" | "abajo") {
    const idxEnPendientes = paradasPendientes.findIndex(p => p.id === paradaId);
    if (idxEnPendientes === -1) return;
    if (direccion === "arriba" && idxEnPendientes === 0) return;
    if (direccion === "abajo" && idxEnPendientes === paradasPendientes.length - 1) return;

    const nuevoOrden = [...paradasPendientes.map(p => p.id)];
    const swapIdx = direccion === "arriba" ? idxEnPendientes - 1 : idxEnPendientes + 1;
    [nuevoOrden[idxEnPendientes], nuevoOrden[swapIdx]] = [nuevoOrden[swapIdx], nuevoOrden[idxEnPendientes]];

    setReordenando(true);
    try {
      const actualizado = await reordenarParadasApi(camion.id, nuevoOrden);
      onCamionActualizado(actualizado);
      toast.success("Orden de paradas actualizado");
    } catch {
      toast.error("Error al reordenar las paradas");
    } finally {
      setReordenando(false);
    }
  }

  async function eliminarJustificacion(parada: ParadaExpedicion) {
    setEliminando(parada.id);
    try {
      await eliminarJustificacionApi(parada.id);
      toast.success("Justificación eliminada");
      onParadaActualizada({ ...parada, justificacion: null });
    } catch {
      toast.error("Error al eliminar la justificación");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <>
      <div className="bg-bg-surface border border-bg-elevated rounded-xl p-4">
        <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest mb-4 flex items-center gap-2">
          <Package size={12} /> Ruta de expedición
        </h3>
        <div className="flex flex-col gap-2">
          {camion.paradas.map((parada, i) => {
            const cfg    = CONFIG_EDIFICIO[parada.edificioTipo];
            const done   = parada.estado === "COMPLETADO";
            const active = parada.estado === "EN_PROCESO";
            const dur    = parada.horaInicio && parada.horaFin
              ? duracion(parada.horaInicio, parada.horaFin)
              : null;
            const just   = parada.justificacion;
            const causaLabel = just?.causa
              ? `${ETIQUETA_CAUSA[just.causa] ?? just.causa} — ${CONFIG_EDIFICIO[parada.edificioTipo]?.label ?? parada.edificioTipo}`
              : null;

            return (
              <motion.div
                key={parada.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06 }}
                className="rounded-lg border"
                style={{
                  background: done ? "#F8FAFC" : active ? cfg?.bg : "#FAFAFA",
                  borderColor: done ? "#E2E8F0" : active ? cfg?.border : "#F1F5F9",
                }}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Número de parada */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-data text-xs font-bold"
                    style={{
                      background: done ? "#E2E8F0" : cfg?.bg,
                      color: done ? "#94A3B8" : cfg?.color,
                      border: `2px solid ${done ? "#CBD5E1" : cfg?.border}`,
                    }}
                  >
                    {done ? <CheckCircle2 size={14} /> : i + 1}
                  </div>

                  {/* Info parada */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-display text-xs font-bold uppercase"
                        style={{ color: done ? "#94A3B8" : cfg?.color }}
                      >
                        {cfg?.label ?? parada.edificioTipo}
                      </span>
                      {parada.anden && (
                        <span className="font-data text-xs text-text-muted">
                          Andén {parada.anden.codigo}
                        </span>
                      )}
                      {active && (
                        <span className="font-display text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full animate-pulse"
                          style={{ background: cfg?.bg, color: cfg?.color, border: `1px solid ${cfg?.border}` }}>
                          En proceso
                        </span>
                      )}
                      {/* Pallets: solicitados vs cargados */}
                      {(() => {
                        const solicitados = parada.cantidadPalletsSolicitados;
                        const cargados    = parada.entrega?.pallets?.length ?? 0;
                        if (!solicitados && cargados === 0) return null;
                        const completo = solicitados ? cargados >= solicitados : false;
                        return (
                          <span
                            className="font-data text-[10px] px-1.5 py-0.5 rounded border"
                            style={{
                              background: completo ? "#DCFCE7" : "#F1F5F9",
                              color:      completo ? "#16A34A" : "#64748B",
                              borderColor: completo ? "#BBF7D0" : "#E2E8F0",
                            }}
                          >
                            {cargados}{solicitados ? `/${solicitados}` : ""} pallets
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {parada.horaInicio && (
                        <span className="font-data text-[10px] text-text-muted">
                          Inicio: {formatearFechaHora(parada.horaInicio)}
                        </span>
                      )}
                      {parada.horaFin && (
                        <span className="font-data text-[10px] text-text-muted">
                          Fin: {formatearFechaHora(parada.horaFin)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Duración */}
                    {dur && (
                      <span className="font-data text-xs text-text-muted tabular-nums">{dur}</span>
                    )}

                    {/* Botones reordenar — solo PENDIENTE y rol autorizado */}
                    {puedeReordenar && parada.estado === "PENDIENTE" && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moverParada(parada.id, "arriba")}
                          disabled={reordenando || paradasPendientes[0]?.id === parada.id}
                          className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                          title="Mover antes"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={() => moverParada(parada.id, "abajo")}
                          disabled={reordenando || paradasPendientes[paradasPendientes.length - 1]?.id === parada.id}
                          className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                          title="Mover después"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    )}

                    {/* Botón justificar — solo para completadas y rol autorizado */}
                    {puedeJustificar && done && (
                      just ? (
                        <button
                          onClick={() => setParadaJustificando(parada)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md font-display text-[10px] transition-colors cursor-pointer"
                          style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }}
                          title="Ver / editar justificación"
                        >
                          <FileText size={10} /> Justificado
                        </button>
                      ) : (
                        <button
                          onClick={() => setParadaJustificando(parada)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md font-display text-[10px] border border-bg-elevated text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
                          title="Justificar atraso"
                        >
                          <FileText size={10} /> Justificar
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Banner de justificación */}
                {just && (
                  <div
                    className="mx-3 mb-3 px-3 py-2 rounded-md flex items-start gap-2"
                    style={{ background: just.excluirDelCalculo ? "#FEF3C7" : "#F0F9FF", border: `1px solid ${just.excluirDelCalculo ? "#FDE68A" : "#BAE6FD"}` }}
                  >
                    <FileText size={11} className="shrink-0 mt-0.5" style={{ color: just.excluirDelCalculo ? "#B45309" : "#0369A1" }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[10px] font-semibold" style={{ color: just.excluirDelCalculo ? "#B45309" : "#0369A1" }}>
                        {causaLabel}
                        {just.excluirDelCalculo && (
                          <span className="ml-1.5 font-normal opacity-70">· Excluido del cálculo</span>
                        )}
                      </p>
                      {just.descripcion && (
                        <p className="font-display text-[10px] text-text-muted mt-0.5 italic">"{just.descripcion}"</p>
                      )}
                      {just.registradoPor && (
                        <p className="font-display text-[10px] text-text-muted mt-0.5">
                          Por {just.registradoPor.nombre}
                        </p>
                      )}
                    </div>
                    {puedeJustificar && (
                      <button
                        onClick={() => eliminarJustificacion(parada)}
                        disabled={eliminando === parada.id}
                        className="text-text-muted hover:text-semantic-error transition-colors cursor-pointer disabled:opacity-40"
                        title="Eliminar justificación"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {paradaJustificando && (
          <ModalJustificar
            parada={paradaJustificando}
            onCerrar={() => setParadaJustificando(null)}
            onGuardado={(p) => {
              onParadaActualizada(p);
              setParadaJustificando(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Sección: Inspecciones SAG ────────────────────────────────────────────────

function SeccionSAG({ camion }: { camion: CamionDetalle }) {
  if (!camion.inspecciones?.length) return null;

  return (
    <div className="bg-bg-surface border border-bg-elevated rounded-xl p-4">
      <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest mb-4 flex items-center gap-2">
        <Shield size={12} /> Inspecciones SAG
      </h3>
      <div className="flex flex-col gap-2">
        {camion.inspecciones.map((insp, i) => {
          const aprobado = insp.estado === "APROBADO";
          return (
            <motion.div
              key={insp.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.06 }}
              className="flex items-start gap-3 p-3 rounded-lg border"
              style={{
                background: aprobado ? "#F0FDF4" : "#FFF1F2",
                borderColor: aprobado ? "#BBF7D0" : "#FECDD3",
              }}
            >
              {aprobado
                ? <CheckCircle2 size={16} className="text-semantic-success mt-0.5 shrink-0" />
                : <XCircle     size={16} className="text-semantic-error   mt-0.5 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold" style={{ color: aprobado ? "#16A34A" : "#DC2626" }}>
                    {aprobado ? "Aprobado" : "Rechazado"}
                  </span>
                  {insp.inspector && (
                    <span className="font-display text-[10px] text-text-muted">
                      por {insp.inspector.nombre}
                    </span>
                  )}
                </div>
                {insp.observaciones && (
                  <p className="font-display text-xs text-text-muted mt-1 italic">"{insp.observaciones}"</p>
                )}
                {insp.timestampResolucion && (
                  <p className="font-data text-[10px] text-text-muted mt-0.5">
                    {formatearFechaHora(insp.timestampResolucion)}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sección: Timeline de eventos ────────────────────────────────────────────

function Timeline({ eventos }: { eventos: CamionDetalle["eventos"] }) {
  return (
    <div className="bg-bg-surface border border-bg-elevated rounded-xl p-4">
      <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest mb-4 flex items-center gap-2">
        <Clock size={12} /> Historial de eventos
      </h3>

      <div className="relative">
        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-bg-elevated" />

        <div className="flex flex-col gap-0">
          {eventos.map((evento, i) => {
            const color = COLOR_EVENTO[evento.estado] ?? "#94A3B8";
            const esUltimo = i === eventos.length - 1;
            return (
              <motion.div
                key={evento.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: i * 0.04 }}
                className="flex gap-4 relative pb-4 last:pb-0"
              >
                <div
                  className="w-[28px] h-[28px] rounded-full border-2 border-bg-primary flex items-center justify-center shrink-0 z-10"
                  style={{ background: esUltimo ? color : color + "30", borderColor: color }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: esUltimo ? "#fff" : color }} />
                </div>

                <div className="flex-1 pt-1 pb-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <span
                        className="font-display text-xs font-semibold uppercase tracking-wide"
                        style={{ color }}
                      >
                        {etiquetasEstado[evento.estado] ?? evento.estado}
                      </span>
                      {evento.usuario && (
                        <span className="ml-2 font-display text-[10px] text-text-muted">
                          <User size={9} className="inline mr-0.5" />
                          {evento.usuario.nombre}
                          <span className="ml-1 opacity-60">({ETIQUETA_ROL[evento.usuario.rol] ?? evento.usuario.rol})</span>
                        </span>
                      )}
                    </div>
                    <span className="font-data text-[10px] text-text-muted tabular-nums whitespace-nowrap">
                      {formatearFechaHora(evento.timestamp)}
                    </span>
                  </div>
                  {evento.nota && (
                    <p className="font-display text-[11px] text-text-muted mt-0.5 italic">{evento.nota}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sección: Entregas ────────────────────────────────────────────────────────

const COLOR_ESTADO_PALLET: Record<string, string> = {
  EN_ARMADO:  "#D97706",
  ARMADO:     "#2563EB",
  CARGADO:    "#7C3AED",
  VERIFICADO: "#16A34A",
};

function SeccionEntregas({ camion, onEntregaCreada }: { camion: CamionDetalle; onEntregaCreada: (paradaId: string, entrega: EntregaResumen) => void }) {
  const router = useRouter();
  const [creando, setCreando] = useState<string | null>(null);

  async function crearEntregaFallback(paradaId: string) {
    setCreando(`fallback-${paradaId}`);
    try {
      const entrega = await crearEntregaApi({ camionId: camion.id, paradaId });
      onEntregaCreada(paradaId, entrega as unknown as EntregaResumen);
    } catch {
      toast.error("Error al crear la entrega");
    } finally {
      setCreando(null);
    }
  }

  if (!camion.paradas?.length) return null;

  const entregaPorParada = new Map((camion.entregas ?? []).map(e => [e.paradaId, e]));
  const entregasSinParada = (camion.entregas ?? []).filter(e => !e.paradaId);

  async function crearPalletEnEntrega(entrega: EntregaResumen) {
    setCreando(entrega.id);
    try {
      const pallet = await crearPalletApi({ entregaId: entrega.id });
      router.push(`/pallets/${pallet.id}`);
    } catch {
      toast.error("Error al crear el pallet");
      setCreando(null);
    }
  }

  function EntregaCard({ entrega, edificioTipo }: { entrega: EntregaResumen; edificioTipo?: string }) {
    const cfg = edificioTipo ? CONFIG_EDIFICIO[edificioTipo] : null;
    const totalPallets = entrega.pallets.length;
    const cargados = entrega.pallets.filter(p => p.estado === "CARGADO" || p.estado === "VERIFICADO").length;
    const enArmado = entrega.pallets.filter(p => p.estado === "EN_ARMADO").length;

    return (
      <div className="border border-bg-elevated rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated/40">
          <div className="flex items-center gap-2">
            <Package size={11} className="text-text-muted" />
            <span className="font-data text-[11px] text-text-muted tracking-widest">
              Entrega #{entrega.numero != null ? String(entrega.numero).padStart(5, '0') : entrega.id.slice(-6).toUpperCase()}
            </span>
            {cfg && (
              <span className="font-display text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
            )}
          </div>
          <button
            onClick={() => crearPalletEnEntrega(entrega)}
            disabled={creando === entrega.id}
            className="flex items-center gap-1 px-2 py-1 rounded font-display text-[10px] text-white cursor-pointer disabled:opacity-50"
            style={{ background: "#EA580C" }}
          >
            {creando === entrega.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
            Nuevo pallet
          </button>
        </div>

        {totalPallets === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="font-display text-[11px] text-text-muted">Sin pallets aún</p>
          </div>
        ) : (
          <div className="divide-y divide-bg-elevated/50">
            <div className="flex items-center gap-4 px-3 py-2">
              <span className="font-data text-xs text-text-muted">{totalPallets} pallet{totalPallets !== 1 ? "s" : ""}</span>
              {enArmado > 0 && <span className="font-display text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#B45309" }}>{enArmado} en armado</span>}
              {cargados > 0 && <span className="font-display text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#F0FDF4", color: "#16A34A" }}>{cargados} cargados</span>}
            </div>
            {entrega.pallets.map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/pallets/${p.id}`)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated/40 transition-colors cursor-pointer"
              >
                <span className="font-data text-xs text-text-primary tracking-widest">{p.codigoUnico}</span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] font-semibold" style={{ color: COLOR_ESTADO_PALLET[p.estado] ?? "#94A3B8" }}>
                    {p.estado.replace("_", " ")}
                  </span>
                  <ExternalLink size={10} className="text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-bg-elevated rounded-xl p-4">
      <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest mb-4 flex items-center gap-2">
        <Package size={12} /> Entregas y pallets
      </h3>

      <div className="flex flex-col gap-4">
        {camion.paradas.map(parada => {
          const cfg     = CONFIG_EDIFICIO[parada.edificioTipo];
          const entrega = entregaPorParada.get(parada.id);

          return (
            <div key={parada.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-xs font-bold uppercase" style={{ color: cfg?.color }}>
                  {cfg?.label ?? parada.edificioTipo}
                </span>
                <span className="font-display text-[10px] text-text-muted">·  Parada {parada.orden}</span>
              </div>
              {entrega
                ? <EntregaCard entrega={entrega} edificioTipo={parada.edificioTipo} />
                : parada.estado === "PENDIENTE"
                  ? (
                    <div className="flex items-center gap-2 px-3 py-3 rounded-lg border border-dashed border-bg-elevated">
                      <Info size={11} className="text-text-muted shrink-0" />
                      <p className="font-display text-[11px] text-text-muted">
                        La entrega se creará automáticamente cuando se asigne el andén
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-3 rounded-lg border border-dashed border-bg-elevated">
                      <div className="flex items-center gap-2">
                        <Info size={11} className="text-text-muted shrink-0" />
                        <p className="font-display text-[11px] text-text-muted">Sin entrega registrada</p>
                      </div>
                      <button
                        onClick={() => crearEntregaFallback(parada.id)}
                        disabled={!!creando}
                        className="flex items-center gap-1 px-2 py-1 rounded font-display text-[10px] border cursor-pointer disabled:opacity-50 hover:bg-bg-elevated transition-colors"
                        style={{ borderColor: cfg?.border, color: cfg?.color }}
                      >
                        {creando === `fallback-${parada.id}` ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                        Crear entrega
                      </button>
                    </div>
                  )
              }
            </div>
          );
        })}

        {entregasSinParada.map(entrega => (
          <div key={entrega.id}>
            <p className="font-display text-xs font-bold text-text-muted uppercase mb-2">Sin punto asignado</p>
            <EntregaCard entrega={entrega} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetalleCamionPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { usuario } = useContext(AuthContext);
  const [camion, setCamion]     = useState<CamionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);


  const puedeJustificar  = !!usuario && ROLES_PUEDEN_JUSTIFICAR.includes(usuario.rol);
  const puedeReordenar   = !!usuario && ["JEFE_DESPACHO", "COORDINADOR", "SUPERVISOR"].includes(usuario.rol);

  useEffect(() => {
    obtenerCamionApi(id)
      .then(setCamion)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  function actualizarParada(paradaActualizada: ParadaExpedicion) {
    if (!camion) return;
    setCamion({
      ...camion,
      paradas: camion.paradas.map((p) =>
        p.id === paradaActualizada.id ? paradaActualizada : p
      ),
    });
  }

  if (cargando) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !camion) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle size={40} className="text-semantic-error opacity-50" />
        <p className="font-display text-text-muted">{error ?? "Camión no encontrado"}</p>
        <button onClick={() => router.back()} className="font-display text-sm text-accent hover:underline cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const atrasado =
    !!camion.horaSalidaPlanificada &&
    camion.estado !== "DESPACHADO" &&
    new Date(camion.horaSalidaPlanificada) < new Date();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary font-display text-xs uppercase tracking-wide mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} /> Volver a camiones
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Truck size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="font-data text-2xl font-bold text-text-primary tracking-widest flex items-center gap-2">
                {camion.numeroTransporte ?? camion.patente}
                {atrasado && <AlertTriangle size={16} className="text-semantic-error" />}
              </h1>
              <p className="font-display text-xs text-text-muted uppercase tracking-wide">
                {camion.numeroTransporte && <span className="mr-1">Patente: {camion.patente} ·</span>}
                {etiquetasTipo[camion.tipo] ?? camion.tipo}
                {(camion.cliente?.nombre || camion.pedido?.cliente?.nombre) && (
                  <> · {camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre}
                  {camion.cliente?.pais && <span className="text-text-muted"> ({camion.cliente.pais})</span>}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] ?? "neutral"}>
              {etiquetasEstado[camion.estado] ?? camion.estado}
            </Badge>
            {camion.anden && (
              <span className="font-display text-xs bg-bg-elevated text-text-muted px-2 py-1 rounded-md">
                Andén {camion.anden.codigo}
              </span>
            )}
            <button
              onClick={() => window.open(`/imprimir/camion/${camion.id}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors text-xs font-medium"
              title="Imprimir hoja de ruta"
            >
              <Printer size={14} />
              Imprimir
            </button>
            <QrCamion camionId={camion.id} numeroTransporte={camion.numeroTransporte ?? camion.patente} />
          </div>
        </div>
      </motion.div>

      {/* KPIs de tiempos */}
      <KpiTiempos camion={camion} />

      {/* Ruta de paradas */}
      <SeccionParadas
        camion={camion}
        puedeJustificar={puedeJustificar}
        puedeReordenar={puedeReordenar}
        onParadaActualizada={actualizarParada}
        onCamionActualizado={setCamion}
      />

      {/* Entregas y pallets */}
      <SeccionEntregas
        camion={camion}
        onEntregaCreada={(paradaId, entrega) => {
          setCamion(c => c ? { ...c, entregas: [...(c.entregas ?? []), { ...entrega, paradaId }] } : c);
        }}
      />

      {/* Inspecciones SAG */}
      <SeccionSAG camion={camion} />

      {/* Timeline */}
      {camion.eventos?.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Timeline eventos={camion.eventos} />
        </motion.div>
      )}
    </div>
  );
}
