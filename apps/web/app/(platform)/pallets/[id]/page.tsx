"use client";

import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  ArrowLeft, Package, User, Truck, Clock, CheckCircle2,
  AlertTriangle, Plus, Minus, Loader2, ChevronRight, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  obtenerPalletApi, obtenerItemsEntregaApi, setItemPalletApi,
  cerrarYCrearNuevoPalletApi, cambiarEstadoPalletApi,
  type Pallet, type EntregaItem,
} from "@/lib/api";
import { useSocketCamiones } from "@/hooks/use-socket";
import { etiquetasEstadoPallet, colorEstadoPallet, bgEstadoPallet } from "@/lib/pallet-config";
import { formatearFechaHora } from "@/lib/formato";
import { AuthContext } from "@/lib/auth-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSegundos(seg: number): string {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AVES:        { label: "Aves",        color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  CERDO:       { label: "Cerdo",       color: "#BE185D", bg: "#FFE4E6", border: "#FECDD3" },
  FRIGORIFICO: { label: "Frigorífico", color: "#0E7490", bg: "#CFFAFE", border: "#A5F3FC" },
};

const SIGUIENTE_ESTADO: Record<string, string> = {
  EN_ARMADO: "ARMADO",
  ARMADO:    "CARGADO",
  CARGADO:   "VERIFICADO",
};

const ACCION_LABEL: Record<string, string> = {
  EN_ARMADO: "Marcar como Armado",
  ARMADO:    "Marcar como Cargado",
  CARGADO:   "Verificar pallet",
};

const ROLES_POR_TRANSICION: Record<string, string[]> = {
  EN_ARMADO: ["PICKINERO", "CARGADOR", "JEFE_DESPACHO", "SUPERVISOR"],
  ARMADO:    ["CARGADOR", "PICKINERO", "JEFE_DESPACHO", "SUPERVISOR"],
  CARGADO:   ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"],
};

// ─── Barra de progreso ────────────────────────────────────────────────────────

