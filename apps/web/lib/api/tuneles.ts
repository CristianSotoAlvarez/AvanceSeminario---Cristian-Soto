/** Llamadas de tuneles. */

import { fetchApi } from "./cliente-http";
import type { Camion, TunelFrio } from "./tipos";

export async function listarTunelesApi(): Promise<TunelFrio[]> {
  return fetchApi<TunelFrio[]>('/tuneles');
}

export async function ingresarTunelApi(camionId: string, tunelId: string): Promise<Camion> {
  return fetchApi<Camion>(`/tuneles/${camionId}/ingresar`, {
    method: 'PATCH',
    body: JSON.stringify({ tunelId }),
  });
}

export async function marcarTunelFueraServicioApi(id: string, motivo: string): Promise<TunelFrio> {
  return fetchApi<TunelFrio>(`/tuneles/${id}/fuera-servicio`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
}

export async function reactivarTunelApi(id: string): Promise<TunelFrio> {
  return fetchApi<TunelFrio>(`/tuneles/${id}/reactivar`, { method: 'PATCH' });
}

// =====================
// Justificaciones
// =====================
