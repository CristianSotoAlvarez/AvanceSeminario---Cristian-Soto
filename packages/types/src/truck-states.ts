export enum TruckState {
  ESPERADO = "ESPERADO",
  EN_PORTERIA = "EN_PORTERIA",
  ASIGNADO = "ASIGNADO",
  EN_CARGA = "EN_CARGA",
  EN_TUNEL_FRIO = "EN_TUNEL_FRIO",
  ESPERANDO_SAG = "ESPERANDO_SAG",
  APROBADO_SAG = "APROBADO_SAG",
  RECHAZADO_SAG = "RECHAZADO_SAG",
  LISTO = "LISTO",
  DESPACHADO = "DESPACHADO",
  AVERIADO = "AVERIADO",
}

export enum TruckType {
  NACIONAL = "NACIONAL",
  EXPORTACION = "EXPORTACION",
  INTERPLANTA = "INTERPLANTA",
}

export type SemanticColor = "success" | "error" | "warning" | "info" | "active" | "neutral";

export const TRUCK_STATE_COLOR: Record<TruckState, SemanticColor> = {
  [TruckState.ESPERADO]: "neutral",
  [TruckState.EN_PORTERIA]: "info",
  [TruckState.ASIGNADO]: "warning",
  [TruckState.EN_CARGA]: "active",
  [TruckState.EN_TUNEL_FRIO]: "info",
  [TruckState.ESPERANDO_SAG]: "warning",
  [TruckState.APROBADO_SAG]: "success",
  [TruckState.RECHAZADO_SAG]: "error",
  [TruckState.LISTO]: "success",
  [TruckState.DESPACHADO]: "success",
  [TruckState.AVERIADO]: "error",
};