function BarraProgreso({ valor, maximo, color }: { valor: number; maximo: number; color: string }) {
  const pct = maximo > 0 ? Math.min((valor / maximo) * 100, 100) : 0;
  const completo = valor >= maximo && maximo > 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: completo ? "#16A34A" : color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span className="font-data text-[10px] tabular-nums w-8 text-right" style={{ color: completo ? "#16A34A" : "#94A3B8" }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ─── Fila de picking (un producto del catálogo) ───────────────────────────────

function FilaProducto({
  item,
  cantidadEnEstePallet,
  enArmado,
  actualizando,
  onCambiar,
}: {
  item: EntregaItem;
  cantidadEnEstePallet: number;
  enArmado: boolean;
  actualizando: boolean;
  onCambiar: (delta: number) => void;
}) {
  const cfg = CONFIG_EDIFICIO["AVES"]; // fallback color for progress bar
  const completo = item.cantidadCargada >= item.cantidadSolicitada;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-4 py-3 border-b border-bg-elevated/50 last:border-b-0"
      style={{ background: completo ? "#F0FDF4" : undefined }}
    >
      {/* Fila superior: nombre + controles */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold text-text-primary truncate">{item.producto.nombre}</p>
          <p className="font-data text-[10px] text-text-muted">{item.producto.sku} · {item.producto.unidadMedida}</p>
        </div>

        {/* Controles cantidad en este pallet */}
        {enArmado ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onCambiar(-1)}
              disabled={actualizando || cantidadEnEstePallet <= 0}
              className="w-7 h-7 rounded-lg border border-bg-elevated flex items-center justify-center hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-30"
            >
              <Minus size={12} className="text-text-muted" />
            </button>
            <span className="font-data text-base font-bold text-text-primary w-8 text-center tabular-nums">
              {actualizando ? <Loader2 size={14} className="animate-spin mx-auto" /> : cantidadEnEstePallet}
            </span>
            <button
              onClick={() => onCambiar(1)}
              disabled={actualizando}
              className="w-7 h-7 rounded-lg border border-bg-elevated flex items-center justify-center hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-30"
            >
              <Plus size={12} className="text-text-muted" />
            </button>
            <span className="font-display text-[10px] text-text-muted w-14">en este</span>
          </div>
        ) : (
          <span className="font-data text-sm font-bold text-text-primary shrink-0">{cantidadEnEstePallet}</span>
        )}

        {/* Resumen total entrega */}
        <div className="text-right shrink-0 w-24">
          <span
            className="font-data text-sm font-bold tabular-nums"
            style={{ color: completo ? "#16A34A" : "#1E3A5F" }}
          >
            {item.cantidadCargada}
          </span>
          <span className="font-data text-xs text-text-muted"> / {item.cantidadSolicitada}</span>
          {completo && <CheckCircle2 size={12} className="inline ml-1 text-green-500" />}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2">
        <BarraProgreso valor={item.cantidadCargada} maximo={item.cantidadSolicitada} color="#EA580C" />
      </div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetallePalletPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { usuario } = useContext(AuthContext);

  const [pallet, setPallet]         = useState<Pallet | null>(null);
  const [itemsEntrega, setItemsEntrega] = useState<EntregaItem[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [cambiando, setCambiando]   = useState(false);
  const [cerrando, setCerrando]     = useState(false);
  const [actualizandoItem, setActualizandoItem] = useState<string | null>(null);

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const p = await obtenerPalletApi(id);
      setPallet(p);
      if (p.entrega?.id) {
        const items = await obtenerItemsEntregaApi(p.entrega.id);
        setItemsEntrega(items);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useSocketCamiones(() => cargarDatos(true));

  // Mapa productoId → cantidad en este pallet
  const cantidadEnPallet = (productoId: string): number =>
    pallet?.productos.find(p => p.productoId === productoId)?.cantidad ?? 0;

  async function cambiarCantidad(productoId: string, delta: number) {
    if (!pallet) return;
    const actual = cantidadEnPallet(productoId);
    const nueva  = Math.max(0, actual + delta);
    setActualizandoItem(productoId);
    try {
      const actualizado = await setItemPalletApi(pallet.id, productoId, nueva);
      setPallet(actualizado);
      // Refrescar progreso total
      if (actualizado.entrega?.id) {
        const items = await obtenerItemsEntregaApi(actualizado.entrega.id);
        setItemsEntrega(items);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar cantidad");
    } finally {
      setActualizandoItem(null);
    }
  }

  async function avanzarEstado() {
    if (!pallet) return;
    const siguiente = SIGUIENTE_ESTADO[pallet.estado];
    if (!siguiente) return;
    setCambiando(true);
    try {
      const actualizado = await cambiarEstadoPalletApi(pallet.id, siguiente);
      setPallet(actualizado);
      toast.success(`Pallet marcado como ${etiquetasEstadoPallet[siguiente]}`);
    } catch (e: any) {
      toast.error(e.message || "Error al cambiar estado");
    } finally {
      setCambiando(false);
    }
  }

  async function cerrarYCrearNuevo() {
    if (!pallet) return;
    setCerrando(true);
    try {
      const nuevo = await cerrarYCrearNuevoPalletApi(pallet.id);
      toast.success("Pallet cerrado. Nuevo pallet listo.");
      router.replace(`/pallets/${nuevo.id}`);
    } catch (e: any) {
      toast.error(e.message || "Error al cerrar pallet");
      setCerrando(false);
    }
  }

  if (cargando) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !pallet) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle size={40} className="text-semantic-error opacity-50" />
        <p className="font-display text-text-muted">{error ?? "Pallet no encontrado"}</p>
        <button onClick={() => router.back()} className="font-display text-sm text-accent hover:underline cursor-pointer">Volver</button>
      </div>
    );
  }

  const enArmado       = pallet.estado === "EN_ARMADO";
  const siguienteEstado = SIGUIENTE_ESTADO[pallet.estado];
  const puedeAvanzar   = siguienteEstado && usuario && ROLES_POR_TRANSICION[pallet.estado]?.includes(usuario.rol);
  const edificio       = pallet.entrega?.parada?.edificioTipo;
  const cfgEdificio    = edificio ? CONFIG_EDIFICIO[edificio] : null;
  const totalCargado   = itemsEntrega.reduce((s, i) => s + i.cantidadCargada, 0);
  const totalSolicitado = itemsEntrega.reduce((s, i) => s + i.cantidadSolicitada, 0);
  const pedidoCompleto = totalSolicitado > 0 && totalCargado >= totalSolicitado;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary font-display text-xs uppercase tracking-wide mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} /> Volver
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: cfgEdificio?.bg ?? bgEstadoPallet[pallet.estado] ?? "#F8FAFC" }}>
              <Package size={20} style={{ color: cfgEdificio?.color ?? colorEstadoPallet[pallet.estado] ?? "#94A3B8" }} />
            </div>
            <div>
              <h1 className="font-data text-2xl font-bold text-text-primary tracking-widest">{pallet.codigoUnico}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {cfgEdificio && (
                  <span className="font-display text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: cfgEdificio.bg, color: cfgEdificio.color, border: `1px solid ${cfgEdificio.border}` }}>
                    {cfgEdificio.label}
                  </span>
                )}
                {pallet.entrega && (
                  <span className="font-display text-[10px] text-text-muted">
                    Entrega #{String(pallet.entrega.numero).padStart(5, "0")}
                    {pallet.entrega.camion && ` · ${pallet.entrega.camion.numeroTransporte ?? pallet.entrega.camion.patente}`}
                    {pallet.entrega.camion?.cliente && ` · ${pallet.entrega.camion.cliente.nombre}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ color: colorEstadoPallet[pallet.estado], background: bgEstadoPallet[pallet.estado] }}>
              {etiquetasEstadoPallet[pallet.estado]}
            </span>
            {enArmado && (
              <button onClick={cerrarYCrearNuevo} disabled={cerrando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-bg-elevated font-display text-xs text-text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer disabled:opacity-50">
                {cerrando ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
                Cerrar y crear nuevo
              </button>
            )}
            {puedeAvanzar && (
              <button onClick={avanzarEstado} disabled={cambiando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-xs text-white disabled:opacity-50 cursor-pointer transition-colors"
                style={{ background: colorEstadoPallet[siguienteEstado!] ?? "#2563EB" }}>
                <CheckCircle2 size={11} />
                {cambiando ? "Procesando..." : ACCION_LABEL[pallet.estado]}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Ítems distintos", value: String(pallet.productos.filter(p => p.productoId).length), icon: Package },
          { label: "Inicio",          value: formatearFechaHora(pallet.timestampInicio), icon: Clock },
          { label: "Tiempo armado",   value: pallet.tiempoArmadoSegundos ? formatSegundos(pallet.tiempoArmadoSegundos) : "—", icon: Clock },
          { label: "Pickinero",       value: pallet.pickinero?.nombre ?? "—", icon: User },
        ].map(({ label, value, icon: Icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.05 }}
            className="bg-bg-surface border border-bg-elevated rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={11} className="text-text-muted" />
              <p className="font-display text-[10px] uppercase text-text-muted tracking-widest">{label}</p>
            </div>
            <p className="font-data text-sm font-bold text-text-primary truncate">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Progreso del pedido */}
      {itemsEntrega.length > 0 && (
        <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
          {/* Header con resumen */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated"
            style={{ background: pedidoCompleto ? "#F0FDF4" : undefined }}>
            <div className="flex items-center gap-2">
              <BarChart3 size={13} style={{ color: pedidoCompleto ? "#16A34A" : "#EA580C" }} />
              <h3 className="font-display text-[11px] uppercase tracking-widest font-semibold"
                style={{ color: pedidoCompleto ? "#16A34A" : "var(--color-text-primary)" }}>
                Progreso del pedido
              </h3>
              {pedidoCompleto && (
                <span className="font-display text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                  ¡Completo!
                </span>
              )}
            </div>
            <span className="font-data text-xs text-text-muted tabular-nums">
              {totalCargado} / {totalSolicitado} {itemsEntrega[0]?.producto.unidadMedida ?? ""}
            </span>
          </div>

          {/* Filas de productos con picking */}
          <AnimatePresence initial={false}>
            {itemsEntrega.map(item => (
              <FilaProducto
                key={item.id}
                item={item}
                cantidadEnEstePallet={cantidadEnPallet(item.productoId)}
                enArmado={enArmado}
                actualizando={actualizandoItem === item.productoId}
                onCambiar={delta => cambiarCantidad(item.productoId, delta)}
              />
            ))}
          </AnimatePresence>

          {/* Botón cerrar y crear nuevo al pie si hay progreso */}
          {enArmado && (
            <div className="px-4 py-3 border-t border-bg-elevated flex items-center justify-between gap-3"
              style={{ background: "#FAFAFA" }}>
              <p className="font-display text-[10px] text-text-muted">
                Cuando el pallet esté lleno, ciérralo y continúa armando el siguiente.
              </p>
              <button onClick={cerrarYCrearNuevo} disabled={cerrando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-xs font-semibold text-white cursor-pointer disabled:opacity-50 transition-colors shrink-0"
                style={{ background: cfgEdificio?.color ?? "#1E3A5F" }}>
                {cerrando ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
                Cerrar pallet y crear nuevo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sin items de entrega → mensaje */}
      {itemsEntrega.length === 0 && (
        <div className="bg-bg-surface border border-dashed border-bg-elevated rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <Package size={28} className="text-text-muted opacity-30" />
          <p className="font-display text-sm text-text-muted">Esta entrega no tiene productos asignados.</p>
          <p className="font-display text-xs text-text-muted opacity-60">
            El Coordinador puede asignar productos desde el formulario de creación del camión.
          </p>
        </div>
      )}

      {/* Asignaciones */}
      {pallet.cargador && (
        <div className="bg-bg-surface border border-bg-elevated rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Truck size={14} className="text-purple-500" />
          </div>
          <div>
            <p className="font-display text-[10px] uppercase text-text-muted tracking-widest">Cargador</p>
            <p className="font-display text-sm font-semibold text-text-primary">{pallet.cargador.nombre}</p>
          </div>
        </div>
      )}
    </div>
  );
}
