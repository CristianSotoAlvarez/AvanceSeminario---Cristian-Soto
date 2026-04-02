"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
// AnimatePresence se usa en el dropdown de filtros
import { Skeleton } from "@dispatch-track/ui";
import {
  Package, Filter, X, ChevronRight, CheckCircle2,
  Truck, User, Weight, Clock, Plus, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { usePallets } from "@/hooks/use-pallets";
import { crearPalletApi } from "@/lib/api";
import { etiquetasEstadoPallet, colorEstadoPallet, bgEstadoPallet } from "@/lib/pallet-config";
import { BotonActualizar } from "@/components/boton-actualizar";
import { formatearFechaHora } from "@/lib/formato";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSegundos(seg: number): string {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function pesoTotal(productos: { pesoKg: number; cantidad: number }[]): number {
  return productos.reduce((s, p) => s + p.pesoKg * p.cantidad, 0);
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

function BadgeEstado({ estado }: { estado: string }) {
  return (
    <span
      className="font-display text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{
        color:      colorEstadoPallet[estado] ?? "#94A3B8",
        background: bgEstadoPallet[estado]    ?? "#F8FAFC",
        border:     `1px solid ${colorEstadoPallet[estado] ?? "#E2E8F0"}30`,
      }}
    >
      {etiquetasEstadoPallet[estado] ?? estado}
    </span>
  );
}


// ─── Página principal ─────────────────────────────────────────────────────────

const ESTADOS_FILTRO = ["EN_ARMADO", "ARMADO", "CARGADO", "VERIFICADO"];

export default function PalletsPage() {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [creando, setCreando] = useState(false);
  const [pagina, setPagina] = useState(1);

  async function crearPallet() {
    setCreando(true);
    try {
      const pallet = await crearPalletApi({});
      router.push(`/pallets/${pallet.id}`);
    } catch (e: any) {
      toast.error(e.message || "Error al crear pallet");
      setCreando(false);
    }
  }

  const { pallets, meta, cargando, recargar } = usePallets({
    estado: filtroEstado,
    pagina,
    porPagina: 30,
  });

  function limpiarFiltros() {
    setFiltroEstado(undefined);
    setPagina(1);
  }

  const filtrosActivos = [filtroEstado].filter(Boolean).length;

  // KPIs
  const enArmado  = pallets.filter(p => p.estado === "EN_ARMADO").length;
  const armados   = pallets.filter(p => p.estado === "ARMADO").length;
  const cargados  = pallets.filter(p => p.estado === "CARGADO").length;
  const verificados = pallets.filter(p => p.estado === "VERIFICADO").length;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">Pallets</h1>
          <p className="font-display text-xs text-text-muted mt-0.5">
            {meta.total} pallet{meta.total !== 1 ? "s" : ""} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtros */}
          <div className="relative">
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-display text-xs transition-all cursor-pointer"
              style={{
                background:   filtrosActivos > 0 ? "#2563EB" : "var(--color-bg-surface)",
                borderColor:  filtrosActivos > 0 ? "#2563EB" : "var(--color-bg-elevated)",
                color:        filtrosActivos > 0 ? "#fff" : "var(--color-text-muted)",
              }}
            >
              <Filter size={12} />
              Filtros
              {filtrosActivos > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center font-data text-[9px] font-bold">
                  {filtrosActivos}
                </span>
              )}
            </button>

            <AnimatePresence>
              {mostrarFiltros && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 bg-bg-surface border border-bg-elevated rounded-xl shadow-xl p-4 z-50 w-64"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-[10px] uppercase text-text-muted tracking-widest">Estado</span>
                    {filtrosActivos > 0 && (
                      <button onClick={limpiarFiltros} className="font-display text-[10px] text-accent hover:underline cursor-pointer">
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ESTADOS_FILTRO.map(e => (
                      <button
                        key={e}
                        onClick={() => { setFiltroEstado(filtroEstado === e ? undefined : e); setPagina(1); }}
                        className="px-2.5 py-1 rounded-full font-display text-[10px] font-semibold border transition-all cursor-pointer"
                        style={{
                          background:  filtroEstado === e ? bgEstadoPallet[e] : "var(--color-bg-elevated)",
                          color:       filtroEstado === e ? colorEstadoPallet[e] : "var(--color-text-muted)",
                          borderColor: filtroEstado === e ? colorEstadoPallet[e] + "60" : "transparent",
                        }}
                      >
                        {etiquetasEstadoPallet[e]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <BotonActualizar onClick={recargar} disabled={cargando} />

          <button
            onClick={crearPallet}
            disabled={creando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-display text-xs text-white cursor-pointer transition-colors disabled:opacity-70"
            style={{ background: "#2563EB" }}
          >
            {creando
              ? <><Loader2 size={12} className="animate-spin" /> Creando...</>
              : <><Plus size={12} /> Nuevo pallet</>
            }
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "En armado",  valor: enArmado,   estado: "EN_ARMADO",  icon: Package },
          { label: "Armados",    valor: armados,    estado: "ARMADO",     icon: CheckCircle2 },
          { label: "Cargados",   valor: cargados,   estado: "CARGADO",    icon: Truck },
          { label: "Verificados",valor: verificados,estado: "VERIFICADO", icon: CheckCircle2 },
        ].map(({ label, valor, estado, icon: Icon }, i) => (
          <motion.div
            key={estado}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="bg-bg-surface border border-bg-elevated rounded-xl p-4 cursor-pointer hover:border-accent/30 transition-colors"
            onClick={() => { setFiltroEstado(filtroEstado === estado ? undefined : estado); setPagina(1); }}
            style={{ borderColor: filtroEstado === estado ? colorEstadoPallet[estado] + "60" : undefined }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: bgEstadoPallet[estado] }}>
                <Icon size={12} style={{ color: colorEstadoPallet[estado] }} />
              </div>
              <p className="font-display text-[10px] uppercase text-text-muted tracking-widest">{label}</p>
            </div>
            <p className="font-data text-2xl font-bold text-text-primary">{valor}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : pallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={36} className="text-text-muted opacity-30" />
            <p className="font-display text-sm text-text-muted">No hay pallets</p>
            {filtrosActivos > 0 && (
              <button onClick={limpiarFiltros} className="font-display text-xs text-accent hover:underline cursor-pointer">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header tabla */}
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr_1fr_32px] gap-3 px-4 py-2.5 border-b border-bg-elevated">
              {["Código", "Estado", "Pickinero", "Camión", "Productos", "Peso total", "Inicio", ""].map(h => (
                <span key={h} className="font-display text-[10px] uppercase text-text-muted tracking-widest">{h}</span>
              ))}
            </div>

            {/* Filas */}
            <div className="divide-y divide-bg-elevated">
              {pallets.map((pallet, i) => {
                const peso = pesoTotal(pallet.productos).toFixed(1);
                return (
                  <motion.div
                    key={pallet.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    onClick={() => router.push(`/pallets/${pallet.id}`)}
                    className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1fr_1fr_32px] gap-3 px-4 py-3 cursor-pointer hover:bg-bg-elevated/50 transition-colors group items-center"
                  >
                    {/* Código */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: bgEstadoPallet[pallet.estado] ?? "#F8FAFC" }}>
                        <Package size={13} style={{ color: colorEstadoPallet[pallet.estado] ?? "#94A3B8" }} />
                      </div>
                      <span className="font-data text-sm font-semibold text-text-primary truncate">
                        {pallet.codigoUnico}
                      </span>
                    </div>

                    {/* Estado */}
                    <BadgeEstado estado={pallet.estado} />

                    {/* Pickinero */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={11} className="text-text-muted shrink-0" />
                      <span className="font-display text-xs text-text-muted truncate">
                        {pallet.pickinero?.nombre ?? "—"}
                      </span>
                    </div>

                    {/* Transporte */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Truck size={11} className="text-text-muted shrink-0" />
                      <span className="font-data text-xs text-text-muted truncate">
                        {pallet.entrega?.camion
                          ? (pallet.entrega.camion.numeroTransporte ?? pallet.entrega.camion.patente)
                          : "—"}
                      </span>
                    </div>

                    {/* Productos */}
                    <span className="font-data text-xs text-text-primary tabular-nums">
                      {pallet.productos.length}
                    </span>

                    {/* Peso */}
                    <div className="flex items-center gap-1 min-w-0">
                      <Weight size={10} className="text-text-muted shrink-0" />
                      <span className="font-data text-xs text-text-muted">{peso} kg</span>
                    </div>

                    {/* Inicio */}
                    <span className="font-data text-[11px] text-text-muted tabular-nums">
                      {formatearFechaHora(pallet.timestampInicio)}
                    </span>

                    {/* Chevron */}
                    <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                );
              })}
            </div>

            {/* Paginación */}
            {meta.totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-bg-elevated">
                <span className="font-display text-xs text-text-muted">
                  {meta.total} resultados · página {meta.pagina} de {meta.totalPaginas}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: meta.totalPaginas }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === meta.totalPaginas || Math.abs(p - pagina) <= 1)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`e${i}`} className="px-2 py-1 font-display text-xs text-text-muted">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPagina(p as number)}
                          className="w-7 h-7 rounded-md font-display text-xs transition-all cursor-pointer"
                          style={{
                            background: pagina === p ? "#2563EB" : "var(--color-bg-elevated)",
                            color:      pagina === p ? "#fff"     : "var(--color-text-muted)",
                          }}
                        >
                          {p}
                        </button>
                      )
                    )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
