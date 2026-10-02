/** Llamadas de reportes. */

import { fetchApi } from "./cliente-http";
import type { ResumenReportes } from "./tipos";

export async function obtenerResumenReportesApi(params?: {
  desde?: string;
  hasta?: string;
}): Promise<ResumenReportes> {
  const query = new URLSearchParams();
  if (params?.desde) query.set('desde', params.desde);
  if (params?.hasta) query.set('hasta', params.hasta);
  const qs = query.toString();
  return fetchApi<ResumenReportes>(`/reportes/resumen${qs ? `?${qs}` : ''}`);
}

// =====================
// Pallets
// =====================

// ─── Productos ───────────────────────────────────────────────────────────────
