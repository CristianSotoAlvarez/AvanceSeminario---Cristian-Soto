/** Llamadas de justificaciones. */

import { fetchApi } from "./cliente-http";
import type { JustificacionAtraso } from "./tipos";

export async function justificarParadaApi(
  paradaId: string,
  datos: { causa: string; descripcion?: string; excluirDelCalculo?: boolean },
): Promise<JustificacionAtraso> {
  return fetchApi<JustificacionAtraso>(`/paradas/${paradaId}/justificar`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function eliminarJustificacionApi(paradaId: string): Promise<void> {
  return fetchApi<void>(`/paradas/${paradaId}/justificar`, { method: 'DELETE' });
}

// =====================
// Reportes
// =====================
