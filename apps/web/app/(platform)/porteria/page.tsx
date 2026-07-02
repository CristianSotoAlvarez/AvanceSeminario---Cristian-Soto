"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Truck, Search, CheckCircle2, Clock, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@dispatch-track/ui";
import { toast } from "sonner";
import {
  listarCamionesHoyApi,
  confirmarLlegadaPorIdApi,
  type CamionPorteria,
} from "@/lib/api";

const ETIQUETA_TIPO: Record<string, { label: string; color: string }> = {
  NACIONAL:    { label: "Nacional",    color: "#1E3A5F" },
  EXPORTACION: { label: "Exportación", color: "#8B5CF6" },
  INTERPLANTA: { label: "Interplanta", color: "#EA580C" },
};

function formatHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function PorteriaPage() {
  const [camiones, setCamiones] = useState<CamionPorteria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  async function cargar() {
    try {
      const datos = await listarCamionesHoyApi();
      setCamiones(datos);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, []);

  async function confirmar(camionId: string) {
    setConfirmandoId(camionId);
    try {
      await confirmarLlegadaPorIdApi(camionId);
      toast.success("Llegada registrada");
      await cargar();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al confirmar");
    } finally {
      setConfirmandoId(null);
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return camiones;
    return camiones.filter(c =>
      c.patente.toUpperCase().includes(q) ||
      (c.numeroTransporte ?? "").toUpperCase().includes(q) ||
      (c.cliente?.nombre ?? "").toUpperCase().includes(q),
    );
  }, [camiones, busqueda]);

  const pendientes = filtrados.filter(c => c.estado === "ESPERADO").length;

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Truck size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="font-data text-xl font-bold text-text-primary tracking-wider">Portería</h1>
            <p className="font-display text-xs text-text-muted">Camiones planificados de hoy</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-display text-xs">
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            {pendientes} pendientes
          </span>
          <span className="px-2.5 py-1 rounded-full bg-bg-elevated text-text-muted">
            {camiones.length} total
          </span>
        </div>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por patente, n° transporte o cliente..."
          className="w-full pl-10 pr-4 py-3 bg-bg-surface border border-bg-elevated rounded-lg font-display text-sm text-text-primary outline-none focus:border-accent/40"
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-bg-surface border border-bg-elevated rounded-xl py-16 text-center">
          <Truck size={36} className="text-text-muted opacity-40 mx-auto mb-3" />
          <p className="font-display text-text-muted">
            {busqueda ? "Sin resultados para tu búsqueda" : "No hay camiones planificados para hoy"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((c, i) => {
            const tipo = ETIQUETA_TIPO[c.tipo] ?? { label: c.tipo, color: "#64748B" };
            const esperado = c.estado === "ESPERADO";
            const cliente = c.cliente?.nombre ?? c.pedido?.cliente?.nombre ?? null;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className={`bg-bg-surface border rounded-xl p-4 flex items-center gap-4 flex-wrap ${
                  esperado ? "border-bg-elevated" : "border-bg-elevated/60 opacity-75"
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-data text-xl font-bold text-text-primary tracking-wider">{c.patente}</p>
                    <span
                      className="text-[10px] uppercase tracking-wide font-display font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: tipo.color + "18", color: tipo.color }}
                    >
                      {tipo.label}
                    </span>
                    {!esperado && (
                      <span className="text-[10px] uppercase font-display px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted">
                        {c.estado}
                      </span>
                    )}
                  </div>
                  <p className="font-display text-xs text-text-muted">
                    {c.numeroTransporte && <span>N° {c.numeroTransporte} · </span>}
                    {cliente ?? "Sin cliente"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-display text-[10px] uppercase text-text-muted tracking-widest">
                      <Clock size={11} className="inline -mt-0.5 mr-1" />
                      {esperado ? "Planif." : "Llegada"}
                    </p>
                    <p className="font-data text-sm text-text-primary">
                      {esperado ? formatHora(c.horaLlegadaPlanificada) : formatHora(c.horaLlegadaReal)}
                    </p>
                  </div>

                  {esperado ? (
                    <button
                      onClick={() => confirmar(c.id)}
                      disabled={confirmandoId === c.id}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-display text-sm font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {confirmandoId === c.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <CheckCircle2 size={15} />}
                      Confirmar llegada
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 font-display text-xs font-semibold">
                      <CheckCircle2 size={14} />
                      Registrado
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
