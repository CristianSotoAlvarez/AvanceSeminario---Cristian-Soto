"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Truck, Thermometer, ArrowRight, Loader2, RefreshCw,
  Clock, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketCamiones } from "@/hooks/use-socket";
import { cambiarEstadoCamionApi, type Camion } from "@/lib/api";
import { QrScanner } from "@/components/qr-scanner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Card de camión en túnel ───────────────────────────────────────────────────

function CardCamionTunel({
  camion,
  onAvanzado,
}: {
  camion: Camion;
  onAvanzado: () => void;
}) {
  const [temperatura, setTemperatura] = useState("");
  const [enviando, setEnviando]       = useState(false);
  const [errorTemp, setErrorTemp]     = useState<string | null>(null);

  const horaInicio = formatearHora(camion.horaLlegadaReal);
  const numeroCamion = camion.numeroTransporte ?? camion.patente;

  async function registrarYAvanzar() {
    const tempNum = parseFloat(temperatura);
    if (isNaN(tempNum)) {
      setErrorTemp("Ingresa una temperatura válida");
      return;
    }
    setErrorTemp(null);
    setEnviando(true);
    try {
      await cambiarEstadoCamionApi(camion.id, "tunel", { temperatura: tempNum });
      toast.success(`Temperatura ${tempNum}°C registrada para ${numeroCamion}`);
      onAvanzado();
    } catch (e: any) {
      toast.error(e.message || "Error al registrar temperatura");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden"
    >
      {/* Cabecera del card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#ECFEFF] border-b border-[#A5F3FC]">
        <div className="w-9 h-9 rounded-lg bg-[#CFFAFE] border border-[#A5F3FC] flex items-center justify-center shrink-0">
          <Truck size={15} color="#0E7490" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-data text-sm font-bold text-[#0E7490] tracking-widest">
            {numeroCamion}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {camion.anden && (
              <div className="flex items-center gap-1">
                <MapPin size={9} color="#0E7490" />
                <span className="font-display text-[10px] text-[#0E7490]">
                  Andén {camion.anden.codigo}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock size={9} color="#0E7490" />
              <span className="font-display text-[10px] text-[#0E7490]">
                Ingresó {horaInicio}
              </span>
            </div>
          </div>
        </div>

        {/* Badge estado */}
        <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#CFFAFE] text-[#0E7490] border border-[#A5F3FC] shrink-0">
          En Carga
        </span>
      </div>

      {/* Formulario temperatura */}
      <div className="px-4 py-4 space-y-3">
        <label className="block">
          <span className="font-display text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
            Temperatura registrada
          </span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Thermometer
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="number"
                step="0.1"
                placeholder="-18.0"
                value={temperatura}
                onChange={e => {
                  setTemperatura(e.target.value);
                  setErrorTemp(null);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") registrarYAvanzar();
                }}
                className="w-full pl-9 pr-10 py-3 rounded-xl border font-data text-sm text-text-primary bg-bg-elevated placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-all"
                style={{
                  borderColor: errorTemp ? "#DC2626" : undefined,
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-[11px] text-text-muted">
                °C
              </span>
            </div>

            <button
              onClick={registrarYAvanzar}
              disabled={enviando || !temperatura}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-display text-[11px] font-semibold text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer shrink-0"
              style={{ background: enviando ? "#67E8F9" : "#0E7490" }}
            >
              {enviando ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ArrowRight size={13} />
              )}
              {enviando ? "Registrando…" : "Registrar y avanzar"}
            </button>
          </div>

          {errorTemp && (
            <p className="font-display text-[10px] text-semantic-error mt-1">{errorTemp}</p>
          )}
        </label>
      </div>
    </motion.div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function TunelPage() {
  const { camiones, cargando, recargar } = useCamiones({
    estado: "EN_CARGA",
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
          <h1 className="font-display text-base font-bold text-text-primary uppercase tracking-wide">
            Túnel Frío
          </h1>
          <p className="font-display text-[11px] text-text-muted mt-0.5">
            {totalCamiones > 0
              ? `${totalCamiones} camión${totalCamiones !== 1 ? "es" : ""} en carga`
              : "Sin camiones en carga"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <QrScanner label="Escanear QR" />
          <button
            onClick={recargar}
            disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-surface border border-bg-elevated font-display text-[11px] text-text-muted hover:text-text-primary hover:border-accent/30 transition-all disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw size={13} className={cargando ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-bg-elevated overflow-hidden">
              <Skeleton className="h-[72px] w-full" />
              <div className="p-4">
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCamiones === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-bg-surface border border-bg-elevated rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center">
            <Thermometer size={24} className="text-text-muted opacity-40" />
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-text-primary">
              Sin camiones en carga
            </p>
            <p className="font-display text-xs text-text-muted mt-1">
              Los camiones en carga aparecerán aquí automáticamente
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {camiones.map(camion => (
              <CardCamionTunel
                key={camion.id}
                camion={camion}
                onAvanzado={recargar}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
