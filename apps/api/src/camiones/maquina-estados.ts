import { EstadoCamion, TipoCamion } from '@prisma/client';

/**
 * Define las transiciones válidas de estado para cada tipo de camión.
 * Clave: estado actual → Valor: estados a los que puede transicionar.
 */
const TRANSICIONES_NACIONAL: Partial<Record<EstadoCamion, EstadoCamion[]>> = {
  ESPERADO: [EstadoCamion.EN_PORTERIA],
  EN_PORTERIA: [EstadoCamion.ASIGNADO],
  ASIGNADO: [EstadoCamion.EN_CARGA],
  EN_CARGA: [EstadoCamion.LISTO],
  LISTO: [EstadoCamion.DESPACHADO],
};

const TRANSICIONES_EXPORTACION: Partial<Record<EstadoCamion, EstadoCamion[]>> = {
  ESPERADO: [EstadoCamion.EN_PORTERIA],
  EN_PORTERIA: [EstadoCamion.ASIGNADO],
  ASIGNADO: [EstadoCamion.EN_CARGA],
  EN_CARGA: [EstadoCamion.EN_TUNEL_FRIO],
  EN_TUNEL_FRIO: [EstadoCamion.ESPERANDO_SAG],
  ESPERANDO_SAG: [EstadoCamion.APROBADO_SAG, EstadoCamion.RECHAZADO_SAG],
  APROBADO_SAG: [EstadoCamion.LISTO],
  RECHAZADO_SAG: [EstadoCamion.ESPERANDO_SAG], // Re-inspección tras corrección
  LISTO: [EstadoCamion.DESPACHADO],
};

const TRANSICIONES_INTERPLANTA = TRANSICIONES_NACIONAL;

const MAPA_TRANSICIONES: Record<TipoCamion, Partial<Record<EstadoCamion, EstadoCamion[]>>> = {
  NACIONAL: TRANSICIONES_NACIONAL,
  EXPORTACION: TRANSICIONES_EXPORTACION,
  INTERPLANTA: TRANSICIONES_INTERPLANTA,
};

/** Verifica si una transición de estado es válida para el tipo de camión */
export function esTransicionValida(
  tipoCamion: TipoCamion,
  estadoActual: EstadoCamion,
  nuevoEstado: EstadoCamion,
): boolean {
  const transiciones = MAPA_TRANSICIONES[tipoCamion];
  const estadosPermitidos = transiciones[estadoActual];

  if (!estadosPermitidos) return false;

  return estadosPermitidos.includes(nuevoEstado);
}

/** Obtiene los estados siguientes válidos para un camión */
export function obtenerEstadosSiguientes(
  tipoCamion: TipoCamion,
  estadoActual: EstadoCamion,
): EstadoCamion[] {
  const transiciones = MAPA_TRANSICIONES[tipoCamion];
  return transiciones[estadoActual] || [];
}
