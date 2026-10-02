/**
 * Roles del sistema y los grupos de permisos que se repiten en la aplicación.
 *
 * La fuente de verdad es el enum `RolUsuario` de `apps/api/src/prisma/schema.prisma`.
 * Este archivo lo refleja para que el frontend no tenga que escribir los roles a mano.
 * La prueba `apps/api/src/auth/roles.spec.ts` falla si ambos dejan de coincidir.
 */
export const RolUsuario = {
  COORDINADOR_TRANSPORTE: "COORDINADOR_TRANSPORTE",
  COORDINADOR: "COORDINADOR",
  PICKINERO: "PICKINERO",
  CARGADOR: "CARGADOR",
  SUPERVISOR: "SUPERVISOR",
  OPERADOR_TUNEL: "OPERADOR_TUNEL",
  JEFE_DESPACHO: "JEFE_DESPACHO",
  SAG: "SAG",
  PORTERO: "PORTERO",
} as const;

/**
 * El rol tal como viaja en la API y en el token.
 *
 * Es un objeto constante y no un `enum` para que el tipo sea la unión de cadenas,
 * igual que el que genera Prisma. Así ambos lados encajan sin conversiones.
 */
export type RolUsuario = (typeof RolUsuario)[keyof typeof RolUsuario];

/** Alias corto, por legibilidad en las firmas. */
export type Rol = RolUsuario;

const R = RolUsuario;

/** Programan, asignan y corrigen el flujo de camiones. Acceden al grupo de rutas (platform). */
export const ROLES_GESTION_OPERATIVA: readonly Rol[] = [
  R.JEFE_DESPACHO,
  R.COORDINADOR_TRANSPORTE,
  R.COORDINADOR,
  R.SUPERVISOR,
];

/** Supervisan entregas y pallets. Sin coordinación de transporte. */
export const ROLES_SUPERVISION: readonly Rol[] = [R.JEFE_DESPACHO, R.COORDINADOR, R.SUPERVISOR];

/** Alcance global: no están restringidos a un edificio. */
export const ROLES_GLOBALES: readonly Rol[] = [R.JEFE_DESPACHO, R.COORDINADOR_TRANSPORTE, R.COORDINADOR];

/** Trabajan en planta. Acceden al grupo de rutas (operativo). */
export const ROLES_OPERATIVOS: readonly Rol[] = [R.PICKINERO, R.CARGADOR, R.OPERADOR_TUNEL, R.SUPERVISOR];

/**
 * Acceden al grupo de rutas (platform): es la unión de los roles que tienen al
 * menos una entrada de menú ahí. Quedan fuera picking, carga y SAG, que trabajan
 * en sus propias áreas.
 */
export const ROLES_PLATAFORMA: readonly Rol[] = [
  R.JEFE_DESPACHO,
  R.COORDINADOR_TRANSPORTE,
  R.COORDINADOR,
  R.SUPERVISOR,
  R.PORTERO,
  R.OPERADOR_TUNEL,
];

/** Arman pallets y cargan camiones, más quienes los supervisan. */
export const ROLES_PICKING_Y_CARGA: readonly Rol[] = [
  R.PICKINERO,
  R.CARGADOR,
  R.JEFE_DESPACHO,
  R.SUPERVISOR,
  R.COORDINADOR,
];

/** Operan la carga del camión en andén. */
export const ROLES_CARGA: readonly Rol[] = [R.CARGADOR, R.SUPERVISOR, R.JEFE_DESPACHO];

/** Operan el túnel de frío. */
export const ROLES_TUNEL: readonly Rol[] = [R.OPERADOR_TUNEL, R.JEFE_DESPACHO, R.SUPERVISOR];

/** Registran la llegada de camiones en portería. */
export const ROLES_PORTERIA: readonly Rol[] = [
  R.PORTERO,
  R.JEFE_DESPACHO,
  R.SUPERVISOR,
  R.COORDINADOR_TRANSPORTE,
  R.COORDINADOR,
];

/** Inspeccionan camiones de exportación. */
export const ROLES_INSPECCION_SAG: readonly Rol[] = [R.SAG, R.JEFE_DESPACHO];

/** Mantienen el catálogo de clientes y productos. */
export const ROLES_CATALOGO: readonly Rol[] = [R.JEFE_DESPACHO, R.COORDINADOR_TRANSPORTE];

/** Consultan el catálogo, incluido SAG para sus exportaciones. */
export const ROLES_CATALOGO_LECTURA: readonly Rol[] = [
  R.JEFE_DESPACHO,
  R.COORDINADOR_TRANSPORTE,
  R.COORDINADOR,
  R.SAG,
];
