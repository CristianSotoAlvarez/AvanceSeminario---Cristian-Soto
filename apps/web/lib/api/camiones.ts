/** Llamadas de camiones. */

import { fetchApi } from "./cliente-http";
import type { Camion, CamionDetalle, CrearCamionDatos, RegistrarIncidentePayload, RespuestaPaginada } from "./tipos";

export async function listarCamionesApi(filtros?: {
  estado?: string;
  tipo?: string;
  fecha?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<RespuestaPaginada<Camion>> {
  const params = new URLSearchParams();
  if (filtros?.estado)    params.set('estado',    filtros.estado);
  if (filtros?.tipo)      params.set('tipo',       filtros.tipo);
  if (filtros?.fecha)     params.set('fecha',      filtros.fecha);
  if (filtros?.pagina)    params.set('pagina',     String(filtros.pagina));
  if (filtros?.porPagina) params.set('porPagina',  String(filtros.porPagina));
  const query = params.toString();
  return fetchApi<RespuestaPaginada<Camion>>(`/camiones${query ? `?${query}` : ''}`);
}

export async function registrarIncidenteApi(camionId: string, datos: RegistrarIncidentePayload): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${camionId}/incidente`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function marcarReparadoApi(camionId: string): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${camionId}/marcar-reparado`, {
    method: 'POST',
  });
}

// =====================
// Portería
// =====================

export async function obtenerCamionApi(id: string): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${id}`);
}

// =====================
// Predicción de riesgo (árboles de decisión)
// =====================

export async function cambiarEstadoCamionApi(id: string, endpoint: string, body?: Record<string, unknown>) {
  return fetchApi<Camion>(`/camiones/${id}/${endpoint}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function crearCamionApi(datos: CrearCamionDatos): Promise<Camion> {
  return fetchApi<Camion>('/camiones', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// =====================
// Endpoints de Andenes
// =====================

export async function reordenarParadasApi(camionId: string, paradaIds: string[]): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${camionId}/paradas/reordenar`, {
    method: 'PATCH',
    body: JSON.stringify({ paradaIds }),
  });
}
