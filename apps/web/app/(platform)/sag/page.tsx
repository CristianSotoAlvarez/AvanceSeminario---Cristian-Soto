"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Badge, Button, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { CheckCircle, XCircle, RotateCcw, Thermometer } from "lucide-react";
import { BotonActualizar } from "@/components/boton-actualizar";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketCamiones } from "@/hooks/use-socket";
import { toast } from "sonner";
import { cambiarEstadoCamionApi } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { formatearHora } from "@/lib/formato";
import type { Camion } from "@/lib/api";

const ESTADOS_SAG = ["EN_TUNEL_FRIO", "ESPERANDO_SAG", "APROBADO_SAG", "RECHAZADO_SAG"];

const COLOR_ESTADO: Record<string, { bg: string; border: string; icon: string }> = {
  EN_TUNEL_FRIO:  { bg: "#ECFEFF", border: "#A5F3FC", icon: "#0E7490" },
  ESPERANDO_SAG:  { bg: "#FFF7ED", border: "#FED7AA", icon: "#C2410C" },
  APROBADO_SAG:   { bg: "#F0FDF4", border: "#BBF7D0", icon: "#16A34A" },
  RECHAZADO_SAG:  { bg: "#FFF1F2", border: "#FECDD3", icon: "#DC2626" },
};

