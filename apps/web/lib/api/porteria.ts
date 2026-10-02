/** Llamadas de porteria. */

import { API_URL, ApiError, fetchApi } from "./cliente-http";
import type { CamionPorteria } from "./tipos";

export async function obtenerPorteriaPorTokenApi(token: string): Promise<CamionPorteria> {
  const respuesta = await fetch(`${API_URL}/porteria/qr/${token}`);
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiError(respuesta.status, error.message ?? 'QR no válido');
  }
  return respuesta.json();
}

/** Llamada pública (sin auth) para confirmar la llegada vía token. */

export async function confirmarPorteriaPorTokenApi(token: string): Promise<CamionPorteria> {
  const respuesta = await fetch(`${API_URL}/porteria/qr/${token}/confirmar`, { method: 'POST' });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiError(respuesta.status, error.message ?? 'Error al confirmar');
  }
  return respuesta.json();
}

/** Lista camiones planificados de hoy (autenticado, rol PORTERO+). */

export async function listarCamionesHoyApi(): Promise<CamionPorteria[]> {
  return fetchApi<CamionPorteria[]>('/porteria/camiones-hoy');
}

/** Confirma llegada por ID desde la pantalla autenticada. */

export async function confirmarLlegadaPorIdApi(camionId: string): Promise<CamionPorteria> {
  return fetchApi<CamionPorteria>(`/porteria/camion/${camionId}/confirmar`, { method: 'POST' });
}
