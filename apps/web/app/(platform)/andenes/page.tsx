"use client";

import { useState } from "react";
import { Truck, RefreshCw, Loader2, X, Clock, Package, User, ChevronRight } from "lucide-react";
import { Button, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useAndenes } from "@/hooks/use-andenes";
import { cambiarEstadoCamionApi } from "@/lib/api";
import type { Anden } from "@/lib/api";

const etiquetasEstado: Record<string, string> = {
  ESPERADO: "ESPERADO",
  EN_PORTERIA: "EN PORTERÍA",
  ASIGNADO: "ASIGNADO",
  EN_CARGA: "EN CARGA",
  EN_TUNEL_FRIO: "EN TÚNEL FRÍO",
  ESPERANDO_SAG: "ESPERANDO SAG",
  APROBADO_SAG: "APROBADO SAG",
  RECHAZADO_SAG: "RECHAZADO SAG",
  LISTO: "LISTO",
  DESPACHADO: "DESPACHADO",
};

const etiquetasTipo: Record<string, string> = {
  NACIONAL: "Nacional",
  EXPORTACION: "Exportación",
  INTERPLANTA: "Interplanta",
};

const ACCIONES_ESTADO: Record<string, { endpoint: string; label: string }[]> = {
  EN_PORTERIA: [{ endpoint: "asignar", label: "Asignar Andén" }],
  ASIGNADO: [{ endpoint: "iniciar-carga", label: "Iniciar Carga" }],
  EN_CARGA: [{ endpoint: "finalizar-carga", label: "Finalizar Carga" }],
  EN_TUNEL_FRIO: [{ endpoint: "temperatura-ok", label: "Temp. OK" }],
};

const CONFIG_EDIFICIO: Record<string, { label: string; color: string; colorOscuro: string; bg: string; bgOcupado: string; border: string }> = {
  AVES: {
    label: "Aves",
    color: "#1E40AF",
    colorOscuro: "#1E3A8A",
    bg: "#F8FAFC",
    bgOcupado: "#EFF6FF",
    border: "#BFDBFE",
  },
  CERDO: {
    label: "Cerdo",
    color: "#7C3AED",
    colorOscuro: "#5B21B6",
    bg: "#F8FAFC",
    bgOcupado: "#FAF5FF",
    border: "#DDD6FE",
  },
  FRIGORIFICO: {
    label: "Frigorífico",
    color: "#0369A1",
    colorOscuro: "#075985",
    bg: "#F8FAFC",
    bgOcupado: "#F0F9FF",
    border: "#BAE6FD",
  },
};

// ─── Panel lateral de detalle ───────────────────────────────────────────────