function TarjetaCamionSAG({
  camion,
  onAccion,
  procesando,
  index,
}: {
  camion: Camion;
  onAccion: (camionId: string, endpoint: string) => Promise<void>;
  procesando: string | null;
  index: number;
}) {
  const colores = COLOR_ESTADO[camion.estado] ?? COLOR_ESTADO["ESPERANDO_SAG"];
  const estaProcesando = procesando === camion.id;

  return (
    <motion.div
      className="rounded-xl border-2 p-5 flex flex-col gap-4"
      style={{ borderColor: colores.border, background: colores.bg }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.06, ease: "easeOut" }}
      layout
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-data text-2xl font-bold text-text-primary tracking-widest">{camion.patente}</p>
          <p className="font-display text-sm text-text-muted uppercase tracking-wide">{etiquetasTipo[camion.tipo] || camion.tipo}</p>
        </div>
        <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
          {etiquetasEstado[camion.estado] || camion.estado}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-0.5">Cliente</p>
          <p className="font-display font-semibold text-text-primary">{camion.pedido?.cliente?.nombre || "—"}</p>
        </div>
        <div>
          <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-0.5">Andén</p>
          <p className="font-display font-semibold text-text-primary">{camion.anden?.codigo || "—"}</p>
        </div>
        <div>
          <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-0.5">Llegada plan.</p>
          <p className="font-data text-sm text-text-primary">{formatearHora(camion.horaLlegadaPlanificada)}</p>
        </div>
        {camion.horaLlegadaReal && (
          <div>
            <p className="font-display text-[10px] uppercase text-semantic-success tracking-wide mb-0.5">Llegada real</p>
            <p className="font-data text-sm text-semantic-success">{formatearHora(camion.horaLlegadaReal)}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {camion.estado === "EN_TUNEL_FRIO" && (
          <Button size="sm" className="flex-1" disabled={estaProcesando} onClick={() => onAccion(camion.id, "temperatura-ok")}>
            <Thermometer size={14} className="mr-1.5" />
            Temp. OK (-18°C)
          </Button>
        )}
        {camion.estado === "ESPERANDO_SAG" && (
          <>
            <Button size="sm" className="flex-1" disabled={estaProcesando} onClick={() => onAccion(camion.id, "aprobar-sag")} style={{ background: "#16A34A", color: "#fff" }}>
              <CheckCircle size={14} className="mr-1.5" /> Aprobar
            </Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={estaProcesando} onClick={() => onAccion(camion.id, "rechazar-sag")} style={{ borderColor: "#DC2626", color: "#DC2626" }}>
              <XCircle size={14} className="mr-1.5" /> Rechazar
            </Button>
          </>
        )}
        {camion.estado === "RECHAZADO_SAG" && (
          <Button size="sm" variant="outline" className="flex-1" disabled={estaProcesando} onClick={() => onAccion(camion.id, "reinspeccionar")}>
            <RotateCcw size={14} className="mr-1.5" /> Re-inspeccionar
          </Button>
        )}
        {camion.estado === "APROBADO_SAG" && (
          <Button size="sm" className="flex-1" disabled={estaProcesando} onClick={() => onAccion(camion.id, "listo")}>
            <CheckCircle size={14} className="mr-1.5" /> Marcar Listo
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function SagPage() {
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const { camiones, cargando, recargar } = useCamiones(filtroEstado ? { estado: filtroEstado } : undefined);
  const [procesando, setProcesando] = useState<string | null>(null);

  const camionesVisibles = filtroEstado
    ? camiones
    : camiones.filter((c) => ESTADOS_SAG.includes(c.estado));

  const handleActualizado = useCallback(() => { recargar(); }, [recargar]);
  useSocketCamiones(handleActualizado);

  const TOAST_SAG: Record<string, string> = {
    "temperatura-ok": "Temperatura OK — en inspección SAG",
    "aprobar-sag":    "Aprobado por SAG",
    "rechazar-sag":   "Rechazado por SAG",
    "reinspeccionar": "Re-inspección solicitada",
    "listo":          "Camión listo para despacho",
  };

  async function manejarAccion(camionId: string, endpoint: string) {
    setProcesando(camionId);
    try {
      await cambiarEstadoCamionApi(camionId, endpoint);
      if (TOAST_SAG[endpoint]) toast.success(TOAST_SAG[endpoint]);
      await recargar();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    } finally {
      setProcesando(null);
    }
  }

  const contadores = ESTADOS_SAG.reduce<Record<string, number>>((acc, estado) => {
    acc[estado] = camiones.filter((c) => c.estado === estado).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {ESTADOS_SAG.map((estado, i) => {
          const colores = COLOR_ESTADO[estado];
          const activo = filtroEstado === estado;
          return (
            <motion.div
              key={estado}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.07 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div
                className="rounded-xl border-2 p-4 cursor-pointer transition-all duration-150"
                style={{
                  borderColor: activo ? colores.icon : colores.border,
                  background: colores.bg,
                  boxShadow: activo ? `0 0 0 2px ${colores.icon}30` : "none",
                }}
                onClick={() => setFiltroEstado(activo ? undefined : estado)}
              >
                <p className="font-data text-3xl font-bold" style={{ color: colores.icon }}>
                  {cargando ? "—" : contadores[estado]}
                </p>
                <p className="font-display text-[11px] uppercase tracking-wide mt-1" style={{ color: colores.icon }}>
                  {etiquetasEstado[estado]}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={!filtroEstado ? "primary" : "outline"} size="sm" onClick={() => setFiltroEstado(undefined)}>Todos</Button>
          {ESTADOS_SAG.map((estado) => (
            <Button key={estado} variant={filtroEstado === estado ? "primary" : "outline"} size="sm" onClick={() => setFiltroEstado(filtroEstado === estado ? undefined : estado)}>
              {etiquetasEstado[estado]}
            </Button>
          ))}
        </div>
        <BotonActualizar onClick={recargar} disabled={cargando} />
      </div>

      {/* Grid */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : camionesVisibles.length === 0 ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-semantic-success" />
          </div>
          <p className="font-display text-text-primary font-semibold">Sin camiones pendientes de SAG</p>
          <p className="font-display text-text-muted text-sm mt-1">
            {filtroEstado ? `No hay camiones en estado ${etiquetasEstado[filtroEstado]}` : "No hay camiones en proceso de inspección"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {camionesVisibles.map((camion, i) => (
            <TarjetaCamionSAG key={camion.id} camion={camion} onAccion={manejarAccion} procesando={procesando} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
