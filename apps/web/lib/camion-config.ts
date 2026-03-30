/** Etiquetas legibles para estados de camión */
export const etiquetasEstado: Record<string, string> = {
  ESPERADO: "ESPERADO",
  EN_PORTERIA: "EN PORTERÍA",
  ASIGNADO: "ASIGNADO",
  EN_CARGA: "EN CARGA",
  EN_TUNEL_FRIO: "EN TÚNEL FRÍO",
  ESPERANDO_SAG: "ESPERANDO SAG",
  APROBADO_SAG: "APROBADO SAG",
  RECHAZADO_SAG: "RECHAZADO SAG",
  LISTO: "LISTO",
  DESPACHADO: "DESPACHADO",
};

/** Etiquetas legibles para tipos de camión */
export const etiquetasTipo: Record<string, string> = {
  NACIONAL: "Nacional",
  EXPORTACION: "Exportación",
  INTERPLANTA: "Interplanta",
};

/** Acciones disponibles por estado (endpoint + label) */
export const ACCIONES_ESTADO: Record<string, { endpoint: string; label: string }[]> = {
  EN_PORTERIA: [{ endpoint: "asignar", label: "Asignar Andén" }],
  ASIGNADO: [{ endpoint: "iniciar-carga", label: "Iniciar Carga" }],
  EN_CARGA: [{ endpoint: "finalizar-carga", label: "Finalizar Carga" }],
  EN_TUNEL_FRIO: [{ endpoint: "temperatura-ok", label: "Temp. OK" }],
};
