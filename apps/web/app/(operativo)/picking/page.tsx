"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Skeleton } from "@dispatch-track/ui";
import {
  Package, ChevronRight, Loader2, Plus, RefreshCw, Truck,
} from "lucide-react";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";
import { usePallets } from "@/hooks/use-pallets";
import { useSocketCamiones } from "@/hooks/use-socket";
import { type Pallet } from "@/lib/api";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AVES:        { label: "Aves",        color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  CERDO:       { label: "Cerdo",       color: "#BE185D", bg: "#FFE4E6", border: "#FECDD3" },
  FRIGORIFICO: { label: "Frigorífico", color: "#0E7490", bg: "#CFFAFE", border: "#A5F3FC" },
};

const EDIFICIOS_ORDEN = ["AVES", "CERDO", "FRIGORIFICO"];

// ─── Tarjeta de pallet individual ─────────────────────────────────────────────

function TarjetaPallet({ pallet }: { pallet: Pallet }) {
  const router = useRouter();

  const edificioTipo = pallet.entrega?.camion
    ? null
    : null; // El edificio viene por la parada, no directamente del pallet

  const numeroCamion =
    pallet.entrega?.camion?.numeroTransporte ??
    pallet.entrega?.camion?.patente ??
    "—";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => router.push(`/pallets/${pallet.id}`)}
      className="w-full flex items-center gap-3 px-4 py-4 bg-bg-surface border border-bg-elevated rounded-xl hover:border-accent/40 hover:bg-bg-elevated/40 active:scale-[0.98] transition-all cursor-pointer text-left group"
    >
      {/* Icono */}
      <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center shrink-0">
        <Package size={18} color="#B45309" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-data text-sm font-bold text-text-primary tracking-widest leading-tight">
          {pallet.codigoUnico}
        </p>
        {numeroCamion !== "—" && (
          <div className="flex items-center gap-1 mt-1">
            <Truck size={10} className="text-text-muted" />
            <span className="font-display text-[10px] text-text-muted">
              {numeroCamion}
            </span>
          </div>
        )}
      </div>

      {/* Flecha */}
      <ChevronRight
        size={16}
        className="text-text-muted group-hover:text-accent transition-colors shrink-0"
      />
    </motion.button>
  );
}

// ─── Sección por edificio ──────────────────────────────────────────────────────

function SeccionEdificio({ edificio, pallets }: { edificio: string; pallets: Pallet[] }) {
  const cfg = CONFIG_EDIFICIO[edificio];
  if (!pallets.length) return null;

  return (
    <div className="space-y-2">
      {/* Encabezado edificio */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
        <span
          className="font-display text-xs font-bold uppercase tracking-widest"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
        <span
          className="ml-1 font-data text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: cfg.border, color: cfg.color }}
        >
          {pallets.length}
        </span>
      </div>

      {/* Pallets */}
      <AnimatePresence>
        {pallets.map(p => (
          <TarjetaPallet key={p.id} pallet={p} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function PickingPage() {
  const { pallets, cargando, recargar } = usePallets({
    estado: "EN_ARMADO",
    porPagina: 200,
  });

  const [actualizando, setActualizando] = useState(false);

  const handleActualizado = useCallback(async () => {
    setActualizando(true);
    await recargar();
    setActualizando(false);
  }, [recargar]);

  useSocketCamiones(handleActualizado);

  // Agrupar pallets por edificio de la parada asociada a su entrega
  // Como Pallet no expone edificioTipo directamente, los distribuimos
  // intentando leer pallet.entrega.camion; si no hay edificio conocido los
  // mostramos en una sección "Sin edificio". En producción el backend podría
  // devolver el edificio directamente.
  const palletsPorEdificio: Record<string, Pallet[]> = {
    AVES: [],
    CERDO: [],
    FRIGORIFICO: [],
  };

  const palletsSinEdificio: Pallet[] = [];

  for (const p of pallets) {
    // Si en algún momento el backend incluye el edificioTipo en el pallet,
    // se puede leer aquí. Por ahora distribuimos sin clasificar edificio.
    palletsSinEdificio.push(p);
  }

  const totalPallets = pallets.length;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-bg-primary pt-1 pb-3 border-b border-bg-elevated">
        <div>
          <h1 className="font-display text-base font-bold text-text-primary uppercase tracking-wide">
            Picking
          </h1>
          <p className="font-display text-[11px] text-text-muted mt-0.5">
            {totalPallets > 0
              ? `${totalPallets} pallet${totalPallets !== 1 ? "s" : ""} en armado`
              : "Sin pallets en armado"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <QrScanner label="Escanear QR" />
          <button
            onClick={handleActualizado}
            disabled={cargando || actualizando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-surface border border-bg-elevated font-display text-[11px] text-text-muted hover:text-text-primary hover:border-accent/30 transition-all disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw
              size={13}
              className={cargando || actualizando ? "animate-spin" : ""}
            />
            Actualizar
          </button>
        </div>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      ) : totalPallets === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-bg-surface border border-bg-elevated rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center">
            <Package size={24} className="text-text-muted opacity-40" />
          </div>
          <div className="text-center max-w-md">
            <p className="font-display text-sm font-semibold text-text-primary">No hay pallets pendientes</p>
            <p className="font-display text-xs text-text-muted mt-1">
              Aparecerán aquí cuando un camión nuevo llegue a planta y tenga entregas asignadas. Volvé en unos minutos o usá el escáner QR si recibiste un pallet directo.
            </p>
            <button
              onClick={() => recargar()}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-bg-elevated text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors text-xs font-display cursor-pointer"
            >
              <RefreshCw size={12} /> Actualizar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Pallets sin clasificar por edificio se muestran en lista directa */}
          {palletsSinEdificio.length > 0 && (
            <AnimatePresence>
              {palletsSinEdificio.map(p => (
                <TarjetaPallet key={p.id} pallet={p} />
              ))}
            </AnimatePresence>
          )}
          {/* Secciones por edificio (cuando el backend devuelva el tipo) */}
          {EDIFICIOS_ORDEN.map(edificio => (
            <SeccionEdificio
              key={edificio}
              edificio={edificio}
              pallets={palletsPorEdificio[edificio]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
