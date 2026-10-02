/** Llamadas de entregas. */

import { fetchApi } from "./cliente-http";
import type { Entrega, EntregaItem } from "./tipos";

export async function listarEntregasPorCamionApi(camionId: string): Promise<Entrega[]> {
  return fetchApi<Entrega[]>(`/camiones/${camionId}/entregas`);
}

export async function obtenerEntregaApi(id: string): Promise<Entrega> {
  return fetchApi<Entrega>(`/entregas/${id}`);
}

export async function crearEntregaApi(datos: {
  camionId: string;
  paradaId?: string;
}): Promise<Entrega> {
  return fetchApi<Entrega>('/entregas', { method: 'POST', body: JSON.stringify(datos) });
}

export async function eliminarEntregaApi(id: string): Promise<void> {
  return fetchApi<void>(`/entregas/${id}`, { method: 'DELETE' });
}

export async function obtenerItemsEntregaApi(entregaId: string): Promise<EntregaItem[]> {
  return fetchApi<EntregaItem[]>(`/productos/entrega/${entregaId}`);
}

export async function setItemsEntregaApi(entregaId: string, items: { productoId: string; cantidadSolicitada: number }[]): Promise<EntregaItem[]> {
  return fetchApi<EntregaItem[]>(`/productos/entrega/${entregaId}`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// ─── Clientes ─────────────────────────────────────────────────────────────────
