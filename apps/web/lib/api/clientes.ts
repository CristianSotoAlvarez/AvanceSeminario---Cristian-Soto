/** Llamadas de clientes. */

import { fetchApi } from "./cliente-http";
import type { Cliente, ClienteConCamiones } from "./tipos";

export async function listarClientesApi(tipo?: string): Promise<Cliente[]> {
  const qs = tipo ? `?tipo=${tipo}` : '';
  return fetchApi<Cliente[]>(`/clientes${qs}`);
}

export async function obtenerClienteApi(id: string): Promise<ClienteConCamiones> {
  return fetchApi<ClienteConCamiones>(`/clientes/${id}`);
}

export async function crearClienteApi(datos: {
  nombre: string;
  rut?: string;
  codigo?: string;
  tipoDestino: string;
  pais?: string;
}): Promise<Cliente> {
  return fetchApi<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(datos) });
}

export async function actualizarClienteApi(id: string, datos: Partial<{
  nombre: string;
  rut: string;
  codigo: string;
  tipoDestino: string;
  pais: string;
  activo: boolean;
}>): Promise<Cliente> {
  return fetchApi<Cliente>(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export async function eliminarClienteApi(id: string): Promise<void> {
  return fetchApi<void>(`/clientes/${id}`, { method: 'DELETE' });
}

// ─── QR ───────────────────────────────────────────────────────────────────────
