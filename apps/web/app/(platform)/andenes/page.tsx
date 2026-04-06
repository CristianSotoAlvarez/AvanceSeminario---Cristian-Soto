"use client";

import { useState, useMemo, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Truck, Loader2, X, Clock, Package, User, ChevronRight, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useAndenes } from "@/hooks/use-andenes";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketAndenes } from "@/hooks/use-socket";
import { BotonActualizar } from "@/components/boton-actualizar";
import { toast } from "sonner";
import { cambiarEstadoCamionApi } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo, obtenerAcciones } from "@/lib/camion-config";
import { formatearHora } from "@/lib/formato";
import type { Anden, Camion, ParadaExpedicion } from "@/lib/api";
import { AuthContext } from "@/lib/auth-context";

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; colorLight: string; bg: string; bgOcupado: string; border: string }> = {
  AVES:       { label: "Aves",       color: "#B45309", colorLight: "#F59E0B", bg: "#FFFBEB", bgOcupado: "#FEF3C7", border: "#FDE68A" },
  CERDO:      { label: "Cerdo",      color: "#BE185D", colorLight: "#EC4899", bg: "#FFF1F2", bgOcupado: "#FFE4E6", border: "#FECDD3" },
  FRIGORIFICO:{ label: "Frigorífico",color: "#0E7490", colorLight: "#06B6D4", bg: "#ECFEFF", bgOcupado: "#CFFAFE", border: "#A5F3FC" },
};

function proximaParadaPendiente(camion: Camion): ParadaExpedicion | null {
  return camion.paradas?.find((p) => p.estado === "PENDIENTE") ?? null;
}

// ─── Modal: Asignar andén (filtrado por edificio si hay paradas) ─────────────

