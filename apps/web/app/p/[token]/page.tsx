"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertTriangle, Truck, Clock } from "lucide-react";
import {
  obtenerPorteriaPorTokenApi,
  confirmarPorteriaPorTokenApi,
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

function diferenciaMinutos(planificada: string): { texto: string; color: string } {
  const diff = Math.round((Date.now() - new Date(planificada).getTime()) / 60000);
  if (diff > 5) return { texto: `Atrasado ${diff} min`, color: "#DC2626" };
  if (diff < -5) return { texto: `Temprano ${Math.abs(diff)} min`, color: "#0E7490" };
  return { texto: "Puntual", color: "#16A34A" };
}

export default function PorteriaTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [camion, setCamion] = useState<CamionPorteria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!token) return;
    obtenerPorteriaPorTokenApi(token)
      .then(setCamion)
      .catch(e => setError(e.message ?? "QR no válido"))
      .finally(() => setCargando(false));
  }, [token]);

  async function confirmar() {
    setConfirmando(true);
    try {
      const actualizado = await confirmarPorteriaPorTokenApi(token);
      setCamion(actualizado);
      setConfirmado(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al confirmar la llegada");
    } finally {
      setConfirmando(false);
    }
  }

  // ─── Renders por estado ────────────────────────────────────────────────────

  if (cargando) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <Loader2 size={56} className="text-slate-400 animate-spin" />
        <p className="text-slate-600 font-medium">Validando QR...</p>
      </main>
    );
  }

  if (error || !camion) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 bg-slate-50 p-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={40} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 text-center">No se pudo procesar el QR</h1>
        <p className="text-slate-600 text-center max-w-md">{error ?? "QR no válido"}</p>
      </main>
    );
  }

  if (confirmado) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5 bg-green-50 p-6">
        <div className="w-24 h-24 rounded-full bg-green-200 flex items-center justify-center">
          <CheckCircle2 size={56} className="text-green-700" />
        </div>
        <h1 className="text-2xl font-bold text-green-900 text-center">Llegada registrada</h1>
        <p className="text-green-800 text-center text-lg">
          {camion.patente} · {formatHora(camion.horaLlegadaReal)}
        </p>
        <p className="text-green-700 text-sm text-center max-w-sm mt-2">
          Puede cerrar esta pantalla. Camión registrado en sistema.
        </p>
      </main>
    );
  }

  const tipo = ETIQUETA_TIPO[camion.tipo] ?? { label: camion.tipo, color: "#64748B" };
  const yaRegistrado = camion.estado !== "ESPERADO";
  const horaInfo = !yaRegistrado ? diferenciaMinutos(camion.horaLlegadaPlanificada) : null;
  const clienteNombre = camion.cliente?.nombre ?? camion.pedido?.cliente?.nombre ?? null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-md space-y-6">
        <header className="flex items-center gap-3 pt-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Portería</h1>
            <p className="text-sm text-slate-500">Registro de llegada</p>
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          {/* Patente gigante */}
          <div className="text-center py-2 border-b border-slate-100">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Patente</p>
            <p className="text-4xl font-mono font-bold text-slate-900 tracking-wider">
              {camion.patente}
            </p>
            {camion.numeroTransporte && (
              <p className="text-xs font-mono text-slate-500 mt-2">N° {camion.numeroTransporte}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Tipo</span>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: tipo.color + "18", color: tipo.color }}
            >
              {tipo.label}
            </span>
          </div>

          {/* Cliente */}
          {clienteNombre && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500 shrink-0">Cliente</span>
              <span className="text-sm font-medium text-slate-900 text-right truncate">{clienteNombre}</span>
            </div>
          )}

          {/* Hora planificada vs llegada */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 flex items-center gap-1.5">
              <Clock size={13} /> Planificada
            </span>
            <span className="text-sm font-mono text-slate-900">{formatHora(camion.horaLlegadaPlanificada)}</span>
          </div>

          {horaInfo && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-500">Estado</span>
              <span className="text-sm font-bold" style={{ color: horaInfo.color }}>{horaInfo.texto}</span>
            </div>
          )}

          {yaRegistrado && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Camión ya registrado</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Estado actual: <span className="font-mono">{camion.estado}</span>
                  {camion.horaLlegadaReal && <> · Llegada {formatHora(camion.horaLlegadaReal)}</>}
                </p>
              </div>
            </div>
          )}
        </div>

        {!yaRegistrado && (
          <button
            onClick={confirmar}
            disabled={confirmando}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-lg py-5 rounded-2xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirmando ? <Loader2 size={22} className="animate-spin" /> : <CheckCircle2 size={22} />}
            Confirmar llegada
          </button>
        )}
      </div>
    </main>
  );
}
