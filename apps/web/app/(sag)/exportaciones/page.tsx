"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Truck, Shield, CheckCircle2, XCircle, Clock, MapPin,
  RefreshCw, Loader2, X, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketCamiones } from "@/hooks/use-socket";
import { cambiarEstadoCamionApi, type Camion } from "@/lib/api";
import { etiquetasTipo } from "@/lib/camion-config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Modal de rechazo ─────────────────────────────────────────────────────────

interface ModalRechazoProps {
  camion: Camion;
  onCerrar: () => void;
  onRechazado: () => void;
}

function ModalRechazo({ camion, onCerrar, onRechazado }: ModalRechazoProps) {
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando]           = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const numeroCamion = camion.numeroTransporte ?? camion.patente;

  async function confirmarRechazo() {
    if (!observaciones.trim()) {
      setError("Las observaciones son obligatorias para rechazar");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await cambiarEstadoCamionApi(camion.id, "sag/rechazar", {
        observaciones: observaciones.trim(),
      });
      toast.error(`Camión ${numeroCamion} rechazado por SAG`);
      onRechazado();
    } catch (e: any) {
      toast.error(e.message || "Error al rechazar camión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCerrar}
      />

      {/* Contenido modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-bg-surface border border-bg-elevated rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-elevated bg-[#FFF1F2]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center">
              <XCircle size={15} color="#DC2626" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[#DC2626]">
                Rechazar Inspección SAG
              </p>
              <p className="font-data text-[10px] text-[#DC2626]/70 tracking-widest">
                {numeroCamion}
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-7 h-7 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body modal */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg">
            <AlertTriangle size={13} color="#B45309" className="mt-0.5 shrink-0" />
            <p className="font-display text-[11px] text-[#B45309] leading-relaxed">
              Esta acción marca el camión como <strong>RECHAZADO_SAG</strong>. Las observaciones
              quedarán registradas en el historial.
            </p>
          </div>

          <label className="block">
            <span className="font-display text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
              Observaciones del rechazo <span className="text-semantic-error">*</span>
            </span>
            <textarea
              rows={4}
              placeholder="Describe el motivo del rechazo…"
              value={observaciones}
              onChange={e => {
                setObservaciones(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl border font-display text-xs text-text-primary bg-bg-elevated placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] transition-all"
              style={{ borderColor: error ? "#DC2626" : undefined }}
            />
            {error && (
              <p className="font-display text-[10px] text-semantic-error mt-1">{error}</p>
            )}
          </label>
        </div>

        {/* Footer modal */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-bg-elevated">
          <button
            onClick={onCerrar}
            className="px-4 py-2.5 rounded-xl font-display text-[11px] font-semibold text-text-muted bg-bg-elevated hover:bg-bg-elevated/70 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarRechazo}
            disabled={enviando}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-display text-[11px] font-semibold text-white disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            style={{ background: enviando ? "#F87171" : "#DC2626" }}
          >
            {enviando ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <XCircle size={12} />
            )}
            {enviando ? "Rechazando…" : "Confirmar rechazo"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Card de camión ───────────────────────────────────────────────────────────

function CardCamionSAG({
  camion,
  onActualizado,
}: {
  camion: Camion;
  onActualizado: () => void;
}) {
  const [aprobando, setAprobando]               = useState(false);
  const [mostrarModalRechazo, setMostrarModal]  = useState(false);

  const numeroCamion  = camion.numeroTransporte ?? camion.patente;
  const horaLlegada   = formatearHora(camion.horaLlegadaReal ?? camion.horaLlegadaPlanificada);
  const tipoCamion    = etiquetasTipo[camion.tipo] ?? camion.tipo;

  async function aprobar() {
    setAprobando(true);
    try {
      await cambiarEstadoCamionApi(camion.id, "sag/aprobar");
      toast.success(`Camión ${numeroCamion} aprobado por SAG`);
      onActualizado();
    } catch (e: any) {
      toast.error(e.message || "Error al aprobar camión");
    } finally {
      setAprobando(false);
    }
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F3FF] border-b border-[#DDD6FE]">
          <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] border border-[#DDD6FE] flex items-center justify-center shrink-0">
            <Truck size={15} color="#7C3AED" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-data text-sm font-bold text-[#7C3AED] tracking-widest">
              {numeroCamion}
            </p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="font-display text-[10px] text-[#7C3AED]/80">
                {tipoCamion}
              </span>
              {camion.anden && (
                <div className="flex items-center gap-1">
                  <MapPin size={9} color="#7C3AED" />
                  <span className="font-display text-[10px] text-[#7C3AED]/80">
                    Andén {camion.anden.codigo}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock size={9} color="#7C3AED" />
                <span className="font-display text-[10px] text-[#7C3AED]/80">
                  Llegó {horaLlegada}
                </span>
              </div>
            </div>
          </div>
          <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] shrink-0">
            Esperando SAG
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={aprobar}
            disabled={aprobando}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-display text-[12px] font-semibold text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
            style={{ background: aprobando ? "#86EFAC" : "#16A34A" }}
          >
            {aprobando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {aprobando ? "Aprobando…" : "Aprobar"}
          </button>

          <button
            onClick={() => setMostrarModal(true)}
            disabled={aprobando}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-display text-[12px] font-semibold text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer bg-[#DC2626] hover:bg-[#B91C1C]"
          >
            <XCircle size={14} />
            Rechazar
          </button>
        </div>
      </motion.div>

      {/* Modal de rechazo */}
      <AnimatePresence>
        {mostrarModalRechazo && (
          <ModalRechazo
            camion={camion}
            onCerrar={() => setMostrarModal(false)}
            onRechazado={() => {
              setMostrarModal(false);
              onActualizado();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function ExportacionesPage() {
  const { camiones, cargando, recargar } = useCamiones({
    estado: "ESPERANDO_SAG",
    porPagina: 100,
  });

  const handleActualizado = useCallback(async () => {
    await recargar();
  }, [recargar]);

  useSocketCamiones(handleActualizado);

  const totalCamiones = camiones.length;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-bg-primary pt-1 pb-3 border-b border-bg-elevated">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#7C3AED]" />
            <h1 className="font-display text-base font-bold text-text-primary uppercase tracking-wide">
              Inspección SAG
            </h1>
          </div>
          <p className="font-display text-[11px] text-text-muted mt-0.5">
            {totalCamiones > 0
              ? `${totalCamiones} camión${totalCamiones !== 1 ? "es" : ""} esperando inspección`
              : "Sin camiones para inspeccionar"}
          </p>
        </div>

        <button
          onClick={recargar}
          disabled={cargando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-surface border border-bg-elevated font-display text-[11px] text-text-muted hover:text-text-primary hover:border-accent/30 transition-all disabled:opacity-40 cursor-pointer"
        >
          <RefreshCw size={13} className={cargando ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-bg-elevated overflow-hidden">
              <Skeleton className="h-[72px] w-full" />
              <div className="p-3">
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCamiones === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-bg-surface border border-bg-elevated rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center">
            <CheckCircle2 size={24} className="text-[#16A34A] opacity-60" />
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-text-primary">
              Sin camiones pendientes
            </p>
            <p className="font-display text-xs text-text-muted mt-1">
              Los camiones en espera SAG aparecerán aquí
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {camiones.map(camion => (
              <CardCamionSAG
                key={camion.id}
                camion={camion}
                onActualizado={recargar}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
