/** Llamadas de qr. */

import { fetchApi } from "./cliente-http";

export async function generarQrCamionApi(id: string): Promise<{ token: string; tipo: string; entidadId: string }> {
  return fetchApi(`/qr/camion/${id}`);
}

export async function validarQrApi(token: string): Promise<{ tipo: string; entidadId: string; timestamp: number }> {
  return fetchApi(`/qr/validar/${token}`);
}

// ─── Búsqueda global ──────────────────────────────────────────────────────────