function ModalAsignarAnden({
  camion,
  andenes,
  onCerrar,
  onAsignado,
}: {
  camion: Camion;
  andenes: Anden[];
  onCerrar: () => void;
  onAsignado: () => void;
}) {
  const proxima = proximaParadaPendiente(camion);
  // Si tiene paradas, mostrar solo andenes del edificio correcto
  const disponibles = andenes.filter((a) =>
    a.camiones.length === 0 &&
    (!proxima || a.edificio.tipo === proxima.edificioTipo),
  );

  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (!seleccionado) return;
    setEnviando(true);
    setError(null);
    try {
      await cambiarEstadoCamionApi(camion.id, "asignar", { andenId: seleccionado });
      onAsignado();
      onCerrar();
    } catch (err: any) {
      setError(err.message || "Error al asignar andén");
    } finally {
      setEnviando(false);
    }
  }

  const edifFiltro = proxima ? CONFIG_EDIFICIO[proxima.edificioTipo] : null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
    >
      <motion.div
        className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-lg p-6"
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-accent" />
            <h2 className="font-display text-h3 uppercase text-text-primary tracking-wide">Asignar Andén</h2>
          </div>
          <button onClick={onCerrar} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer" aria-label="Cerrar"><X size={20} /></button>
        </div>

        {/* Indicador de parada destino */}
        {edifFiltro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: edifFiltro.bgOcupado, border: `1px solid ${edifFiltro.border}` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: edifFiltro.color }} />
            <span className="font-display text-xs uppercase tracking-widest" style={{ color: edifFiltro.color }}>
              Próxima parada: Edificio {edifFiltro.label}
            </span>
          </div>
        )}

        {disponibles.length === 0 ? (
          <p className="text-center py-8 text-text-muted font-display">
            {edifFiltro
              ? `No hay andenes disponibles en el edificio ${edifFiltro.label}`
              : "No hay andenes disponibles"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {disponibles.map((anden) => {
              const edif = CONFIG_EDIFICIO[anden.edificio.tipo] ?? CONFIG_EDIFICIO["AVES"];
              const esSel = seleccionado === anden.id;
              return (
                <button
                  key={anden.id}
                  onClick={() => setSeleccionado(anden.id)}
                  className="flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all duration-150 cursor-pointer"
                  style={{ borderColor: esSel ? edif.color : "#E2E8F0", background: esSel ? edif.bgOcupado : "#F8FAFC" }}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center font-display font-bold text-sm text-white flex-shrink-0" style={{ background: edif.color }}>
                    {anden.codigo}
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-text-primary">Andén {anden.codigo}</p>
                    <p className="font-display text-xs text-text-muted">{edif.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-semantic-error text-sm text-center mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCerrar}>Cancelar</Button>
          <Button className="flex-1" disabled={!seleccionado || enviando} onClick={confirmar}>
            {enviando ? <><Loader2 size={14} className="mr-2 animate-spin" />Asignando...</> : "Confirmar"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sección "En Espera" ─────────────────────────────────────────────────────

function RutaParadas({ paradas }: { paradas: ParadaExpedicion[] }) {
  if (!paradas || paradas.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {paradas.map((p, i) => {
        const edif = CONFIG_EDIFICIO[p.edificioTipo];
        const done = p.estado === "COMPLETADO";
        const active = p.estado === "EN_PROCESO";
        return (
          <div key={p.id} className="flex items-center gap-1">
            {i > 0 && <ArrowRight size={10} className="text-text-muted" />}
            <span
              className="font-display text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{
                background: done ? "#F0FDF4" : active ? edif?.bgOcupado : "#F1F5F9",
                color: done ? "#16A34A" : active ? edif?.color : "#94A3B8",
                border: `1px solid ${done ? "#BBF7D0" : active ? edif?.border : "#E2E8F0"}`,
                fontWeight: active ? 700 : 400,
              }}
            >
              {done && <CheckCircle2 size={8} className="inline mr-0.5" />}
              {edif?.label ?? p.edificioTipo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tarjeta compacta de camión en espera ────────────────────────────────────

function TarjetaEspera({
  camion,
  procesando,
  onAccion,
  onAsignar,
  soloVista = false,
}: {
  camion: Camion;
  procesando: string | null;
  onAccion: (camionId: string, endpoint: string) => void;
  onAsignar: (camion: Camion) => void;
  soloVista?: boolean;
}) {
  const proxima   = proximaParadaPendiente(camion);
  const edifProx  = proxima ? CONFIG_EDIFICIO[proxima.edificioTipo] : null;
  const ocupado   = procesando === camion.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="bg-bg-surface border border-bg-elevated rounded-lg p-3 flex flex-col gap-2.5 hover:border-bg-elevated/80 hover:shadow-sm transition-all duration-150"
    >
      {/* Fila superior: patente + tipo */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-data font-bold text-sm text-text-primary tracking-widest leading-tight">{camion.numeroTransporte ?? camion.patente}</p>
          <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mt-0.5">
            {etiquetasTipo[camion.tipo] || camion.tipo}
            {(camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre) && (
              <span className="ml-1 text-text-muted/60">· {camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre}</span>
            )}
          </p>
        </div>
        {camion.horaLlegadaPlanificada && (
          <span className="font-data text-[10px] text-text-muted tabular-nums whitespace-nowrap">
            <Clock size={9} className="inline mr-0.5 opacity-60" />
            {new Date(camion.horaLlegadaPlanificada).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Ruta de paradas */}
      {(camion.paradas ?? []).length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {camion.paradas.map((p, idx) => {
            const cfg  = CONFIG_EDIFICIO[p.edificioTipo];
            const done = p.estado === "COMPLETADO";
            const active = p.estado === "EN_PROCESO";
            return (
              <span key={p.id} className="flex items-center gap-0.5">
                {idx > 0 && <ChevronRight size={8} className="text-text-muted/40" />}
                <span
                  className="font-display text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm transition-all"
                  style={{
                    background: done ? "#F1F5F9" : active ? cfg?.color : cfg?.bg ?? "#F8FAFC",
                    color:      done ? "#CBD5E1" : active ? "#fff"       : cfg?.color ?? "#64748B",
                    border:     `1px solid ${done ? "#E2E8F0" : cfg?.border ?? "#E2E8F0"}`,
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {cfg?.label ?? p.edificioTipo}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Botones de acción — ocultos para roles de solo lectura */}
      {!soloVista && camion.estado === "ESPERADO" && (
        <button
          disabled={ocupado}
          onClick={() => onAccion(camion.id, "en-porteria")}
          className="w-full mt-0.5 h-8 rounded-md font-display text-[11px] uppercase tracking-wider font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ background: "#1E3A8A", color: "#fff" }}
        >
          {ocupado ? <Loader2 size={11} className="animate-spin" /> : <Truck size={11} />}
          Marcar Llegada
        </button>
      )}
      {!soloVista && camion.estado === "EN_PORTERIA" && (
        <button
          disabled={ocupado}
          onClick={() => onAsignar(camion)}
          className="w-full mt-0.5 h-8 rounded-md font-display text-[11px] uppercase tracking-wider font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ background: edifProx?.color ?? "#1E3A8A", color: "#fff" }}
        >
          <MapPin size={11} />
          Asignar{edifProx ? ` → ${edifProx.label}` : " Andén"}
        </button>
      )}
      {!soloVista && camion.estado === "LISTO" && (
        <button
          disabled={ocupado}
          onClick={() => onAccion(camion.id, "despachar")}
          className="w-full mt-0.5 h-8 rounded-md font-display text-[11px] uppercase tracking-wider font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ background: "#16A34A", color: "#fff" }}
        >
          {ocupado ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
          Despachar
        </button>
      )}
    </motion.div>
  );
}

// ─── Kanban de espera ─────────────────────────────────────────────────────────

const COLUMNAS_ESPERA = [
  {
    id: "ESPERADO",
    label: "Esperado",
    dot: "#94A3B8",
    headerBg: "#F8FAFC",
    headerBorder: "#E2E8F0",
    desc: "Programados, sin llegar",
  },
  {
    id: "EN_PORTERIA",
    label: "En Portería",
    dot: "#D97706",
    headerBg: "#FFFBEB",
    headerBorder: "#FDE68A",
    desc: "Llegaron, sin andén",
  },
  {
    id: "LISTO",
    label: "Listo",
    dot: "#16A34A",
    headerBg: "#F0FDF4",
    headerBorder: "#BBF7D0",
    desc: "Cargados, listos para salir",
  },
] as const;

function SeccionEnEspera({
  camiones,
  andenes,
  onAccion,
  procesando,
  estadosOptimistas,
  soloVista = false,
}: {
  camiones: Camion[];
  andenes: Anden[];
  onAccion: (camionId: string, endpoint: string, camion?: Camion) => Promise<void>;
  procesando: string | null;
  estadosOptimistas: Map<string, string>;
  soloVista?: boolean;
}) {
  const [camionParaAsignar, setCamionParaAsignar] = useState<Camion | null>(null);

  const [abierta, setAbierta] = useState(true);

  const estadoEfectivo = (c: Camion) => estadosOptimistas.get(c.id) ?? c.estado;
  const porEstado = {
    ESPERADO:    camiones.filter((c) => estadoEfectivo(c) === "ESPERADO"),
    EN_PORTERIA: camiones.filter((c) => estadoEfectivo(c) === "EN_PORTERIA"),
    LISTO:       camiones.filter((c) => estadoEfectivo(c) === "LISTO"),
  };
  const total = Object.values(porEstado).reduce((s, a) => s + a.length, 0);

  if (total === 0) return null;

  return (
    <>
      <AnimatePresence>
        {camionParaAsignar && (
          <ModalAsignarAnden
            camion={camionParaAsignar}
            andenes={andenes}
            onCerrar={() => setCamionParaAsignar(null)}
            onAsignado={() => { setCamionParaAsignar(null); onAccion("", ""); }}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {/* Encabezado sección — clicable para colapsar */}
        <button
          onClick={() => setAbierta((v) => !v)}
          className="flex items-center gap-2 mb-4 w-full text-left group cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-semantic-warning animate-pulse" />
          <h2 className="font-display text-h3 uppercase text-text-primary tracking-wide">
            Cola de Operaciones <span className="text-text-muted font-normal text-base">({total})</span>
          </h2>
          <motion.div
            animate={{ rotate: abierta ? 0 : -90 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="ml-1 text-text-muted group-hover:text-text-primary transition-colors"
          >
            <ChevronRight size={16} className="rotate-90" />
          </motion.div>
        </button>

        {/* Columnas Kanban — colapsables */}
        <AnimatePresence initial={false}>
          {abierta && (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNAS_ESPERA.map((col) => {
            const items = porEstado[col.id];
            return (
              <div key={col.id} className="flex flex-col gap-2">
                {/* Header columna */}
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{ background: col.headerBg, borderColor: col.headerBorder }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                    <span className="font-display text-[11px] uppercase tracking-widest font-semibold" style={{ color: col.dot }}>
                      {col.label}
                    </span>
                  </div>
                  <span
                    className="font-data text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: col.dot + "20", color: col.dot }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Tarjetas — scroll interno si hay muchos */}
                <div className="flex flex-col gap-2 min-h-[60px] max-h-[420px] overflow-y-auto pr-0.5 scrollbar-thin">
                  <AnimatePresence initial={false}>
                    {items.map((camion) => (
                      <TarjetaEspera
                        key={camion.id}
                        camion={camion}
                        procesando={procesando}
                        onAccion={onAccion}
                        onAsignar={(c) => setCamionParaAsignar(c)}
                        soloVista={soloVista}
                      />
                    ))}
                  </AnimatePresence>

                  {items.length === 0 && (
                    <div className="flex-1 flex items-center justify-center py-6 rounded-lg border border-dashed border-bg-elevated">
                      <span className="font-display text-[11px] text-text-muted uppercase tracking-wide">{col.desc}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ─── Panel lateral de detalle ────────────────────────────────────────────────

function PanelDetalle({
  anden,
  andenes,
  onCerrar,
  onAccion,
  procesando,
  soloVista = false,
}: {
  anden: Anden;
  andenes: Anden[];
  onCerrar: () => void;
  onAccion: (camionId: string, endpoint: string, camion?: Camion) => Promise<void>;
  procesando: boolean;
  soloVista?: boolean;
}) {
  const camion = anden.camiones[0] ?? null;
  const edif = CONFIG_EDIFICIO[anden.edificio.tipo] ?? CONFIG_EDIFICIO["AVES"];
  const acciones = camion ? obtenerAcciones(camion) : [];
  const [camionParaAsignar, setCamionParaAsignar] = useState<Camion | null>(null);

  async function manejarAccion(camionId: string, endpoint: string) {
    if (endpoint === "asignar" && camion) { setCamionParaAsignar(camion); return; }
    await onAccion(camionId, endpoint);
  }

  return (
    <>
      <AnimatePresence>
        {camionParaAsignar && (
          <ModalAsignarAnden
            camion={camionParaAsignar}
            andenes={andenes}
            onCerrar={() => setCamionParaAsignar(null)}
            onAsignado={() => { setCamionParaAsignar(null); onAccion("", ""); }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed right-0 top-0 h-full w-[380px] z-modal flex flex-col shadow-2xl"
        style={{ background: "#FFFFFF", borderLeft: `2px solid ${edif.border}` }}
        initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ background: edif.color }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
              {anden.codigo}
            </div>
            <div>
              <p className="text-white font-display font-bold text-base uppercase tracking-wide">Andén {anden.codigo}</p>
              <p className="text-white/70 font-display text-xs uppercase tracking-wider">{edif.label}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/70 hover:text-white transition-colors cursor-pointer" aria-label="Cerrar panel"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 flex items-center gap-2 border-b" style={{ borderColor: edif.border, background: edif.bgOcupado }}>
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: camion ? edif.color : "#16A34A" }}
            animate={camion ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-display text-xs uppercase tracking-widest text-text-muted">
            {camion ? "Andén ocupado" : "Andén disponible"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {camion ? (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
              <div className="rounded-xl p-5 border-2" style={{ borderColor: edif.border, background: edif.bgOcupado }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: edif.color }}>
                    <Truck size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-data text-xl font-bold text-text-primary tracking-widest">{camion.patente}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-xs text-text-muted uppercase">{etiquetasTipo[camion.tipo] || camion.tipo}</p>
                      {camion.numeroTransporte && (
                        <p className="font-data text-xs text-text-muted">· {camion.numeroTransporte}</p>
                      )}
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
                {/* Ruta de paradas */}
                {camion.paradas?.length > 0 && <div className="mt-3"><RutaParadas paradas={camion.paradas} /></div>}
              </div>

              {camion.pedido && (
                <div className="space-y-1">
                  <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5"><User size={11} /> Pedido</p>
                  <p className="font-data text-xs text-text-muted">#{camion.pedido.numero}</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5"><Clock size={11} /> Horarios</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3 border" style={{ borderColor: edif.border, background: edif.bgOcupado }}>
                    <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-1">Llegada plan.</p>
                    <p className="font-data text-sm font-bold text-text-primary">{formatearHora(camion.horaLlegadaPlanificada)}</p>
                  </div>
                  <div className="rounded-lg p-3 border" style={{ borderColor: edif.border, background: edif.bgOcupado }}>
                    <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-1">Salida plan.</p>
                    <p className="font-data text-sm font-bold text-text-primary">{camion.horaSalidaPlanificada ? formatearHora(camion.horaSalidaPlanificada) : "—"}</p>
                  </div>
                  {camion.horaLlegadaReal && (
                    <div className="rounded-lg p-3 border col-span-2" style={{ borderColor: "#BBF7D0", background: "#F0FDF4" }}>
                      <p className="font-display text-[10px] uppercase text-semantic-success tracking-wide mb-1">Llegada real</p>
                      <p className="font-data text-sm font-bold text-semantic-success">{formatearHora(camion.horaLlegadaReal)}</p>
                    </div>
                  )}
                </div>
              </div>

              {acciones.length > 0 && !soloVista && (
                <div className="space-y-2">
                  <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5"><Package size={11} /> Acciones disponibles</p>
                  {acciones.map((accion) => {
                    const esAsignar = accion.endpoint === "asignar";
                    const colorBtn =
                      accion.variante === "success" ? { background: "#16A34A", color: "#fff" } :
                      accion.variante === "danger"  ? { background: "#DC2626", color: "#fff" } :
                      accion.variante === "warning" ? { background: "#D97706", color: "#fff" } :
                      undefined;
                    return (
                      <Button
                        key={accion.endpoint}
                        className="w-full"
                        disabled={procesando}
                        style={colorBtn}
                        onClick={() => esAsignar ? setCamionParaAsignar(camion) : manejarAccion(camion.id, accion.endpoint)}
                      >
                        {procesando ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ChevronRight size={14} className="mr-2" />}
                        {accion.label}
                      </Button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: edif.bgOcupado, border: `2px dashed ${edif.border}` }}>
                <Truck size={28} style={{ color: edif.color }} />
              </div>
              <div className="text-center">
                <p className="font-display text-sm text-text-primary font-semibold">Andén libre</p>
                <p className="font-display text-xs text-text-muted mt-1">No hay camiones asignados actualmente</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Figura visual del andén ─────────────────────────────────────────────────

function FiguraAnden({ anden, seleccionado, onSeleccionar, index }: {
  anden: Anden; seleccionado: boolean; onSeleccionar: (a: Anden) => void; index: number;
}) {
  const camion = anden.camiones[0] ?? null;
  const ocupado = camion !== null;
  const edif = CONFIG_EDIFICIO[anden.edificio.tipo] ?? CONFIG_EDIFICIO["AVES"];
  const colorBorde = seleccionado ? edif.color : ocupado ? edif.colorLight : "#CBD5E1";
  const grosor = seleccionado ? 3 : 2;

  return (
    <motion.button
      onClick={() => onSeleccionar(anden)}
      className="relative flex flex-col items-stretch focus:outline-none group cursor-pointer"
      style={{ width: "100%" }}
      aria-label={`Andén ${anden.codigo}`}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
    >
      {seleccionado && <div className="absolute inset-0 pointer-events-none rounded-t-lg" style={{ boxShadow: `0 0 0 3px ${edif.color}55` }} />}

      <div className="rounded-t-lg flex items-center justify-between px-3 py-2 transition-all duration-150"
        style={{ background: ocupado ? edif.color : "#94A3B8", borderTop: `${grosor}px solid ${colorBorde}`, borderLeft: `${grosor}px solid ${colorBorde}`, borderRight: `${grosor}px solid ${colorBorde}`, borderBottom: "none" }}>
        <span className="font-display font-bold text-white text-sm tracking-widest uppercase">{anden.codigo}</span>
        {ocupado && <motion.div className="w-2 h-2 rounded-full bg-white/80" animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />}
      </div>

      <div className="flex flex-col items-center justify-center"
        style={{ background: ocupado ? edif.bgOcupado : "#FFFFFF", borderLeft: `${grosor}px solid ${colorBorde}`, borderRight: `${grosor}px solid ${colorBorde}`, borderTop: "none", borderBottom: "none", minHeight: "90px", padding: "12px 8px", transition: "background 0.2s" }}>
        {ocupado ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="w-full flex items-center justify-center rounded-md py-2" style={{ background: `${edif.color}18`, border: `1px dashed ${edif.border}` }}>
              <Truck size={22} style={{ color: edif.color }} />
            </div>
            <span className="font-data text-[11px] font-bold tracking-widest text-text-primary whitespace-nowrap">
              {camion!.numeroTransporte ?? camion!.patente}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-30">
            <Truck size={18} className="text-text-muted" />
            <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">libre</span>
          </div>
        )}
      </div>

      <div style={{ borderLeft: `${grosor}px solid ${colorBorde}`, borderRight: `${grosor}px solid ${colorBorde}`, borderBottom: `${grosor}px solid ${colorBorde}`, borderTop: "none", borderRadius: "0 0 4px 4px", overflow: "hidden" }} className="flex">
        <div className="flex-1 h-4" style={{ background: ocupado ? edif.color : "#94A3B8", opacity: 0.7 }} />
        <div className="h-4" style={{ width: "40%", background: "#F1F5F9" }} />
        <div className="flex-1 h-4" style={{ background: ocupado ? edif.color : "#94A3B8", opacity: 0.7 }} />
      </div>
      <div className="flex justify-center mt-1 opacity-40">
        <div className="w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `7px solid ${ocupado ? edif.color : "#94A3B8"}` }} />
      </div>
    </motion.button>
  );
}

// ─── Grupo por edificio ──────────────────────────────────────────────────────

function GrupoEdificio({ tipo, andenes, seleccionadoId, onSeleccionar, groupIndex }: {
  tipo: string; andenes: Anden[]; seleccionadoId: string | null; onSeleccionar: (a: Anden) => void; groupIndex: number;
}) {
  const edif = CONFIG_EDIFICIO[tipo];
  if (!edif || andenes.length === 0) return null;
  const ocupados = andenes.filter((a) => a.camiones.length > 0).length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: groupIndex * 0.08, ease: "easeOut" }}>
      <div className="flex items-center gap-3 mb-5">
        <motion.div className="w-3 h-3 rounded-full" style={{ background: edif.color }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: groupIndex * 0.3 }} />
        <h2 className="font-display text-h3 uppercase text-text-primary tracking-wider">Edificio {edif.label}</h2>
        <span className="font-display text-sm text-text-muted">{ocupados}/{andenes.length} andenes ocupados</span>
        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: edif.color }}
            initial={{ width: "0%" }} animate={{ width: `${(ocupados / andenes.length) * 100}%` }}
            transition={{ duration: 0.6, delay: groupIndex * 0.1 + 0.2, ease: "easeOut" }} />
        </div>
      </div>
      <div className="rounded-xl p-5" style={{ background: edif.bg, border: `2px solid ${edif.border}` }}>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${andenes.length}, 1fr)` }}>
          {andenes.map((anden, i) => (
            <FiguraAnden key={anden.id} anden={anden} seleccionado={seleccionadoId === anden.id} onSeleccionar={onSeleccionar} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AndenesPage() {
  const { usuario } = useContext(AuthContext);
  // COORDINADOR_TRANSPORTE solo puede visualizar — no ejecutar acciones
  const soloVista = usuario?.rol === "COORDINADOR_TRANSPORTE";

  const { andenes, cargando, recargar: recargarAndenes } = useAndenes();
  const { camiones, recargar: recargarCamiones } = useCamiones();
  const [andenSeleccionadoId, setAndenSeleccionadoId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  // Mapa de estado optimista: id → estado local mientras la API confirma
  const [estadosOptimistas, setEstadosOptimistas] = useState<Map<string, string>>(new Map());

  const recargar = useCallback(() => {
    recargarAndenes();
    recargarCamiones();
    // Limpiar estados optimistas — la data real ya llegó
    setEstadosOptimistas(new Map());
  }, [recargarAndenes, recargarCamiones]);

  const handleActualizado = useCallback(() => { recargar(); }, [recargar]);
  useSocketAndenes(handleActualizado);

  const andenSeleccionado = useMemo(() => andenes.find((a) => a.id === andenSeleccionadoId) ?? null, [andenes, andenSeleccionadoId]);
  const grupos = useMemo(() => ({
    AVES: andenes.filter((a) => a.edificio.tipo === "AVES"),
    CERDO: andenes.filter((a) => a.edificio.tipo === "CERDO"),
    FRIGORIFICO: andenes.filter((a) => a.edificio.tipo === "FRIGORIFICO"),
  }), [andenes]);
  const totalOcupados = useMemo(() => andenes.filter((a) => a.camiones.length > 0).length, [andenes]);

  const seleccionarAnden = useCallback((anden: Anden) => {
    setAndenSeleccionadoId((prev) => (prev === anden.id ? null : anden.id));
  }, []);

  // Estado al que transiciona cada endpoint (para actualización optimista)
  const ESTADO_SIGUIENTE: Record<string, string> = {
    "en-porteria":    "EN_PORTERIA",
    "asignar":        "ASIGNADO",
    "iniciar-carga":  "EN_CARGA",
    "finalizar-carga":"EN_PORTERIA",
    "temperatura-ok": "ESPERANDO_SAG",
    "aprobar-sag":    "APROBADO_SAG",
    "rechazar-sag":   "RECHAZADO_SAG",
    "reinspeccionar": "ESPERANDO_SAG",
    "listo":          "LISTO",
    "despachar":      "DESPACHADO",
  };

  const TOAST_EXITO: Record<string, string> = {
    "en-porteria":    "Llegada registrada",
    "asignar":        "Andén asignado",
    "iniciar-carga":  "Carga iniciada",
    "finalizar-carga":"Carga finalizada",
    "temperatura-ok": "Temperatura OK — en inspección SAG",
    "aprobar-sag":    "Aprobado por SAG",
    "rechazar-sag":   "Rechazado por SAG",
    "reinspeccionar": "Re-inspección solicitada",
    "listo":          "Camión listo para despacho",
    "despachar":      "Camión despachado",
  };

  async function manejarAccion(camionId: string, endpoint: string) {
    if (!camionId || !endpoint) { await recargar(); return; }
    setProcesando(camionId);
    const estadoSiguiente = ESTADO_SIGUIENTE[endpoint];
    if (estadoSiguiente) {
      setEstadosOptimistas((prev) => new Map(prev).set(camionId, estadoSiguiente));
    }
    try {
      await cambiarEstadoCamionApi(camionId, endpoint);
      if (TOAST_EXITO[endpoint]) toast.success(TOAST_EXITO[endpoint]);
      recargar();
    } catch (err: any) {
      setEstadosOptimistas((prev) => { const m = new Map(prev); m.delete(camionId); return m; });
      toast.error(err.message || "Error al cambiar estado");
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="space-y-8 transition-all duration-300" style={{ marginRight: andenSeleccionado ? "396px" : "0" }}>
      <AnimatePresence>
        {andenSeleccionado && (
          <PanelDetalle
            anden={andenSeleccionado}
            andenes={andenes}
            onCerrar={() => setAndenSeleccionadoId(null)}
            onAccion={manejarAccion}
            procesando={!!procesando}
            soloVista={soloVista}
          />
        )}
      </AnimatePresence>

      {/* KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          {[
            { label: "Total", value: andenes.length, color: "text-text-primary" },
            { label: "Ocupados", value: totalOcupados, color: "text-accent" },
            { label: "Libres", value: andenes.length - totalOcupados, color: "text-semantic-success" },
          ].map(({ label, value, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.07 }}>
              <p className="font-display text-label uppercase text-text-muted tracking-wide">{label}</p>
              <p className={`font-data text-kpi-lg ${color}`}>{cargando ? "—" : value}</p>
            </motion.div>
          ))}
        </div>
        <BotonActualizar onClick={recargar} disabled={cargando} />
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 flex-wrap">
        {Object.entries(CONFIG_EDIFICIO).map(([tipo, edif]) => (
          <div key={tipo} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: edif.color }} />
            <span className="font-display text-xs text-text-muted uppercase tracking-wide">{edif.label}</span>
          </div>
        ))}
        <div className="w-px h-4 bg-bg-elevated" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="font-display text-xs text-text-muted uppercase tracking-wide">Libre</span>
        </div>
        <span className="font-display text-xs text-text-muted">· Click en un andén para ver detalles</span>
      </div>

      {/* Camiones en espera */}
      <SeccionEnEspera
        camiones={camiones}
        andenes={andenes}
        onAccion={manejarAccion}
        procesando={procesando}
        estadosOptimistas={estadosOptimistas}
        soloVista={soloVista}
      />

      {/* Grupos por edificio */}
      {cargando ? (
        <div className="space-y-8">
          {[5, 3, 3].map((n, i) => (
            <div key={i}>
              <Skeleton className="h-6 w-48 mb-5" />
              <div className="rounded-xl p-5 bg-slate-100 border-2 border-slate-200">
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                  {Array.from({ length: n }).map((_, j) => <Skeleton key={j} className="h-36 w-full rounded-lg" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <GrupoEdificio tipo="AVES" andenes={grupos.AVES} seleccionadoId={andenSeleccionadoId} onSeleccionar={seleccionarAnden} groupIndex={0} />
          <GrupoEdificio tipo="CERDO" andenes={grupos.CERDO} seleccionadoId={andenSeleccionadoId} onSeleccionar={seleccionarAnden} groupIndex={1} />
          <GrupoEdificio tipo="FRIGORIFICO" andenes={grupos.FRIGORIFICO} seleccionadoId={andenSeleccionadoId} onSeleccionar={seleccionarAnden} groupIndex={2} />
        </div>
      )}
    </div>
  );
}
