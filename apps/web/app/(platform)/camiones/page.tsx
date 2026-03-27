"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { RefreshCw } from "lucide-react";
import { useCamiones } from "@/hooks/use-camiones";
import { cambiarEstadoCamionApi } from "@/lib/api";

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

export default function CamionesPage() {
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const { camiones, cargando, recargar } = useCamiones(
    filtroEstado ? { estado: filtroEstado } : undefined,
  );
  const [procesando, setProcesando] = useState<string | null>(null);

  async function manejarAccion(camionId: string, endpoint: string) {
    setProcesando(camionId);
    try {
      await cambiarEstadoCamionApi(camionId, endpoint);
      await recargar();
    } catch (err: any) {
      alert(err.message || "Error al cambiar estado");
    } finally {
      setProcesando(null);
    }
  }

  const estados = Object.keys(etiquetasEstado);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={!filtroEstado ? "primary" : "outline"}
          size="sm"
          onClick={() => setFiltroEstado(undefined)}
        >
          Todos
        </Button>
        {estados.map((estado) => (
          <Button
            key={estado}
            variant={filtroEstado === estado ? "primary" : "outline"}
            size="sm"
            onClick={() => setFiltroEstado(estado)}
          >
            {etiquetasEstado[estado]}
          </Button>
        ))}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={recargar}>
            <RefreshCw size={14} className="mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {cargando ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : camiones.length === 0 ? (
        <div className="text-center py-12 text-text-muted font-display">
          No hay camiones{filtroEstado ? ` en estado ${etiquetasEstado[filtroEstado]}` : ""}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Patente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Andén</TableHead>
              <TableHead>Hora Plan.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {camiones.map((camion) => (
              <TableRow key={camion.id}>
                <TableCell className="font-semibold">{camion.patente}</TableCell>
                <TableCell className="font-display text-text-muted">
                  {etiquetasTipo[camion.tipo] || camion.tipo}
                </TableCell>
                <TableCell className="font-display">
                  {camion.pedido?.cliente?.nombre || "—"}
                </TableCell>
                <TableCell>{camion.anden?.codigo || "—"}</TableCell>
                <TableCell>
                  {new Date(camion.horaLlegadaPlanificada).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
                    {etiquetasEstado[camion.estado] || camion.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {(ACCIONES_ESTADO[camion.estado] || []).map((accion) => (
                      <Button
                        key={accion.endpoint}
                        variant="outline"
                        size="sm"
                        disabled={procesando === camion.id}
                        onClick={() => manejarAccion(camion.id, accion.endpoint)}
                      >
                        {accion.label}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
