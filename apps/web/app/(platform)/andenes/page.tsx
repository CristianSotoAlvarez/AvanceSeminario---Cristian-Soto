"use client";

import { Truck, RefreshCw, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useAndenes } from "@/hooks/use-andenes";
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

const etiquetasEdificio: Record<string, { label: string; color: string; bg: string; border: string }> = {
  AVES: {
    label: "Aves",
    color: "#1E40AF",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  CERDO: {
    label: "Cerdo",
    color: "#9333EA",
    bg: "#FAF5FF",
    border: "#E9D5FF",
  },
  FRIGORIFICO: {
    label: "Frigorífico",
    color: "#0369A1",
    bg: "#F0F9FF",
    border: "#BAE6FD",
  },
};

function TarjetaAnden({ anden }: { anden: Anden }) {
  const camionActual = anden.camiones[0] ?? null;
  const ocupado = camionActual !== null;
  const edif = etiquetasEdificio[anden.edificio.tipo] ?? etiquetasEdificio["AVES"];

  return (
    <div
      className="rounded-xl border-2 transition-all duration-200 overflow-hidden"
      style={{
        borderColor: ocupado ? edif.color : "#DBEAFE",
        background: ocupado ? edif.bg : "#FFFFFF",
        boxShadow: ocupado ? `0 4px 16px 0 ${edif.color}22` : "none",
      }}
    >
      {/* Cabecera del andén */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: ocupado ? edif.color : "#F8FAFC", borderBottom: `1px solid ${ocupado ? edif.border : "#DBEAFE"}` }}
      >
        <span
          className="font-display text-lg font-bold tracking-wider uppercase"
          style={{ color: ocupado ? "#FFFFFF" : "#64748B" }}
        >
          {anden.codigo}
        </span>
        <div className="flex items-center gap-1.5">
          {ocupado ? (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#FFFFFF" }}>
              <Truck size={13} />
              OCUPADO
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
              <CheckCircle2 size={13} className="text-semantic-success" />
              LIBRE
            </span>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-4 min-h-[110px]">
        {camionActual ? (
          <div className="space-y-2.5">
            {/* Patente */}
            <div className="flex items-center gap-2">
              <Truck size={16} style={{ color: edif.color }} />
              <span className="font-data text-base font-bold text-text-primary tracking-widest">
                {camionActual.patente}
              </span>
            </div>

            {/* Cliente */}
            {camionActual.pedido?.cliente && (
              <p className="font-display text-sm text-text-muted truncate">
                {camionActual.pedido.cliente.nombre}
              </p>
            )}

            {/* Estado */}
            <Badge color={TRUCK_STATE_COLOR[camionActual.estado as TruckState] || "neutral"}>
              {etiquetasEstado[camionActual.estado] || camionActual.estado}
            </Badge>

            {/* Hora planificada */}
            <div className="flex items-center gap-1.5 text-text-muted">
              <Clock size={12} />
              <span className="font-data text-xs">
                {new Date(camionActual.horaLlegadaPlanificada).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {camionActual.horaSalidaPlanificada && (
                  <> → {new Date(camionActual.horaSalidaPlanificada).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full pt-4 gap-2 opacity-40">
            <Truck size={28} className="text-text-muted" />
            <span className="font-display text-xs text-text-muted uppercase tracking-wide">Sin camión</span>
          </div>
        )}
      </div>
    </div>
  );
}

function GrupoEdificio({ tipo, andenes }: { tipo: string; andenes: Anden[] }) {
  const edif = etiquetasEdificio[tipo];
  if (!edif || andenes.length === 0) return null;

  const ocupados = andenes.filter((a) => a.camiones.length > 0).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: edif.color }}
        />
        <h2 className="font-display text-h3 uppercase text-text-primary tracking-wider">
          {edif.label}
        </h2>
        <span className="font-display text-sm text-text-muted">
          {ocupados}/{andenes.length} ocupados
        </span>
        {/* Barra de ocupación */}
        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(ocupados / andenes.length) * 100}%`,
              background: edif.color,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {andenes.map((anden) => (
          <TarjetaAnden key={anden.id} anden={anden} />
        ))}
      </div>
    </div>
  );
}

export default function AndenesPage() {
  const { andenes, cargando, recargar } = useAndenes();

  const grupos = {
    AVES: andenes.filter((a) => a.edificio.tipo === "AVES"),
    CERDO: andenes.filter((a) => a.edificio.tipo === "CERDO"),
    FRIGORIFICO: andenes.filter((a) => a.edificio.tipo === "FRIGORIFICO"),
  };

  const totalOcupados = andenes.filter((a) => a.camiones.length > 0).length;
  const totalAndenes = andenes.length;

  return (
    <div className="space-y-8">
      {/* Resumen global */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="font-display text-label uppercase text-text-muted tracking-wide">Total andenes</p>
            <p className="font-data text-kpi-lg text-text-primary">{cargando ? "—" : totalAndenes}</p>
          </div>
          <div>
            <p className="font-display text-label uppercase text-text-muted tracking-wide">Ocupados</p>
            <p className="font-data text-kpi-lg" style={{ color: "#1E40AF" }}>{cargando ? "—" : totalOcupados}</p>
          </div>
          <div>
            <p className="font-display text-label uppercase text-text-muted tracking-wide">Disponibles</p>
            <p className="font-data text-kpi-lg text-semantic-success">{cargando ? "—" : totalAndenes - totalOcupados}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={recargar} disabled={cargando}>
          {cargando ? (
            <Loader2 size={14} className="mr-1 animate-spin" />
          ) : (
            <RefreshCw size={14} className="mr-1" />
          )}
          Actualizar
        </Button>
      </div>

      {/* Grupos por edificio */}
      {cargando ? (
        <div className="space-y-8">
          {["Aves", "Cerdo", "Frigorífico"].map((nombre) => (
            <div key={nombre}>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <GrupoEdificio tipo="AVES" andenes={grupos.AVES} />
          <GrupoEdificio tipo="CERDO" andenes={grupos.CERDO} />
          <GrupoEdificio tipo="FRIGORIFICO" andenes={grupos.FRIGORIFICO} />
        </div>
      )}
    </div>
  );
}
