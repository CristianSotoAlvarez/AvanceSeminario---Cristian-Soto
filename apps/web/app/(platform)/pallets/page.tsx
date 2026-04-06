"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import {
  Package, Truck, ChevronDown, ChevronRight,
  Plus, Loader2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketCamiones } from "@/hooks/use-socket";
import {
  obtenerCamionApi, crearPalletApi,
  type Camion, type CamionDetalle,
} from "@/lib/api";
import { etiquetasEstado } from "@/lib/camion-config";
import { BotonActualizar } from "@/components/boton-actualizar";

// ─── Config ────────────────────────────────────────────────────────────────────

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AVES:        { label: "Aves",        color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  CERDO:       { label: "Cerdo",       color: "#BE185D", bg: "#FFE4E6", border: "#FECDD3" },
  FRIGORIFICO: { label: "Frigorífico", color: "#0E7490", bg: "#CFFAFE", border: "#A5F3FC" },
};

const COLOR_ESTADO_PALLET: Record<string, string> = {
  EN_ARMADO:  "#D97706",
  ARMADO:     "#2563EB",
  CARGADO:    "#7C3AED",
  VERIFICADO: "#16A34A",
};

const ETIQUETA_ESTADO_PALLET: Record<string, string> = {
  EN_ARMADO:  "En armado",
  ARMADO:     "Armado",
  CARGADO:    "Cargado",
  VERIFICADO: "Verificado",
};

const EDIFICIOS_ORDEN = ["AVES", "CERDO", "FRIGORIFICO"];

// ─── Fila de camión expandible ────────────────────────────────────────────────

