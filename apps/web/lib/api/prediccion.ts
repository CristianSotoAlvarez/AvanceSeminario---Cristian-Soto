/** Llamadas de prediccion. */

import { fetchApi } from "./cliente-http";
import type { PrediccionCamion } from "./tipos";

export async function predecirCamionApi(camionId: string): Promise<PrediccionCamion> {
  return fetchApi<PrediccionCamion>(`/prediccion/${camionId}`);
}
