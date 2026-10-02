/** Llamadas de pallets. */

import { fetchApi } from "./cliente-http";
import type { Pallet, RespuestaPaginada } from "./tipos";

export async function listarPalletsApi(filtros?: {
  estado?: string;
  edificioId?: string;
  entregaId?: string;
  fecha?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<RespuestaPaginada<Pallet>> {
  const params = new URLSearchParams();
  if (filtros?.estado)     params.set('estado',     filtros.estado);
  if (filtros?.edificioId) params.set('edificioId', filtros.edificioId);
  if (filtros?.entregaId)  params.set('entregaId',  filtros.entregaId);
  if (filtros?.fecha)      params.set('fecha',      filtros.fecha);
  if (filtros?.pagina)     params.set('pagina',     String(filtros.pagina));
  if (filtros?.porPagina)  params.set('porPagina',  String(filtros.porPagina));
  const qs = params.toString();
  return fetchApi<RespuestaPaginada<Pallet>>(`/pallets${qs ? `?${qs}` : ''}`);
}

export async function obtenerPalletApi(id: string): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${id}`);
}

export async function crearPalletApi(datos: {
  entregaId?: string;
  pedidoId?: string;
  edificioId?: string;
}): Promise<Pallet> {
  return fetchApi<Pallet>('/pallets', { method: 'POST', body: JSON.stringify(datos) });
}

// =====================
// Entregas
// =====================

export async function agregarProductoPalletApi(
  palletId: string,
  datos: { codigoBarras: string; descripcion: string; cantidad: number; pesoKg: number; temperatura?: number },
): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/productos`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function cambiarEstadoPalletApi(palletId: string, estado: string): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function setItemPalletApi(palletId: string, productoId: string, cantidad: number): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/items/${productoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ cantidad }),
  });
}

export async function cerrarYCrearNuevoPalletApi(palletId: string): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/cerrar-y-crear-nuevo`, { method: 'POST' });
}

// ─── Productos ────────────────────────────────────────────────────────────────
