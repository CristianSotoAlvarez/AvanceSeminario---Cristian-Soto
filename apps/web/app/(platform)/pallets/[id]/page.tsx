"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  ArrowLeft, Package, User, Truck, Weight,
  Clock, CheckCircle2, AlertTriangle, Plus, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  obtenerPalletApi, cambiarEstadoPalletApi, agregarProductoPalletApi,
  type Pallet,
} from "@/lib/api";
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

function pesoTotal(productos: Pallet["productos"]): number {
  return productos.reduce((s, p) => s + p.pesoKg * p.cantidad, 0);
}

// Qué transición puede ejecutar cada rol
const SIGUIENTE_ESTADO: Record<string, string> = {
  EN_ARMADO:  "ARMADO",
  ARMADO:     "CARGADO",
  CARGADO:    "VERIFICADO",
};

const ACCION_LABEL: Record<string, string> = {
  EN_ARMADO:  "Marcar como Armado",
  ARMADO:     "Marcar como Cargado",
  CARGADO:    "Verificar pallet",
};

const ROLES_POR_TRANSICION: Record<string, string[]> = {
  EN_ARMADO: ["PICKINERO", "JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"],
  ARMADO:    ["CARGADOR",  "JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"],
  CARGADO:   ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"],
};

// ─── Modal agregar producto ───────────────────────────────────────────────────

