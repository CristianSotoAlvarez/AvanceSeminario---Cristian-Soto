"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { RefreshCw, Plus, X } from "lucide-react";
import { useCamiones } from "@/hooks/use-camiones";
import { cambiarEstadoCamionApi, crearCamionApi } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo, ACCIONES_ESTADO } from "@/lib/camion-config";
import { formatearHora } from "@/lib/formato";

function ModalCrearCamion({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const [patente, setPatente] = useState("");
  const [tipo, setTipo] = useState("NACIONAL");
  const [horaLlegada, setHoraLlegada] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearCamionApi({
        patente: patente.toUpperCase(),
        tipo,
        horaLlegadaPlanificada: new Date(horaLlegada).toISOString(),
        horaSalidaPlanificada: horaSalida ? new Date(horaSalida).toISOString() : undefined,
      });
      onCreado();
      onCerrar();
    } catch (err: any) {
      setError(err.message || "Error al crear camión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-modal-overlay flex items-center justify-center" style={{ background: "rgba(30,58,138,0.25)", backdropFilter: "blur(4px)" }}>
      <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-h3 uppercase text-text-primary tracking-wide">
            Nuevo Camión
          </h2>
          <button
            onClick={onCerrar}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-4">
          <Input
            label="Patente"
            placeholder="BXRK-42"
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="font-display text-label uppercase text-text-muted tracking-wide">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-10 px-3 rounded-sm border border-bg-elevated bg-bg-surface text-text-primary font-display text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              <option value="NACIONAL">Nacional</option>
              <option value="EXPORTACION">Exportación</option>
              <option value="INTERPLANTA">Interplanta</option>
            </select>
          </div>

          <Input
            label="Hora de llegada planificada"
            type="datetime-local"
            value={horaLlegada}
            onChange={(e) => setHoraLlegada(e.target.value)}
            required
          />

          <Input
            label="Hora de salida planificada (opcional)"
            type="datetime-local"
            value={horaSalida}
            onChange={(e) => setHoraSalida(e.target.value)}
          />

          {error && (
            <p className="text-semantic-error text-sm text-center">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={enviando || !patente || !horaLlegada}
            >
              {enviando ? "Creando..." : "Crear Camión"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CamionesPage() {
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const { camiones, cargando, recargar } = useCamiones(
    filtroEstado ? { estado: filtroEstado } : undefined,
  );
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

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
      {mostrarModal && (
        <ModalCrearCamion
          onCerrar={() => setMostrarModal(false)}
          onCreado={recargar}
        />
      )}

      {/* Barra de filtros y acciones */}
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

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={recargar}>
            <RefreshCw size={14} className="mr-1" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setMostrarModal(true)}>
            <Plus size={14} className="mr-1" />
            Nuevo Camión
          </Button>
        </div>
      </div>

      {/* Tabla */}
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
                  {formatearHora(camion.horaLlegadaPlanificada)}
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
