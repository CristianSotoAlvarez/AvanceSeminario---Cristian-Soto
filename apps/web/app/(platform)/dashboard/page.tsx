"use client";

import { KpiCard, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useCamiones } from "@/hooks/use-camiones";

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

export default function DashboardPage() {
  const { camiones, cargando } = useCamiones();

  const totalCamiones = camiones.length;
  const despachados = camiones.filter((c) => c.estado === "DESPACHADO").length;
  const andenesOcupados = new Set(
    camiones.filter((c) => c.andenId).map((c) => c.andenId),
  ).size;
  const camionesActivos = camiones.filter((c) => c.estado !== "DESPACHADO");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Camiones Hoy" value={cargando ? "—" : totalCamiones} valueColor="#F59E0B" />
        <KpiCard label="Despachados" value={cargando ? "—" : despachados} valueColor="#16A34A" />
        <KpiCard label="Andenes Ocupados" value={cargando ? "—" : `${andenesOcupados}/11`} valueColor="#1E40AF" />
        <KpiCard label="Activos" value={cargando ? "—" : camionesActivos.length} valueColor="#2563EB" />
      </div>

      <div>
        <h2 className="font-display text-h3 uppercase text-text-primary mb-4">
          Camiones Activos
        </h2>

        {cargando ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : camionesActivos.length === 0 ? (
          <div className="text-center py-12 text-text-muted font-display">
            No hay camiones activos
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
              </tr>
            </TableHeader>
            <TableBody>
              {camionesActivos.map((camion) => (
                <TableRow key={camion.id}>
                  <TableCell className="font-semibold">{camion.patente}</TableCell>
                  <TableCell className="font-display text-text-muted">{etiquetasTipo[camion.tipo] || camion.tipo}</TableCell>
                  <TableCell className="font-display">{camion.pedido?.cliente?.nombre || "—"}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
