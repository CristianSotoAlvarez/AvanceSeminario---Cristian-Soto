/** Llamadas de busqueda. */

import { fetchApi } from "./cliente-http";
import type { ResultadoBusqueda } from "./tipos";

export async function buscarApi(q: string): Promise<ResultadoBusqueda> {
  return fetchApi<ResultadoBusqueda>(`/busqueda?q=${encodeURIComponent(q)}`);
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────
