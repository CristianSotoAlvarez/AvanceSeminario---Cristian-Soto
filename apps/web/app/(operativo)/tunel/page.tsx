"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Truck, Thermometer, ArrowRight, Loader2, RefreshCw,
  Clock, MapPin, Snowflake, X,
} from "lucide-react";
import { toast } from "sonner";
import { useCamiones } from "@/hooks/use-camiones";
import { useTuneles } from "@/hooks/use-tuneles";
import { useSocketCamiones, useSocketTuneles } from "@/hooks/use-socket";
import { cambiarEstadoCamionApi, ingresarTunelApi, type Camion, type TunelFrio } from "@/lib/api";
import { QrScanner } from "@/components/qr-scanner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Card: camión en carga listo para pasar a túnel ──────────────────────────

function CardFinalizarCarga({ camion, onAvanzado }: { camion: Camion; onAvanzado: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const numeroCamion = camion.numeroTransporte ?? camion.patente;

  async function finalizarCarga() {
    setEnviando(true);
    try {
      await cambiarEstadoCamionApi(camion.id, "finalizar-carga");
      toast.success(`${numeroCamion} pasó a túnel de frío`);
      onAvanzado();
    } catch (e: any) {
      toast.error(e.message || "Error al finalizar carga");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-[#FFFBEB] border-b border-[#FDE68A]">
        <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center shrink-0">
          <Truck size={15} color="#B45309" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-data text-sm font-bold text-[#B45309] tracking-widest">{numeroCamion}</p>
          {camion.anden && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={9} color="#B45309" />
              <span className="font-display text-[10px] text-[#B45309]">Andén {camion.anden.codigo}</span>
            </div>
          )}
        </div>
        <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] shrink-0">
          En Carga
        </span>
      </div>
      <div className="px-4 py-4">
        <button
          onClick={finalizarCarga}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display text-[11px] font-semibold text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
          style={{ background: enviando ? "#FCD34D" : "#B45309" }}
        >
          {enviando ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
          {enviando ? "Finalizando…" : "Finalizar carga → Túnel de frío"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Modal: elegir túnel disponible ───────────────────────────────────────────

function ModalIngresarTunel({ camion, tuneles, onCerrar, onIngresado }: {
  camion: Camion; tuneles: TunelFrio[]; onCerrar: () => void; onIngresado: () => void;
}) {
  const disponibles = tuneles.filter((t) => !t.fueraDeServicio && t.camiones.length === 0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if (!seleccionado) return;
    setEnviando(true);
    try {
      await ingresarTunelApi(camion.id, seleccionado);
      toast.success(`${camion.numeroTransporte ?? camion.patente} ingresó al túnel`);
      onIngresado();
      onCerrar();
    } catch (e: any) {
      toast.error(e.message || "Error al ingresar al túnel");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center px-4" style={{ zIndex: 9999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
    >
      <motion.div
        className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-sm p-5"
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-sm font-bold uppercase text-text-primary">Elegir túnel</p>
          <button onClick={onCerrar} className="text-text-muted cursor-pointer"><X size={18} /></button>
        </div>
        {disponibles.length === 0 ? (
          <p className="text-center py-6 text-text-muted font-display text-sm">No hay túneles disponibles</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {disponibles.map((t) => (
              <button
                key={t.id}
                onClick={() => setSeleccionado(t.id)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer"
                style={{ borderColor: seleccionado === t.id ? "#0E7490" : "#E2E8F0", background: seleccionado === t.id ? "#CFFAFE" : "#F8FAFC" }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center font-display font-bold text-xs text-white" style={{ background: "#0E7490" }}>
                  {t.codigo}
                </div>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={confirmar}
          disabled={!seleccionado || enviando}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display text-[11px] font-semibold text-white disabled:opacity-50 cursor-pointer"
          style={{ background: "#0E7490" }}
        >
          {enviando ? <Loader2 size={13} className="animate-spin" /> : null}
          {enviando ? "Ingresando…" : "Confirmar ingreso"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Card: camión en túnel esperando ingresar a un túnel específico ──────────

function CardEsperandoIngreso({ camion, onIngresar }: { camion: Camion; onIngresar: (c: Camion) => void }) {
  const numeroCamion = camion.numeroTransporte ?? camion.patente;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-[#CFFAFE] border border-[#A5F3FC] flex items-center justify-center shrink-0">
          <Snowflake size={15} color="#0E7490" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-data text-sm font-bold text-[#0E7490] tracking-widest">{numeroCamion}</p>
          <p className="font-display text-[10px] text-text-muted">Esperando túnel disponible</p>
        </div>
        <button
          onClick={() => onIngresar(camion)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-display text-[11px] uppercase tracking-wider font-semibold text-white cursor-pointer shrink-0"
          style={{ background: "#0E7490" }}
        >
          <MapPin size={12} /> Ingresar
        </button>
      </div>
    </motion.div>
  );
}

// ─── Card: camión en túnel con temperatura por registrar ─────────────────────

function CardCamionTunel({ camion, onAvanzado }: { camion: Camion; onAvanzado: () => void }) {
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
      await cambiarEstadoCamionApi(camion.id, "temperatura-ok", { temperatura: tempNum });
      toast.success(`Temperatura ${tempNum}°C registrada para ${numeroCamion} — sale del túnel ${camion.tunel?.codigo ?? ""}`);
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
      <div className="flex items-center gap-3 px-4 py-3 bg-[#ECFEFF] border-b border-[#A5F3FC]">
        <div className="w-9 h-9 rounded-lg bg-[#CFFAFE] border border-[#A5F3FC] flex items-center justify-center shrink-0">
          <Truck size={15} color="#0E7490" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-data text-sm font-bold text-[#0E7490] tracking-widest">{numeroCamion}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {camion.tunel && (
              <div className="flex items-center gap-1">
                <Snowflake size={9} color="#0E7490" />
                <span className="font-display text-[10px] text-[#0E7490]">Túnel {camion.tunel.codigo}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock size={9} color="#0E7490" />
              <span className="font-display text-[10px] text-[#0E7490]">Ingresó {horaInicio}</span>
            </div>
          </div>
        </div>
        <span className="font-display text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#CFFAFE] text-[#0E7490] border border-[#A5F3FC] shrink-0">
          En Túnel
        </span>
      </div>

      <div className="px-4 py-4 space-y-3">
        <label className="block">
          <span className="font-display text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
            Temperatura registrada
          </span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Thermometer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                step="0.1"
                placeholder="-18.0"
                value={temperatura}
                onChange={e => { setTemperatura(e.target.value); setErrorTemp(null); }}
                onKeyDown={e => { if (e.key === "Enter") registrarYAvanzar(); }}
                className="w-full pl-9 pr-10 py-3 rounded-xl border font-data text-sm text-text-primary bg-bg-elevated placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-all"
                style={{ borderColor: errorTemp ? "#DC2626" : undefined }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-[11px] text-text-muted">°C</span>
            </div>

            <button
              onClick={registrarYAvanzar}
              disabled={enviando || !temperatura}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-display text-[11px] font-semibold text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer shrink-0"
              style={{ background: enviando ? "#67E8F9" : "#0E7490" }}
            >
              {enviando ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              {enviando ? "Registrando…" : "Registrar y salir"}
            </button>
          </div>

          {errorTemp && <p className="font-display text-[10px] text-semantic-error mt-1">{errorTemp}</p>}
        </label>
      </div>
    </motion.div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function TunelPage() {
  const { camiones: camionesEnCarga, cargando: cargandoCarga, recargar: recargarCarga } = useCamiones({
    estado: "EN_CARGA",
    porPagina: 100,
  });
  const { camiones: camionesEnTunel, cargando: cargandoTunel, recargar: recargarTunel } = useCamiones({
    estado: "EN_TUNEL_FRIO",
    porPagina: 100,
  });
  const { tuneles, recargar: recargarTuneles } = useTuneles();
  const [camionParaIngresar, setCamionParaIngresar] = useState<Camion | null>(null);

  const recargar = useCallback(async () => {
    await Promise.all([recargarCarga(), recargarTunel(), recargarTuneles()]);
  }, [recargarCarga, recargarTunel, recargarTuneles]);

  useSocketCamiones(recargar);
  useSocketTuneles(recargar);

  const esperandoIngreso = camionesEnTunel.filter((c) => !c.tunelId);
  const enTunelConAsignacion = camionesEnTunel.filter((c) => c.tunelId);
  const cargando = cargandoCarga || cargandoTunel;
  const total = camionesEnCarga.length + camionesEnTunel.length;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      <AnimatePresence>
        {camionParaIngresar && (
          <ModalIngresarTunel
            camion={camionParaIngresar}
            tuneles={tuneles}
            onCerrar={() => setCamionParaIngresar(null)}
            onIngresado={recargar}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-bg-primary pt-1 pb-3 border-b border-bg-elevated">
        <div>
          <h1 className="font-display text-base font-bold text-text-primary uppercase tracking-wide">
            Túnel Frío
          </h1>
          <p className="font-display text-[11px] text-text-muted mt-0.5">
            {total > 0 ? `${total} camión${total !== 1 ? "es" : ""} en flujo` : "Sin camiones en flujo"}
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
              <div className="p-4"><Skeleton className="h-12 w-full rounded-xl" /></div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-bg-surface border border-bg-elevated rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center">
            <Thermometer size={24} className="text-text-muted opacity-40" />
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-text-primary">Sin camiones en flujo</p>
            <p className="font-display text-xs text-text-muted mt-1">
              Los camiones en carga o en túnel aparecerán aquí automáticamente
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {camionesEnCarga.length > 0 && (
            <div className="space-y-3">
              <p className="font-display text-[11px] uppercase tracking-widest text-text-muted font-semibold">
                En carga → listos para túnel ({camionesEnCarga.length})
              </p>
              <AnimatePresence>
                {camionesEnCarga.map(camion => (
                  <CardFinalizarCarga key={camion.id} camion={camion} onAvanzado={recargar} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {esperandoIngreso.length > 0 && (
            <div className="space-y-3">
              <p className="font-display text-[11px] uppercase tracking-widest text-text-muted font-semibold">
                Esperando ingresar a túnel ({esperandoIngreso.length})
              </p>
              <AnimatePresence>
                {esperandoIngreso.map(camion => (
                  <CardEsperandoIngreso key={camion.id} camion={camion} onIngresar={setCamionParaIngresar} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {enTunelConAsignacion.length > 0 && (
            <div className="space-y-3">
              <p className="font-display text-[11px] uppercase tracking-widest text-text-muted font-semibold">
                En túnel — registrar temperatura de salida ({enTunelConAsignacion.length})
              </p>
              <AnimatePresence>
                {enTunelConAsignacion.map(camion => (
                  <CardCamionTunel key={camion.id} camion={camion} onAvanzado={recargar} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
