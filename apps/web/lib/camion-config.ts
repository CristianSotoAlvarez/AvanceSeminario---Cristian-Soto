import type { Camion } from "./api";

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

const ETIQUETA_EDIFICIO: Record<string, string> = {
  AVES: "Aves",
  CERDO: "Cerdo",
  FRIGORIFICO: "Frigorifico",
};

export interface AccionCamion {
  endpoint: string;
  label: string;
  /** Si true, la acción lleva al camión a otro andén (requiere modal de asignación) */
  esTransito?: boolean;
  /** Estilo visual: 'danger' | 'success' | 'warning' | 'default' */
  variante?: "danger" | "success" | "warning" | "default";
}

/**
 * Acciones estáticas para estados que no dependen de paradas.
 * EN_CARGA se resuelve dinámicamente en obtenerAcciones().
 */
const ACCIONES_BASE: Record<string, AccionCamion[]> = {
  ESPERADO:      [{ endpoint: "en-porteria",    label: "Marcar Llegada" }],
  EN_PORTERIA:   [{ endpoint: "asignar",         label: "Asignar Andén", esTransito: true }],
  ASIGNADO:      [{ endpoint: "iniciar-carga",   label: "Iniciar Carga" }],
  EN_TUNEL_FRIO: [{ endpoint: "temperatura-ok",  label: "Temp. OK (-18°C)", variante: "warning" }],
  ESPERANDO_SAG: [
    { endpoint: "aprobar-sag",  label: "Aprobar SAG",  variante: "success" },
    { endpoint: "rechazar-sag", label: "Rechazar SAG", variante: "danger"  },
  ],
  RECHAZADO_SAG: [{ endpoint: "reinspeccionar", label: "Re-inspeccionar" }],
  APROBADO_SAG:  [{ endpoint: "listo",           label: "Marcar Listo",  variante: "success" }],
  LISTO:         [{ endpoint: "despachar",        label: "Despachar 🚛",   variante: "success" }],
};

/**
 * Devuelve las acciones contextuales para un camión según su estado y paradas.
 * Para EN_CARGA distingue si es la última parada o hay más por hacer.
 */
export function obtenerAcciones(camion: Camion): AccionCamion[] {
  if (camion.estado !== "EN_CARGA") {
    return ACCIONES_BASE[camion.estado] ?? [];
  }

  const proximaParada = camion.paradas?.find((p) => p.estado === "PENDIENTE");

  if (proximaParada) {
    // Hay más paradas — el botón indica el destino siguiente
    const labelEdificio = ETIQUETA_EDIFICIO[proximaParada.edificioTipo] ?? proximaParada.edificioTipo;
    return [{
      endpoint: "finalizar-carga",
      label: `Finalizar → ${labelEdificio}`,
      esTransito: true,
      variante: "warning",
    }];
  }

  // Última parada: exportación va a túnel frío, el resto a LISTO→despacho
  const esExportacion = camion.tipo === "EXPORTACION";
  return [{
    endpoint: "finalizar-carga",
    label: esExportacion ? "Finalizar → Túnel Frío" : "Finalizar → Despacho",
    variante: "success",
  }];
}

/** Compatibilidad: objeto estático para las páginas que no usan contexto de paradas */
export const ACCIONES_ESTADO: Record<string, AccionCamion[]> = {
  ...ACCIONES_BASE,
  EN_CARGA: [{ endpoint: "finalizar-carga", label: "Finalizar Carga" }],
};
