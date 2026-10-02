/** Llamadas de productos. */

import { fetchApi } from "./cliente-http";
import type { Producto } from "./tipos";

export async function listarProductosApi(): Promise<Producto[]> {
  return fetchApi<Producto[]>('/productos');
}

export async function crearProductoApi(datos: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: number }): Promise<Producto> {
  return fetchApi<Producto>('/productos', { method: 'POST', body: JSON.stringify(datos) });
}

export async function actualizarProductoApi(id: string, datos: { nombre?: string; unidadMedida?: string; pesoKgUnitario?: number; activo?: boolean }): Promise<Producto> {
  return fetchApi<Producto>(`/productos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export async function importarProductosCsvApi(filas: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: string }[]): Promise<{ creados: number; actualizados: number; errores: string[] }> {
  return fetchApi('/productos/importar-csv', { method: 'POST', body: JSON.stringify({ filas }) });
}