function PanelDetalle({
  anden,
  onCerrar,
  onAccion,
  procesando,
}: {
  anden: Anden;
  onCerrar: () => void;
  onAccion: (camionId: string, endpoint: string) => Promise<void>;
  procesando: boolean;
}) {
  const camion = anden.camiones[0] ?? null;
  const edif = CONFIG_EDIFICIO[anden.edificio.tipo] ?? CONFIG_EDIFICIO["AVES"];
  const acciones = camion ? (ACCIONES_ESTADO[camion.estado] ?? []) : [];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-modal-overlay"
        style={{ background: "rgba(30,58,138,0.18)", backdropFilter: "blur(2px)" }}
        onClick={onCerrar}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[380px] z-modal flex flex-col shadow-2xl"
        style={{ background: "#FFFFFF", borderLeft: `1px solid ${edif.border}` }}
      >
        {/* Cabecera del panel */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: edif.color, borderBottom: `3px solid ${edif.colorOscuro}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}
            >
              {anden.codigo}
            </div>
            <div>
              <p className="text-white font-display font-bold text-base uppercase tracking-wide">
                Andén {anden.codigo}
              </p>
              <p className="text-white/70 font-display text-xs uppercase tracking-wider">
                {edif.label}
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estado del andén */}
        <div
          className="px-6 py-3 flex items-center gap-2 border-b"
          style={{ borderColor: edif.border, background: edif.bgOcupado }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: camion ? edif.color : "#16A34A" }}
          />
          <span className="font-display text-xs uppercase tracking-widest text-text-muted">
            {camion ? "Andén ocupado" : "Andén disponible"}
          </span>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {camion ? (
            <div className="space-y-6">
              {/* Patente y tipo */}
              <div
                className="rounded-xl p-5 border-2"
                style={{ borderColor: edif.border, background: edif.bgOcupado }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: edif.color }}
                  >
                    <Truck size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-data text-xl font-bold text-text-primary tracking-widest">
                      {camion.patente}
                    </p>
                    <p className="font-display text-xs text-text-muted uppercase">
                      {etiquetasTipo[camion.tipo] || camion.tipo}
                    </p>
                  </div>
                </div>
                <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
                  {etiquetasEstado[camion.estado] || camion.estado}
                </Badge>
              </div>

              {/* Info cliente */}
              {camion.pedido && (
                <div className="space-y-1">
                  <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5">
                    <User size={11} />
                    Cliente
                  </p>
                  <p className="font-display text-sm text-text-primary font-semibold">
                    {camion.pedido.cliente?.nombre ?? "—"}
                  </p>
                  <p className="font-data text-xs text-text-muted">
                    Pedido #{camion.pedido.numero}
                  </p>
                </div>
              )}

              {/* Horarios */}
              <div className="space-y-3">
                <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5">
                  <Clock size={11} />
                  Horarios
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-lg p-3 border"
                    style={{ borderColor: edif.border, background: edif.bgOcupado }}
                  >
                    <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-1">
                      Llegada plan.
                    </p>
                    <p className="font-data text-sm font-bold text-text-primary">
                      {new Date(camion.horaLlegadaPlanificada).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-3 border"
                    style={{ borderColor: edif.border, background: edif.bgOcupado }}
                  >
                    <p className="font-display text-[10px] uppercase text-text-muted tracking-wide mb-1">
                      Salida plan.
                    </p>
                    <p className="font-data text-sm font-bold text-text-primary">
                      {camion.horaSalidaPlanificada
                        ? new Date(camion.horaSalidaPlanificada).toLocaleTimeString("es-CL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  {camion.horaLlegadaReal && (
                    <div
                      className="rounded-lg p-3 border col-span-2"
                      style={{ borderColor: "#BBF7D0", background: "#F0FDF4" }}
                    >
                      <p className="font-display text-[10px] uppercase text-semantic-success tracking-wide mb-1">
                        Llegada real
                      </p>
                      <p className="font-data text-sm font-bold text-semantic-success">
                        {new Date(camion.horaLlegadaReal).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              {acciones.length > 0 && (
                <div className="space-y-2">
                  <p className="font-display text-label uppercase text-text-muted tracking-wide flex items-center gap-1.5">
                    <Package size={11} />
                    Acciones disponibles
                  </p>
                  {acciones.map((accion) => (
                    <Button
                      key={accion.endpoint}
                      className="w-full"
                      disabled={procesando}
                      onClick={() => onAccion(camion.id, accion.endpoint)}
                    >
                      {procesando ? (
                        <Loader2 size={14} className="mr-2 animate-spin" />
                      ) : (
                        <ChevronRight size={14} className="mr-2" />
                      )}
                      {accion.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: edif.bgOcupado, border: `2px dashed ${edif.border}` }}
              >
                <Truck size={28} style={{ color: edif.color }} />
              </div>
              <div className="text-center">
                <p className="font-display text-sm text-text-primary font-semibold">Andén libre</p>
                <p className="font-display text-xs text-text-muted mt-1">
                  No hay camiones asignados actualmente
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Figura de andén (forma de bahía de carga) ──────────────────────────────

function FiguraAnden({
  anden,
  seleccionado,
  onClick,
}: {
  anden: Anden;
  seleccionado: boolean;
  onClick: () => void;
}) {
  const camion = anden.camiones[0] ?? null;
  const ocupado = camion !== null;
  const edif = CONFIG_EDIFICIO[anden.edificio.tipo] ?? CONFIG_EDIFICIO["AVES"];

  const colorFondo = ocupado ? edif.bgOcupado : "#FFFFFF";
  const colorBorde = seleccionado ? edif.colorOscuro : ocupado ? edif.color : "#CBD5E1";
  const grosorBorde = seleccionado ? 3 : 2;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-stretch transition-all duration-150 focus:outline-none group"
      style={{ width: "100%" }}
      aria-label={`Andén ${anden.codigo}`}
    >
      {/* Sombra de selección */}
      {seleccionado && (
        <div
          className="absolute inset-0 rounded-t-lg pointer-events-none"
          style={{ boxShadow: `0 0 0 3px ${edif.color}55`, borderRadius: "8px 8px 0 0" }}
        />
      )}

      {/* ── Pared del edificio (franja superior) ── */}
      <div
        className="rounded-t-lg flex items-center justify-between px-3 py-2"
        style={{
          background: ocupado ? edif.color : "#94A3B8",
          border: `${grosorBorde}px solid ${colorBorde}`,
          borderBottom: "none",
        }}
      >
        <span className="font-display font-bold text-white text-sm tracking-widest uppercase">
          {anden.codigo}
        </span>
        {ocupado && (
          <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
        )}
      </div>

      {/* ── Zona de bahía (espacio interior del andén) ── */}
      <div
        className="flex flex-col items-center justify-center transition-colors duration-150 group-hover:brightness-95"
        style={{
          background: colorFondo,
          border: `${grosorBorde}px solid ${colorBorde}`,
          borderTop: "none",
          borderBottom: "none",
          minHeight: "90px",
          padding: "12px 8px",
        }}
      >
        {ocupado ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            {/* Silueta del camión */}
            <div
              className="w-full flex items-center justify-center rounded-md py-2"
              style={{ background: `${edif.color}18`, border: `1px dashed ${edif.border}` }}
            >
              <Truck size={22} style={{ color: edif.color }} />
            </div>
            <span className="font-data text-[11px] font-bold tracking-widest text-text-primary">
              {camion!.patente}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-30">
            <Truck size={18} className="text-text-muted" />
            <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">libre</span>
          </div>
        )}
      </div>

      {/* ── Tope de andén / bumpers (parte inferior) ── */}
      <div
        className="flex"
        style={{ border: `${grosorBorde}px solid ${colorBorde}`, borderTop: "none", borderRadius: "0 0 4px 4px", overflow: "hidden" }}
      >
        {/* Bumper izquierdo */}
        <div
          className="flex-1 h-4"
          style={{ background: ocupado ? edif.color : "#94A3B8", opacity: 0.7 }}
        />
        {/* Apertura central (entrada del camión) */}
        <div
          className="h-4"
          style={{ width: "40%", background: "#F1F5F9" }}
        />
        {/* Bumper derecho */}
        <div
          className="flex-1 h-4"
          style={{ background: ocupado ? edif.color : "#94A3B8", opacity: 0.7 }}
        />
      </div>

      {/* Flecha de "entrada" debajo */}
      <div className="flex justify-center mt-1 opacity-40">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `7px solid ${ocupado ? edif.color : "#94A3B8"}`,
          }}
        />
      </div>
    </button>
  );
}

// ─── Grupo por edificio ──────────────────────────────────────────────────────

function GrupoEdificio({
  tipo,
  andenes,
  seleccionadoId,
  onSeleccionar,
}: {
  tipo: string;
  andenes: Anden[];
  seleccionadoId: string | null;
  onSeleccionar: (anden: Anden) => void;
}) {
  const edif = CONFIG_EDIFICIO[tipo];
  if (!edif || andenes.length === 0) return null;

  const ocupados = andenes.filter((a) => a.camiones.length > 0).length;

  return (
    <div>
      {/* Cabecera del edificio */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-3 h-3 rounded-full" style={{ background: edif.color }} />
        <h2 className="font-display text-h3 uppercase text-text-primary tracking-wider">
          Edificio {edif.label}
        </h2>
        <span className="font-display text-sm text-text-muted">
          {ocupados}/{andenes.length} andenes ocupados
        </span>
        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(ocupados / andenes.length) * 100}%`, background: edif.color }}
          />
        </div>
      </div>

      {/* Representación visual del muro con andenes */}
      <div
        className="rounded-xl p-5"
        style={{ background: "#F1F5F9", border: "2px solid #E2E8F0" }}
      >
        {/* Etiqueta de muro */}
        <p className="font-display text-[10px] uppercase text-text-muted tracking-widest mb-4 text-center">
          ← Muro del edificio →
        </p>

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${andenes.length}, 1fr)` }}>
          {andenes.map((anden) => (
            <FiguraAnden
              key={anden.id}
              anden={anden}
              seleccionado={seleccionadoId === anden.id}
              onClick={() => onSeleccionar(anden)}
            />
          ))}
        </div>

        {/* Etiqueta de exterior */}
        <p className="font-display text-[10px] uppercase text-text-muted tracking-widest mt-4 text-center">
          ← Zona de maniobras (exterior) →
        </p>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AndenesPage() {
  const { andenes, cargando, recargar } = useAndenes();
  const [andenSeleccionado, setAndenSeleccionado] = useState<Anden | null>(null);
  const [procesando, setProcesando] = useState(false);

  const grupos = {
    AVES: andenes.filter((a) => a.edificio.tipo === "AVES"),
    CERDO: andenes.filter((a) => a.edificio.tipo === "CERDO"),
    FRIGORIFICO: andenes.filter((a) => a.edificio.tipo === "FRIGORIFICO"),
  };

  const totalOcupados = andenes.filter((a) => a.camiones.length > 0).length;
  const totalAndenes = andenes.length;

  async function manejarAccion(camionId: string, endpoint: string) {
    setProcesando(true);
    try {
      await cambiarEstadoCamionApi(camionId, endpoint);
      await recargar();
      // Actualizar andén seleccionado con datos frescos
      setAndenSeleccionado((prev) => {
        if (!prev) return null;
        const actualizado = andenes.find((a) => a.id === prev.id);
        return actualizado ?? prev;
      });
    } catch (err: any) {
      alert(err.message || "Error al cambiar estado");
    } finally {
      setProcesando(false);
    }
  }

  function seleccionarAnden(anden: Anden) {
    setAndenSeleccionado((prev) => (prev?.id === anden.id ? null : anden));
  }

  return (
    <div className="space-y-8">
      {/* Panel de detalle */}
      {andenSeleccionado && (
        <PanelDetalle
          anden={andenSeleccionado}
          onCerrar={() => setAndenSeleccionado(null)}
          onAccion={manejarAccion}
          procesando={procesando}
        />
      )}

      {/* Resumen global */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <p className="font-display text-label uppercase text-text-muted tracking-wide">Total</p>
            <p className="font-data text-kpi-lg text-text-primary">{cargando ? "—" : totalAndenes}</p>
          </div>
          <div>
            <p className="font-display text-label uppercase text-text-muted tracking-wide">Ocupados</p>
            <p className="font-data text-kpi-lg" style={{ color: "#1E40AF" }}>{cargando ? "—" : totalOcupados}</p>
          </div>
          <div>
            <p className="font-display text-label uppercase text-text-muted tracking-wide">Libres</p>
            <p className="font-data text-kpi-lg text-semantic-success">{cargando ? "—" : totalAndenes - totalOcupados}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={recargar} disabled={cargando}>
          {cargando ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
          Actualizar
        </Button>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: "#94A3B8" }} />
          <span className="font-display text-xs text-text-muted uppercase tracking-wide">Libre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: "#1E40AF" }} />
          <span className="font-display text-xs text-text-muted uppercase tracking-wide">Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2" style={{ borderColor: "#1E3A8A" }} />
          <span className="font-display text-xs text-text-muted uppercase tracking-wide">Seleccionado</span>
        </div>
        <span className="font-display text-xs text-text-muted ml-2">
          · Haz click en un andén para ver detalles
        </span>
      </div>

      {/* Grupos */}
      {cargando ? (
        <div className="space-y-8">
          {[5, 3, 3].map((n, i) => (
            <div key={i}>
              <Skeleton className="h-6 w-48 mb-5" />
              <div className="rounded-xl p-5 bg-slate-100 border-2 border-slate-200">
                <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                  {Array.from({ length: n }).map((_, j) => (
                    <Skeleton key={j} className="h-36 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <GrupoEdificio tipo="AVES" andenes={grupos.AVES} seleccionadoId={andenSeleccionado?.id ?? null} onSeleccionar={seleccionarAnden} />
          <GrupoEdificio tipo="CERDO" andenes={grupos.CERDO} seleccionadoId={andenSeleccionado?.id ?? null} onSeleccionar={seleccionarAnden} />
          <GrupoEdificio tipo="FRIGORIFICO" andenes={grupos.FRIGORIFICO} seleccionadoId={andenSeleccionado?.id ?? null} onSeleccionar={seleccionarAnden} />
        </div>
      )}
    </div>
  );
}
