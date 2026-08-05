"use client";

import { useState, useMemo, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Truck, Loader2, X, Clock, Wrench, AlertTriangle, CheckCircle2, Snowflake, MapPin } from "lucide-react";
import { Button, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useTuneles } from "@/hooks/use-tuneles";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketTuneles } from "@/hooks/use-socket";
import { BotonActualizar } from "@/components/boton-actualizar";
import { toast } from "sonner";
import { ingresarTunelApi, marcarTunelFueraServicioApi, reactivarTunelApi } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { formatearHora } from "@/lib/formato";
import type { TunelFrio, Camion } from "@/lib/api";
import { AuthContext } from "@/lib/auth-context";

const COLOR = { main: "#0E7490", light: "#06B6D4", bg: "#ECFEFF", bgOcupado: "#CFFAFE", border: "#A5F3FC" };

function formatHoraCorta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

// ─── Modal: motivo fuera de servicio ─────────────────────────────────────────

function ModalFueraServicio({ tunel, onCerrar, onConfirmado }: { tunel: TunelFrio; onCerrar: () => void; onConfirmado: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (motivo.trim().length < 3) { setError("El motivo debe tener al menos 3 caracteres"); return; }
    setEnviando(true);
    setError(null);
    try {
      await marcarTunelFueraServicioApi(tunel.id, motivo.trim());
      toast.success(`Túnel ${tunel.codigo} marcado fuera de servicio`);
      onConfirmado();
      onCerrar();
    } catch (err: any) {
      setError(err.message || "Error al marcar fuera de servicio");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      onClick={onCerrar}
    >
      <motion.div
        className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md p-6"
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-semantic-error" />
          <h2 className="font-display text-h3 uppercase text-text-primary tracking-wide">Túnel {tunel.codigo} fuera de servicio</h2>
          <button onClick={onCerrar} className="ml-auto text-text-muted hover:text-text-primary cursor-pointer" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <label className="font-display text-xs uppercase tracking-widest text-text-muted">Motivo</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Falla en el sistema de sellado térmico, requiere mantención."
          rows={3}
          className="mt-1 w-full bg-bg-elevated/40 border border-bg-elevated rounded-md px-3 py-2 text-sm font-display text-text-primary outline-none focus:border-accent/40"
          autoFocus
        />
        {error && <p className="text-semantic-error text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCerrar}>Cancelar</Button>
          <Button className="flex-1" disabled={enviando} onClick={confirmar} style={{ background: "#DC2626", color: "#fff" }}>
            {enviando ? <><Loader2 size={14} className="mr-2 animate-spin" />Marcando...</> : "Confirmar"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Modal: ingresar camión a un túnel disponible ────────────────────────────

function ModalIngresarTunel({ camion, tuneles, onCerrar, onIngresado }: {
  camion: Camion; tuneles: TunelFrio[]; onCerrar: () => void; onIngresado: () => void;
}) {
  const disponibles = tuneles.filter((t) => !t.fueraDeServicio && t.camiones.length === 0);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!seleccionado) return;
    setEnviando(true);
    setError(null);
    try {
      await ingresarTunelApi(camion.id, seleccionado);
      toast.success(`${camion.numeroTransporte ?? camion.patente} ingresó al túnel`);
      onIngresado();
      onCerrar();
    } catch (err: any) {
      setError(err.message || "Error al ingresar al túnel");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
    >
      <motion.div
        className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-lg p-6"
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Snowflake size={18} className="text-accent" />
            <h2 className="font-display text-h3 uppercase text-text-primary tracking-wide">Ingresar a túnel — {camion.numeroTransporte ?? camion.patente}</h2>
          </div>
          <button onClick={onCerrar} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer" aria-label="Cerrar"><X size={20} /></button>
        </div>

        {disponibles.length === 0 ? (
          <p className="text-center py-8 text-text-muted font-display">No hay túneles disponibles en este momento</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {disponibles.map((t) => {
              const esSel = seleccionado === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSeleccionado(t.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer"
                  style={{ borderColor: esSel ? COLOR.main : "#E2E8F0", background: esSel ? COLOR.bgOcupado : "#F8FAFC" }}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center font-display font-bold text-sm text-white" style={{ background: COLOR.main }}>
                    {t.codigo}
                  </div>
                  <p className="font-display text-xs text-text-muted">Disponible</p>
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-semantic-error text-sm text-center mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCerrar}>Cancelar</Button>
          <Button className="flex-1" disabled={!seleccionado || enviando} onClick={confirmar}>
            {enviando ? <><Loader2 size={14} className="mr-2 animate-spin" />Ingresando...</> : "Confirmar ingreso"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Panel de detalle ────────────────────────────────────────────────────────

function PanelDetalle({ tunel, onCerrar, onCambio, puedeGestionar }: {
  tunel: TunelFrio; onCerrar: () => void; onCambio: () => void; puedeGestionar: boolean;
}) {
  const camion = tunel.camiones[0] ?? null;
  const [modalFueraServicio, setModalFueraServicio] = useState(false);
  const [reactivando, setReactivando] = useState(false);

  async function reactivar() {
    setReactivando(true);
    try {
      await reactivarTunelApi(tunel.id);
      toast.success(`Túnel ${tunel.codigo} reactivado`);
      onCambio();
    } catch (err: any) {
      toast.error(err.message || "Error al reactivar el túnel");
    } finally {
      setReactivando(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {modalFueraServicio && (
          <ModalFueraServicio tunel={tunel} onCerrar={() => setModalFueraServicio(false)} onConfirmado={onCambio} />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed right-0 top-0 h-full w-[380px] z-modal flex flex-col shadow-2xl"
        style={{ background: "#FFFFFF", borderLeft: `2px solid ${COLOR.border}` }}
        initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ background: COLOR.main }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
              {tunel.codigo}
            </div>
            <div>
              <p className="text-white font-display font-bold text-base uppercase tracking-wide">Túnel {tunel.codigo}</p>
              <p className="text-white/70 font-display text-xs uppercase tracking-wider">{tunel.edificio.nombre}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/70 hover:text-white transition-colors cursor-pointer" aria-label="Cerrar panel"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 flex items-center gap-2 border-b" style={{ borderColor: COLOR.border, background: tunel.fueraDeServicio ? "#FEF2F2" : COLOR.bgOcupado }}>
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: tunel.fueraDeServicio ? "#DC2626" : camion ? COLOR.main : "#16A34A" }}
            animate={camion && !tunel.fueraDeServicio ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-display text-xs uppercase tracking-widest" style={{ color: tunel.fueraDeServicio ? "#DC2626" : "#64748B" }}>
            {tunel.fueraDeServicio ? "Fuera de servicio" : camion ? "Túnel ocupado" : "Túnel disponible"}
          </span>
        </div>

        {puedeGestionar && (
          <div className="px-6 py-3 border-b" style={{ borderColor: COLOR.border }}>
            {tunel.fueraDeServicio ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <Wrench size={14} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-display font-semibold text-red-800">{tunel.motivoFueraServicio}</p>
                    <p className="font-display text-red-600 mt-0.5">
                      Desde {formatHoraCorta(tunel.fueraServicioDesde)}
                      {tunel.fueraServicioPor && <> · {tunel.fueraServicioPor.nombre}</>}
                    </p>
                  </div>
                </div>
                <Button className="w-full" disabled={reactivando} onClick={reactivar} style={{ background: "#16A34A", color: "#fff" }}>
                  {reactivando ? <><Loader2 size={14} className="mr-2 animate-spin" />Reactivando...</> : <><CheckCircle2 size={14} className="mr-2" />Reactivar túnel</>}
                </Button>
              </div>
            ) : camion ? (
              <button
                disabled
                title="Espera a que el camión salga del túnel antes de marcarlo fuera de servicio"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-bg-elevated text-text-muted text-xs font-display opacity-50 cursor-not-allowed"
              >
                <Wrench size={13} /> Marcar fuera de servicio
              </button>
            ) : (
              <button
                onClick={() => setModalFueraServicio(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors text-xs font-display cursor-pointer"
              >
                <Wrench size={13} /> Marcar fuera de servicio
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {camion ? (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
              <div className="rounded-xl p-5 border-2" style={{ borderColor: COLOR.border, background: COLOR.bgOcupado }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLOR.main }}>
                    <Truck size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-data text-xl font-bold text-text-primary tracking-widest">{camion.patente}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-xs text-text-muted uppercase">{etiquetasTipo[camion.tipo] || camion.tipo}</p>
                      {camion.numeroTransporte && <p className="font-data text-xs text-text-muted">· {camion.numeroTransporte}</p>}
                    </div>
                    {(camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre) && (
                      <p className="font-display text-sm font-semibold text-text-primary mt-1">
                        {camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre}
                      </p>
                    )}
                  </div>
                </div>
                <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
                  {etiquetasEstado[camion.estado] || camion.estado}
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5"><Clock size={11} /> Horarios</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 border" style={{ borderColor: COLOR.border, background: COLOR.bgOcupado }}>
                    <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-1">Llegada plan.</p>
                    <p className="font-data text-sm font-bold text-text-primary">{formatearHora(camion.horaLlegadaPlanificada)}</p>
                  </div>
                  {camion.horaLlegadaReal && (
                    <div className="rounded-lg p-3 border" style={{ borderColor: "#BBF7D0", background: "#F0FDF4" }}>
                      <p className="font-display text-[10px] uppercase text-semantic-success tracking-wide mb-1">Llegada real</p>
                      <p className="font-data text-sm font-bold text-semantic-success">{formatearHora(camion.horaLlegadaReal)}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: COLOR.bgOcupado, border: `2px dashed ${COLOR.border}` }}>
                <Snowflake size={28} style={{ color: COLOR.main }} />
              </div>
              <div className="text-center">
                <p className="font-display text-sm text-text-primary font-semibold">Túnel libre</p>
                <p className="font-display text-xs text-text-muted mt-1">No hay camiones asignados actualmente</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Figura visual del túnel ──────────────────────────────────────────────────

function FiguraTunel({ tunel, seleccionado, onSeleccionar, index }: {
  tunel: TunelFrio; seleccionado: boolean; onSeleccionar: (t: TunelFrio) => void; index: number;
}) {
  const camion = tunel.camiones[0] ?? null;
  const fueraServicio = tunel.fueraDeServicio;
  const ocupado = camion !== null;
  const colorBorde = seleccionado ? COLOR.main : fueraServicio ? "#DC2626" : ocupado ? COLOR.light : "#CBD5E1";
  const grosor = seleccionado ? 3 : 2;

  return (
    <motion.button
      onClick={() => onSeleccionar(tunel)}
      className="relative flex flex-col items-stretch focus:outline-none group cursor-pointer"
      style={{ width: "100%" }}
      aria-label={`Túnel ${tunel.codigo}`}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
    >
      {seleccionado && <div className="absolute inset-0 pointer-events-none rounded-t-lg" style={{ boxShadow: `0 0 0 3px ${COLOR.main}55` }} />}

      <div className="rounded-t-lg flex items-center justify-between px-3 py-2 transition-all duration-150"
        style={{ background: fueraServicio ? "#991B1B" : ocupado ? COLOR.main : "#94A3B8", borderTop: `${grosor}px solid ${colorBorde}`, borderLeft: `${grosor}px solid ${colorBorde}`, borderRight: `${grosor}px solid ${colorBorde}`, borderBottom: "none" }}>
        <span className="font-display font-bold text-white text-sm tracking-widest uppercase">{tunel.codigo}</span>
        {ocupado && !fueraServicio && <motion.div className="w-2 h-2 rounded-full bg-white/80" animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />}
        {fueraServicio && <Wrench size={12} className="text-white/90" />}
      </div>

      <div className="flex flex-col items-center justify-center"
        style={{ background: fueraServicio ? "#FEF2F2" : ocupado ? COLOR.bgOcupado : "#FFFFFF", borderLeft: `${grosor}px solid ${colorBorde}`, borderRight: `${grosor}px solid ${colorBorde}`, borderTop: "none", borderBottom: "none", minHeight: "90px", padding: "12px 8px", transition: "background 0.2s" }}>
        {fueraServicio ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="w-full flex items-center justify-center rounded-md py-2" style={{ background: "#FEE2E2", border: "1px dashed #FECACA" }}>
              <Wrench size={20} style={{ color: "#DC2626" }} />
            </div>
            <span className="font-display text-[9px] font-bold uppercase tracking-wider text-red-700 text-center">Fuera de servicio</span>
          </div>
        ) : ocupado ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="w-full flex items-center justify-center rounded-md py-2" style={{ background: `${COLOR.main}18`, border: `1px dashed ${COLOR.border}` }}>
              <Truck size={22} style={{ color: COLOR.main }} />
            </div>
            <span className="font-data text-[11px] font-bold tracking-widest text-text-primary whitespace-nowrap">
              {camion!.numeroTransporte ?? camion!.patente}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-30">
            <Snowflake size={18} className="text-text-muted" />
            <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">libre</span>
          </div>
        )}
      </div>

      <div style={{ borderLeft: `${grosor}px solid ${colorBorde}`, borderRight: `${grosor}px solid ${colorBorde}`, borderBottom: `${grosor}px solid ${colorBorde}`, borderTop: "none", borderRadius: "0 0 4px 4px", overflow: "hidden" }} className="flex">
        <div className="flex-1 h-4" style={{ background: ocupado ? COLOR.main : "#94A3B8", opacity: 0.7 }} />
        <div className="h-4" style={{ width: "40%", background: "#F1F5F9" }} />
        <div className="flex-1 h-4" style={{ background: ocupado ? COLOR.main : "#94A3B8", opacity: 0.7 }} />
      </div>
    </motion.button>
  );
}

// ─── Sección: camiones esperando ingresar a un túnel ─────────────────────────

function SeccionEsperandoTunel({ camiones, tuneles, onIngresar }: {
  camiones: Camion[]; tuneles: TunelFrio[]; onIngresar: () => void;
}) {
  const [camionParaIngresar, setCamionParaIngresar] = useState<Camion | null>(null);
  const sinTunel = camiones.filter((c) => c.estado === "EN_TUNEL_FRIO" && !c.tunelId);

  if (sinTunel.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {camionParaIngresar && (
          <ModalIngresarTunel
            camion={camionParaIngresar}
            tuneles={tuneles}
            onCerrar={() => setCamionParaIngresar(null)}
            onIngresado={onIngresar}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-semantic-warning animate-pulse" />
          <h2 className="font-display text-h3 uppercase text-text-primary tracking-wide">
            Esperando ingresar a túnel <span className="text-text-muted font-normal text-base">({sinTunel.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sinTunel.map((c) => (
            <div key={c.id} className="bg-bg-surface border border-bg-elevated rounded-lg p-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-data font-bold text-sm text-text-primary tracking-widest">{c.numeroTransporte ?? c.patente}</p>
                <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mt-0.5">{etiquetasTipo[c.tipo] || c.tipo}</p>
              </div>
              <button
                onClick={() => setCamionParaIngresar(c)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md font-display text-[11px] uppercase tracking-wider font-semibold text-white cursor-pointer"
                style={{ background: COLOR.main }}
              >
                <MapPin size={12} /> Ingresar
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function TunelesPage() {
  const { usuario } = useContext(AuthContext);
  const puedeGestionar = ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"].includes(usuario?.rol ?? "");

  const { tuneles, cargando, recargar: recargarTuneles } = useTuneles();
  const { camiones, recargar: recargarCamiones } = useCamiones({ estado: "EN_TUNEL_FRIO", porPagina: 100 });
  const [tunelSeleccionadoId, setTunelSeleccionadoId] = useState<string | null>(null);

  const recargar = useCallback(() => {
    recargarTuneles();
    recargarCamiones();
  }, [recargarTuneles, recargarCamiones]);

  const handleActualizado = useCallback(() => recargar(), [recargar]);
  useSocketTuneles(handleActualizado);

  const tunelSeleccionado = useMemo(() => tuneles.find((t) => t.id === tunelSeleccionadoId) ?? null, [tuneles, tunelSeleccionadoId]);
  const totalOcupados = useMemo(() => tuneles.filter((t) => t.camiones.length > 0).length, [tuneles]);
  const totalFueraServicio = useMemo(() => tuneles.filter((t) => t.fueraDeServicio).length, [tuneles]);

  const seleccionarTunel = useCallback((t: TunelFrio) => {
    setTunelSeleccionadoId((prev) => (prev === t.id ? null : t.id));
  }, []);

  return (
    <div className="space-y-8 transition-all duration-300" style={{ marginRight: tunelSeleccionado ? "396px" : "0" }}>
      <AnimatePresence>
        {tunelSeleccionado && (
          <PanelDetalle
            tunel={tunelSeleccionado}
            onCerrar={() => setTunelSeleccionadoId(null)}
            onCambio={recargar}
            puedeGestionar={puedeGestionar}
          />
        )}
      </AnimatePresence>

      {/* KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          {[
            { label: "Total", value: tuneles.length, color: "text-text-primary" },
            { label: "Ocupados", value: totalOcupados, color: "text-accent" },
            { label: "Libres", value: tuneles.length - totalOcupados - totalFueraServicio, color: "text-semantic-success" },
            { label: "Fuera de servicio", value: totalFueraServicio, color: "text-semantic-error" },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.07 }}>
              <p className="font-display text-label uppercase text-text-muted tracking-wide">{label}</p>
              <p className={`font-data text-kpi-lg ${color}`}>{cargando ? "—" : value}</p>
            </motion.div>
          ))}
        </div>
        <BotonActualizar onClick={recargar} disabled={cargando} />
      </div>

      {/* Camiones esperando ingresar */}
      <SeccionEsperandoTunel camiones={camiones} tuneles={tuneles} onIngresar={recargar} />

      {/* Grid de túneles */}
      {cargando ? (
        <div className="rounded-xl p-5 bg-slate-100 border-2 border-slate-200">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-36 w-full rounded-lg" />)}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5" style={{ background: COLOR.bg, border: `2px solid ${COLOR.border}` }}>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(tuneles.length, 1)}, 1fr)` }}>
            {tuneles.map((t, i) => (
              <FiguraTunel key={t.id} tunel={t} seleccionado={tunelSeleccionadoId === t.id} onSeleccionar={seleccionarTunel} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