// El formulario inline (sin modal) vive directamente en la página de detalle
// para que el pickinero escanee y presione Enter sin cambiar de pantalla
function FormAgregarProducto({
  palletId,
  onAgregado,
}: {
  palletId: string;
  onAgregado: (p: Pallet) => void;
}) {
  const [form, setForm] = useState({ codigoBarras: "", descripcion: "", cantidad: "1", pesoKg: "" });
  const [guardando, setGuardando] = useState(false);
  const codigoRef = useRef<HTMLInputElement>(null);

  function set(campo: string, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  async function guardar() {
    if (!form.codigoBarras || !form.descripcion || !form.pesoKg) return;
    setGuardando(true);
    try {
      const pallet = await agregarProductoPalletApi(palletId, {
        codigoBarras: form.codigoBarras,
        descripcion:  form.descripcion,
        cantidad:     Number(form.cantidad) || 1,
        pesoKg:       Number(form.pesoKg),
      });
      toast.success("Producto agregado");
      onAgregado(pallet!);
      // Limpiar y volver el foco al código de barras para el siguiente escaneo
      setForm({ codigoBarras: "", descripcion: "", cantidad: "1", pesoKg: "" });
      codigoRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message || "Error al agregar producto");
    } finally {
      setGuardando(false);
    }
  }

  const listo = form.codigoBarras && form.descripcion && form.pesoKg;

  return (
    <div className="p-4 border-t border-bg-elevated bg-bg-elevated/30">
      <p className="font-display text-[10px] uppercase text-text-muted tracking-widest mb-3">
        Agregar producto — escanea el código y completa los datos
      </p>
      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-2 items-end">
        <div>
          <label className="font-display text-[9px] uppercase text-text-muted tracking-widest block mb-1">Código barras</label>
          <input
            ref={codigoRef}
            autoFocus
            type="text"
            value={form.codigoBarras}
            onChange={e => set("codigoBarras", e.target.value)}
            onKeyDown={e => e.key === "Enter" && document.getElementById("desc-input")?.focus()}
            placeholder="Escanear..."
            className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted/40"
          />
        </div>
        <div>
          <label className="font-display text-[9px] uppercase text-text-muted tracking-widest block mb-1">Descripción</label>
          <input
            id="desc-input"
            type="text"
            value={form.descripcion}
            onChange={e => set("descripcion", e.target.value)}
            onKeyDown={e => e.key === "Enter" && document.getElementById("cant-input")?.focus()}
            placeholder="Nombre del producto"
            className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted/40"
          />
        </div>
        <div>
          <label className="font-display text-[9px] uppercase text-text-muted tracking-widest block mb-1">Cantidad</label>
          <input
            id="cant-input"
            type="number"
            min={1}
            value={form.cantidad}
            onChange={e => set("cantidad", e.target.value)}
            onKeyDown={e => e.key === "Enter" && document.getElementById("peso-input")?.focus()}
            className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="font-display text-[9px] uppercase text-text-muted tracking-widest block mb-1">Peso kg</label>
          <input
            id="peso-input"
            type="number"
            min={0}
            step="0.1"
            value={form.pesoKg}
            onChange={e => set("pesoKg", e.target.value)}
            onKeyDown={e => e.key === "Enter" && listo && guardar()}
            placeholder="0.0"
            className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-data text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted/40"
          />
        </div>
        <button
          onClick={guardar}
          disabled={guardando || !listo}
          className="h-[38px] px-4 rounded-lg font-display text-sm text-white disabled:opacity-40 cursor-pointer transition-colors flex items-center gap-1.5"
          style={{ background: "#2563EB" }}
        >
          {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {guardando ? "" : "Añadir"}
        </button>
      </div>
      <p className="font-display text-[9px] text-text-muted mt-2 opacity-60">
        Enter avanza entre campos · Enter en Peso guarda y vuelve al código de barras
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetallePalletPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useContext(AuthContext);

  const [pallet, setPallet]     = useState<Pallet | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    obtenerPalletApi(id)
      .then(setPallet)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  const siguienteEstado = pallet ? SIGUIENTE_ESTADO[pallet.estado] : null;
  const puedeAvanzar = pallet && siguienteEstado && usuario &&
    (ROLES_POR_TRANSICION[pallet.estado]?.includes(usuario.rol));
  const puedoAgregarProducto = pallet?.estado === "EN_ARMADO" && usuario &&
    ["PICKINERO", "JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"].includes(usuario.rol);

  async function avanzarEstado() {
    if (!pallet || !siguienteEstado) return;
    setCambiando(true);
    try {
      const actualizado = await cambiarEstadoPalletApi(pallet.id, siguienteEstado);
      setPallet(actualizado);
      toast.success(`Pallet marcado como ${etiquetasEstadoPallet[siguienteEstado]}`);
    } catch (e: any) {
      toast.error(e.message || "Error al cambiar estado");
    } finally {
      setCambiando(false);
    }
  }

  if (cargando) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
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

  const peso = pesoTotal(pallet.productos);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary font-display text-xs uppercase tracking-wide mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} /> Volver a pallets
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: bgEstadoPallet[pallet.estado] ?? "#F8FAFC" }}
            >
              <Package size={20} style={{ color: colorEstadoPallet[pallet.estado] ?? "#94A3B8" }} />
            </div>
            <div>
              <h1 className="font-data text-2xl font-bold text-text-primary tracking-widest">
                {pallet.codigoUnico}
              </h1>
              <p className="font-display text-xs text-text-muted uppercase tracking-wide">
                {pallet.pickinero?.nombre && `Pickinero: ${pallet.pickinero.nombre}`}
                {pallet.entrega?.camion && ` · ${pallet.entrega.camion.numeroTransporte ?? pallet.entrega.camion.patente}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-display text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
              style={{ color: colorEstadoPallet[pallet.estado], background: bgEstadoPallet[pallet.estado] }}
            >
              {etiquetasEstadoPallet[pallet.estado]}
            </span>
            {puedeAvanzar && (
              <button
                onClick={avanzarEstado}
                disabled={cambiando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-xs text-white disabled:opacity-50 cursor-pointer transition-colors"
                style={{ background: colorEstadoPallet[siguienteEstado!] ?? "#2563EB" }}
              >
                <CheckCircle2 size={12} />
                {cambiando ? "Procesando..." : ACCION_LABEL[pallet.estado]}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Productos",     value: String(pallet.productos.length), icon: Package },
          { label: "Peso total",    value: `${peso.toFixed(1)} kg`,         icon: Weight },
          { label: "Inicio",        value: formatearFechaHora(pallet.timestampInicio), icon: Clock },
          {
            label: "Tiempo armado",
            value: pallet.tiempoArmadoSegundos ? formatSegundos(pallet.tiempoArmadoSegundos) : "—",
            icon: Clock,
          },
        ].map(({ label, value, icon: Icon }, i) => (
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
            <p className="font-data text-sm font-bold text-text-primary">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Asignaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pallet.pickinero && (
          <div className="bg-bg-surface border border-bg-elevated rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <User size={14} className="text-accent" />
            </div>
            <div>
              <p className="font-display text-[10px] uppercase text-text-muted tracking-widest">Pickinero</p>
              <p className="font-display text-sm font-semibold text-text-primary">{pallet.pickinero.nombre}</p>
            </div>
          </div>
        )}
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

      {/* Tabla de productos */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated">
          <h3 className="font-display text-[11px] uppercase text-text-muted tracking-widest flex items-center gap-2">
            <Package size={12} /> Productos ({pallet.productos.length})
          </h3>
        </div>

        {pallet.productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Package size={28} className="text-text-muted opacity-30" />
            <p className="font-display text-sm text-text-muted">Sin productos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-2 border-b border-bg-elevated/50">
              {["Código barras", "Descripción", "Cantidad", "Peso unit.", "Total"].map(h => (
                <span key={h} className="font-display text-[10px] uppercase text-text-muted tracking-widest">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-bg-elevated/50">
              {pallet.productos.map((prod, i) => (
                <motion.div
                  key={prod.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-3 items-center"
                >
                  <span className="font-data text-xs text-text-muted">{prod.codigoBarras}</span>
                  <span className="font-display text-xs text-text-primary">{prod.descripcion}</span>
                  <span className="font-data text-xs text-text-primary tabular-nums">{prod.cantidad}</span>
                  <span className="font-data text-xs text-text-muted tabular-nums">{prod.pesoKg} kg</span>
                  <span className="font-data text-xs font-semibold text-text-primary tabular-nums">
                    {(prod.pesoKg * prod.cantidad).toFixed(1)} kg
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-bg-elevated">
              <span className="font-data text-sm font-bold text-text-primary">
                Total: {peso.toFixed(1)} kg
              </span>
            </div>
          </>
        )}

        {puedoAgregarProducto && (
          <FormAgregarProducto
            palletId={pallet.id}
            onAgregado={(p) => setPallet(p)}
          />
        )}
      </div>

    </div>
  );
}
