import { KpiCard, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";

const camionesMock = [
  { plate: "BXRK-42", type: "Nacional", client: "Walmart Chile", dock: "A3", time: "08:30", state: TruckState.EN_CARGA },
  { plate: "HJTL-87", type: "Exportación", client: "Costco USA", dock: "F2", time: "07:45", state: TruckState.EN_TUNEL_FRIO },
  { plate: "PLWZ-15", type: "Nacional", client: "SMU / Unimarc", dock: "C1", time: "09:00", state: TruckState.LISTO },
  { plate: "DRKM-63", type: "Interplanta", client: "Planta Rosario", dock: "—", time: "10:15", state: TruckState.ESPERADO },
];

const etiquetasEstado: Record<TruckState, string> = {
  [TruckState.ESPERADO]: "ESPERADO",
  [TruckState.EN_PORTERIA]: "EN PORTERÍA",
  [TruckState.ASIGNADO]: "ASIGNADO",
  [TruckState.EN_CARGA]: "EN CARGA",
  [TruckState.EN_TUNEL_FRIO]: "EN TÚNEL FRÍO",
  [TruckState.ESPERANDO_SAG]: "ESPERANDO SAG",
  [TruckState.APROBADO_SAG]: "APROBADO SAG",
  [TruckState.RECHAZADO_SAG]: "RECHAZADO SAG",
  [TruckState.LISTO]: "LISTO",
  [TruckState.DESPACHADO]: "DESPACHADO",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Fila de KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Camiones Hoy" value={47} valueColor="#F56E0F" trend={{ value: "12% vs ayer", positive: true }} />
        <KpiCard label="Despachos a Tiempo" value="89%" valueColor="#7AB87A" trend={{ value: "3% vs ayer", positive: false }} />
        <KpiCard label="Andenes Ocupados" value="8/11" />
        <KpiCard label="Atrasos" value={5} valueColor="#D4807A" />
      </div>

      {/* Tabla de camiones */}
      <div>
        <h2 className="font-display text-h3 uppercase text-text-primary mb-4">
          Camiones Activos
        </h2>
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
            {camionesMock.map((camion) => (
              <TableRow key={camion.plate}>
                <TableCell className="font-semibold">{camion.plate}</TableCell>
                <TableCell className="font-display text-text-muted">{camion.type}</TableCell>
                <TableCell className="font-display">{camion.client}</TableCell>
                <TableCell>{camion.dock}</TableCell>
                <TableCell>{camion.time}</TableCell>
                <TableCell>
                  <Badge color={TRUCK_STATE_COLOR[camion.state]}>
                    {etiquetasEstado[camion.state]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
