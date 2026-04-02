"use client";

import { useCallback } from "react";
import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { KpiCard, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketCamiones } from "@/hooks/use-socket";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { formatearHora, minutosAtraso, formatearAtraso } from "@/lib/formato";
import type { Camion } from "@/lib/api";

function esAtrasado(camion: Camion): boolean {
  return (
    !!camion.horaSalidaPlanificada &&
    camion.estado !== "DESPACHADO" &&
    new Date(camion.horaSalidaPlanificada) < new Date()
  );
}

export default function DashboardPage() {
  const { camiones, cargando, recargar } = useCamiones();

  const handleActualizado = useCallback(() => { recargar(); }, [recargar]);
  useSocketCamiones(handleActualizado);

  const totalCamiones = camiones.length;
  const despachados = camiones.filter((c) => c.estado === "DESPACHADO").length;
  const andenesOcupados = new Set(
    camiones
      .filter((c) => c.andenId && c.estado !== "DESPACHADO")
      .map((c) => c.andenId),
  ).size;
  const camionesActivos = camiones.filter((c) => c.estado !== "DESPACHADO");
  const atrasados = camionesActivos.filter(esAtrasado);

  const kpis = [
    { label: "Camiones Hoy", value: totalCamiones, valueColor: "#F59E0B" },
    { label: "Despachados", value: despachados, valueColor: "#16A34A" },
    { label: "Andenes Ocupados", value: `${andenesOcupados}/11`, valueColor: "#1E40AF" },
    { label: "Con Atraso", value: atrasados.length, valueColor: atrasados.length > 0 ? "#DC2626" : "#64748B" },
  ];

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, valueColor }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.07, ease: "easeOut" }}
          >
            <KpiCard label={label} value={cargando ? "—" : value} valueColor={valueColor} />
          </motion.div>
        ))}
      </div>

      {/* Alerta de atrasados */}
      {!cargando && atrasados.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.28 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-semantic-error" />
            <h2 className="font-display text-h3 uppercase text-semantic-error tracking-wide">
              Atrasados ({atrasados.length})
            </h2>
          </div>

          <div className="rounded-xl border-2 border-red-200 overflow-hidden" style={{ background: "#FFF1F2" }}>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Patente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Andén</TableHead>
                  <TableHead>Salida plan.</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Estado</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {atrasados.map((camion, i) => {
                  const min = minutosAtraso(camion.horaSalidaPlanificada!);
                  const colorAtraso = min > 120 ? "#DC2626" : min > 60 ? "#C2410C" : "#D97706";
                  return (
                    <motion.tr
                      key={camion.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.32 + i * 0.05 }}
                      className="border-b border-red-100 hover:bg-red-50 transition-colors duration-150"
                    >
                      <TableCell className="font-semibold">{camion.patente}</TableCell>
                      <TableCell className="font-display text-text-muted">{etiquetasTipo[camion.tipo] || camion.tipo}</TableCell>
                      <TableCell className="font-display">{camion.pedido?.cliente?.nombre || "—"}</TableCell>
                      <TableCell>{camion.anden?.codigo || "—"}</TableCell>
                      <TableCell className="font-data">{formatearHora(camion.horaSalidaPlanificada!)}</TableCell>
                      <TableCell>
                        <span className="font-data font-bold text-sm" style={{ color: colorAtraso }}>
                          +{formatearAtraso(min)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
                          {etiquetasEstado[camion.estado] || camion.estado}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* Camiones activos */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.3 }}
      >
        <h2 className="font-display text-h3 uppercase text-text-primary mb-4">
          Camiones Activos
        </h2>

        {cargando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                <TableHead>Salida plan.</TableHead>
                <TableHead>Estado</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {camionesActivos.map((camion, i) => {
                const atrasado = esAtrasado(camion);
                return (
                  <motion.tr
                    key={camion.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.35 + i * 0.04, ease: "easeOut" }}
                    className="border-b border-bg-elevated hover:bg-bg-elevated/40 transition-colors duration-150"
                    style={atrasado ? { background: "#FFF1F2" } : {}}
                  >
                    <TableCell className="font-semibold">
                      <span className="flex items-center gap-1.5">
                        {atrasado && <AlertTriangle size={12} className="text-semantic-error flex-shrink-0" />}
                        {camion.patente}
                      </span>
                    </TableCell>
                    <TableCell className="font-display text-text-muted">{etiquetasTipo[camion.tipo] || camion.tipo}</TableCell>
                    <TableCell className="font-display">{camion.pedido?.cliente?.nombre || "—"}</TableCell>
                    <TableCell>{camion.anden?.codigo || "—"}</TableCell>
                    <TableCell className="font-data">
                      {camion.horaSalidaPlanificada ? (
                        <span style={atrasado ? { color: "#DC2626", fontWeight: 700 } : {}}>
                          {formatearHora(camion.horaSalidaPlanificada)}
                          {atrasado && ` (+${formatearAtraso(minutosAtraso(camion.horaSalidaPlanificada))})`}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
                        {etiquetasEstado[camion.estado] || camion.estado}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </div>
  );
}