function FilaCamion({ camion }: { camion: Camion }) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [detalle, setDetalle]     = useState<CamionDetalle | null>(null);
  const [cargando, setCargando]   = useState(false);
  const [creando, setCreando]     = useState<string | null>(null);

  async function toggleExpandir() {
    if (expandido) { setExpandido(false); return; }
    setExpandido(true);
    if (detalle) return; // ya cargado
    setCargando(true);
    try {
      const d = await obtenerCamionApi(camion.id);
      setDetalle(d);
    } catch {
      toast.error("Error al cargar las entregas");
      setExpandido(false);
    } finally {
      setCargando(false);
    }
  }

  async function crearPallet(entregaId: string) {
    setCreando(entregaId);
    try {
      const pallet = await crearPalletApi({ entregaId });
      router.push(`/pallets/${pallet.id}`);
    } catch (e: any) {
      toast.error(e.message || "Error al crear pallet");
      setCreando(null);
    }
  }

  const colorEstado = TRUCK_STATE_COLOR[camion.estado as TruckState] ?? "neutral";
  const coloresEstado: Record<string, { text: string; bg: string }> = {
    blue:   { text: "#2563EB", bg: "#EFF6FF" },
    green:  { text: "#16A34A", bg: "#F0FDF4" },
    yellow: { text: "#D97706", bg: "#FEF3C7" },
    red:    { text: "#DC2626", bg: "#FFF1F2" },
    purple: { text: "#7C3AED", bg: "#F5F3FF" },
    neutral:{ text: "#64748B", bg: "#F8FAFC" },
    teal:   { text: "#0E7490", bg: "#ECFEFF" },
    navy:   { text: "#1E3A8A", bg: "#EFF6FF" },
    amber:  { text: "#B45309", bg: "#FEF3C7" },
    gray:   { text: "#64748B", bg: "#F8FAFC" },
  };
  const estadoColor = coloresEstado[colorEstado] ?? coloresEstado.neutral;

  return (
    <div className="border-b border-bg-elevated last:border-b-0">
      {/* Fila principal */}
      <button
        onClick={toggleExpandir}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated/50 transition-colors text-left cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-bg-elevated">
          <Truck size={13} className="text-text-muted" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-data text-sm font-bold text-text-primary tracking-widest">
              {camion.numeroTransporte ?? camion.patente}
            </span>
            {(camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre) && (
              <span className="font-display text-[11px] text-text-muted font-medium">
                {camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre}
              </span>
            )}
            {camion.anden && (
              <span className="font-display text-[10px] text-text-muted">
                Andén {camion.anden.codigo}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {camion.paradas.map(p => {
              const cfg = CONFIG_EDIFICIO[p.edificioTipo];
              return cfg ? (
                <span
                  key={p.id}
                  className="font-display text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.label}
                </span>
              ) : null;
            })}
          </div>
        </div>

        <span
          className="font-display text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
          style={{ background: estadoColor.bg, color: estadoColor.text }}
        >
          {etiquetasEstado[camion.estado] ?? camion.estado}
        </span>

        <motion.div animate={{ rotate: expandido ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight size={14} className="text-text-muted shrink-0" />
        </motion.div>
      </button>

      {/* Detalle expandido */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 bg-bg-elevated/30 border-t border-bg-elevated">
              {cargando ? (
                <div className="py-3 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !detalle ? null : detalle.paradas.length === 0 ? (
                <p className="font-display text-xs text-text-muted py-3">Sin paradas registradas</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {detalle.paradas.map(parada => {
                    const cfg    = CONFIG_EDIFICIO[parada.edificioTipo];
                    const entrega = detalle.entregas.find(e => e.paradaId === parada.id);

                    return (
                      <div key={parada.id} className="rounded-lg border border-bg-elevated overflow-hidden">
                        {/* Header entrega */}
                        <div
                          className="flex items-center justify-between px-3 py-2"
                          style={{ background: cfg?.bg ?? "#F8FAFC" }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="font-display text-[11px] font-bold uppercase tracking-wide"
                              style={{ color: cfg?.color ?? "#64748B" }}
                            >
                              {cfg?.label ?? parada.edificioTipo}
                            </span>
                            {entrega && (
                              <span className="font-data text-[10px] text-text-muted">
                                Entrega #{String(entrega.numero).padStart(5, "0")}
                              </span>
                            )}
                            <span
                              className="font-display text-[9px] uppercase px-1.5 py-0.5 rounded"
                              style={{
                                background: parada.estado === "COMPLETADO" ? "#F0FDF4" : parada.estado === "EN_PROCESO" ? cfg?.bg : "#F8FAFC",
                                color: parada.estado === "COMPLETADO" ? "#16A34A" : parada.estado === "EN_PROCESO" ? cfg?.color : "#94A3B8",
                                border: `1px solid ${parada.estado === "COMPLETADO" ? "#BBF7D0" : parada.estado === "EN_PROCESO" ? cfg?.border : "#E2E8F0"}`,
                              }}
                            >
                              {parada.estado === "COMPLETADO" ? "Completado" : parada.estado === "EN_PROCESO" ? "En proceso" : "Pendiente"}
                            </span>
                          </div>

                          {entrega && (
                            <button
                              onClick={() => crearPallet(entrega.id)}
                              disabled={creando === entrega.id}
                              className="flex items-center gap-1 px-2 py-1 rounded font-display text-[10px] text-white cursor-pointer disabled:opacity-50 shrink-0"
                              style={{ background: cfg?.color ?? "#2563EB" }}
                            >
                              {creando === entrega.id
                                ? <Loader2 size={10} className="animate-spin" />
                                : <Plus size={10} />
                              }
                              Nuevo pallet
                            </button>
                          )}
                        </div>

                        {/* Pallets de la entrega */}
                        {entrega ? (
                          entrega.pallets.length === 0 ? (
                            <div className="px-3 py-3 bg-bg-surface">
                              <p className="font-display text-[11px] text-text-muted">Sin pallets aún</p>
                            </div>
                          ) : (
                            <div className="bg-bg-surface divide-y divide-bg-elevated/60">
                              {entrega.pallets.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => router.push(`/pallets/${p.id}`)}
                                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated/40 transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2">
                                    <Package size={11} style={{ color: COLOR_ESTADO_PALLET[p.estado] ?? "#94A3B8" }} />
                                    <span className="font-data text-xs text-text-primary tracking-widest">
                                      {p.codigoUnico}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="font-display text-[10px] font-semibold"
                                      style={{ color: COLOR_ESTADO_PALLET[p.estado] ?? "#94A3B8" }}
                                    >
                                      {ETIQUETA_ESTADO_PALLET[p.estado] ?? p.estado}
                                    </span>
                                    <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )
                        ) : (
                          <div className="px-3 py-3 bg-bg-surface">
                            <p className="font-display text-[11px] text-text-muted italic">
                              La entrega se crea automáticamente al asignar andén
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sección por punto de expedición ─────────────────────────────────────────

function SeccionEdificio({ edificio, camiones }: { edificio: string; camiones: Camion[] }) {
  const cfg = CONFIG_EDIFICIO[edificio];
  if (!camiones.length) return null;

  return (
    <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
      {/* Header sección */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-bg-elevated"
        style={{ background: cfg.bg }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: cfg.color }}
        />
        <span
          className="font-display text-sm font-bold uppercase tracking-wide"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
        <span
          className="ml-1 font-data text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: cfg.border, color: cfg.color }}
        >
          {camiones.length}
        </span>
      </div>

      {/* Lista de camiones */}
      <div className="divide-y divide-bg-elevated">
        {camiones.map(camion => (
          <FilaCamion key={`${edificio}-${camion.id}`} camion={camion} />
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EntregasPage() {
  const { camiones, cargando, recargar } = useCamiones({ porPagina: 200 });

  const handleActualizado = useCallback(() => recargar(), [recargar]);
  useSocketCamiones(handleActualizado);

  // Agrupar camiones por edificio (un camión puede aparecer en varios)
  const camionePorEdificio: Record<string, Camion[]> = {};
  for (const edificio of EDIFICIOS_ORDEN) {
    camionePorEdificio[edificio] = camiones.filter(c =>
      c.paradas.some(p => p.edificioTipo === edificio)
    );
  }

  const totalCamiones = camiones.length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">Entregas</h1>
          <p className="font-display text-xs text-text-muted mt-0.5">
            {totalCamiones} camión{totalCamiones !== 1 ? "es" : ""} activos hoy
          </p>
        </div>
        <BotonActualizar onClick={recargar} disabled={cargando} />
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
              <Skeleton className="h-12 w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCamiones === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-bg-surface border border-bg-elevated rounded-xl">
          <Truck size={36} className="text-text-muted opacity-30" />
          <p className="font-display text-sm text-text-muted">No hay camiones activos hoy</p>
        </div>
      ) : (
        <div className="space-y-5">
          {EDIFICIOS_ORDEN.map(edificio => (
            <SeccionEdificio
              key={edificio}
              edificio={edificio}
              camiones={camionePorEdificio[edificio]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
