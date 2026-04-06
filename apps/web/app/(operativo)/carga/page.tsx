"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Package, Truck, CheckCircle2, RefreshCw, Loader2, Scale,
} from "lucide-react";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";
import { usePallets } from "@/hooks/use-pallets";
import { useSocketCamiones } from "@/hooks/use-socket";
import { cambiarEstadoPalletApi, type Pallet } from "@/lib/api";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AVES:        { label: "Aves",        color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  CERDO:       { label: "Cerdo",       color: "#BE185D", bg: "#FFE4E6", border: "#FECDD3" },
  FRIGORIFICO: { label: "Frigorífico", color: "#0E7490", bg: "#CFFAFE", border: "#A5F3FC" },
};

// ─── Tarjeta de pallet ────────────────────────────────────────────────────────

function TarjetaPalletCarga({
  pallet,
  onCargado,
}: {
  pallet: Pallet;
  onCargado: (id: string) => void;
}) {
  const [cargando, setCargando] = useState(false);

  const numeroCamion =
    pallet.entrega?.camion?.numeroTransporte ??
    pallet.entrega?.camion?.patente ??
    "—";

  const pesoTotal = pallet.productos.reduce((acc, p) => acc + p.pesoKg * p.cantidad, 0);

  async function marcarCargado() {
    setCargando(true);
    try {
      await cambiarEstadoPalletApi(pallet.id, "CARGADO");
      toast.success(`Pallet ${pallet.codigoUnico} marcado como cargado`);
      onCargado(pallet.id);
    } catch (e: any) {
      toast.error(e.message || "Error al marcar pallet como cargado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Icono */}
        <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
          <Package size={18} color="#2563EB" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-data text-sm font-bold text-text-primary tracking-widest leading-tight">
            {pallet.codigoUnico}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {numeroCamion !== "—" && (
              <div className="flex items-center gap-1">
                <Truck size={10} className="text-text-muted" />
                <span className="font-display text-[10px] text-text-muted">
                  {numeroCamion}
                </span>
              </div>
            )}
            {pesoTotal > 0 && (
              <div className="flex items-center gap-1">
                <Scale size={10} className="text-text-muted" />
                <span className="font-display text-[10px] text-text-muted">
                  {pesoTotal.toLocaleString("es-CL", { maximumFractionDigits: 1 })} kg
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botón acción */}
        <button
          onClick={marcarCargado}
          disabled={cargando}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-display text-[11px] font-semibold text-white disabled:opacity-50 active:scale-95 transition-all cursor-pointer shrink-0"
          style={{ background: cargando ? "#93C5FD" : "#2563EB" }}
        >
          {cargando ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <CheckCircle2 size={13} />
          )}
          {cargando ? "Cargando…" : "Marcar cargado"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Grupo por camión ──────────────────────────────────────────────────────────

function GrupoCamion({
  numeroCamion,
  pallets,
  onCargado,
}: {
  numeroCamion: string;
  pallets: Pallet[];
  onCargado: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Encabezado camión */}
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-bg-elevated rounded-lg">
        <Truck size={13} className="text-text-muted" />
        <span className="font-data text-xs font-bold text-text-primary tracking-widest">
          {numeroCamion}
        </span>
        <span className="ml-auto font-data text-[10px] text-text-muted">
          {pallets.length} pallet{pallets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Pallets */}
      <AnimatePresence>
        {pallets.map(p => (
          <TarjetaPalletCarga key={p.id} pallet={p} onCargado={onCargado} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function CargaPage() {
  const { pallets, cargando, recargar } = usePallets({
    estado: "ARMADO",
    porPagina: 200,
  });

  // IDs de pallets marcados (para animación de salida mientras se recarga)
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const handleCargado = useCallback((id: string) => {
    setMarcados(prev => new Set(prev).add(id));
    // Recargar lista tras breve pausa para que la animación de salida se vea
    setTimeout(recargar, 600);
  }, [recargar]);

  const handleActualizado = useCallback(async () => {
    await recargar();
  }, [recargar]);

  useSocketCamiones(handleActualizado);

  // Pallets visibles (excluir los ya marcados para la animación)
  const palletsVisibles = pallets.filter(p => !marcados.has(p.id));

  // Agrupar por camión
  const grupos: Record<string, Pallet[]> = {};
  for (const p of palletsVisibles) {
    const clave =
      p.entrega?.camion?.numeroTransporte ??
      p.entrega?.camion?.patente ??
      "Sin camión asignado";
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(p);
  }

  const totalPallets = palletsVisibles.length;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-bg-primary pt-1 pb-3 border-b border-bg-elevated">
        <div>
          <h1 className="font-display text-base font-bold text-text-primary uppercase tracking-wide">
            Carga
          </h1>
          <p className="font-display text-[11px] text-text-muted mt-0.5">
            {totalPallets > 0
              ? `${totalPallets} pallet${totalPallets !== 1 ? "s" : ""} listos para cargar`
              : "Sin pallets armados pendientes"}
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
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-xl" />
              <Skeleton className="h-[72px] w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : totalPallets === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-bg-surface border border-bg-elevated rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center">
            <CheckCircle2 size={24} className="text-[#16A34A] opacity-60" />
          </div>
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-text-primary">Todo al día</p>
            <p className="font-display text-xs text-text-muted mt-1">
              No hay pallets armados pendientes de carga
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([numeroCamion, palletsGrupo]) => (
            <GrupoCamion
              key={numeroCamion}
              numeroCamion={numeroCamion}
              pallets={palletsGrupo}
              onCargado={handleCargado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
