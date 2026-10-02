/** Llamadas de andenes. */

import { fetchApi } from "./cliente-http";
import type { Anden } from "./tipos";

export async function listarAndenesApi(): Promise<Anden[]> {
  return fetchApi<Anden[]>('/andenes');
}

export async function marcarAndenFueraServicioApi(id: string, motivo: string): Promise<Anden> {
  return fetchApi<Anden>(`/andenes/${id}/fuera-servicio`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
}

export async function reactivarAndenApi(id: string): Promise<Anden> {
  return fetchApi<Anden>(`/andenes/${id}/reactivar`, { method: 'PATCH' });
}

// =====================
// Endpoints de Túneles de frío
// =====================
