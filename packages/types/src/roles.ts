export enum UserRole {
  COORDINADOR_TRANSPORTE = "COORDINADOR_TRANSPORTE",
  COORDINADOR = "COORDINADOR",
  PICKINERO = "PICKINERO",
  CARGADOR = "CARGADOR",
  SUPERVISOR = "SUPERVISOR",
  OPERADOR_TUNEL = "OPERADOR_TUNEL",
  JEFE_DESPACHO = "JEFE_DESPACHO",
  SAG = "SAG",
}

/** Roles que acceden al grupo de rutas (platform) */
export const PLATFORM_ROLES: UserRole[] = [
  UserRole.JEFE_DESPACHO,
  UserRole.COORDINADOR,
  UserRole.COORDINADOR_TRANSPORTE,
  UserRole.SUPERVISOR,
];

/** Roles que acceden al grupo de rutas (operativo) */
export const OPERATIVO_ROLES: UserRole[] = [
  UserRole.PICKINERO,
  UserRole.CARGADOR,
  UserRole.OPERADOR_TUNEL,
  UserRole.SUPERVISOR,
];

/** Roles con alcance global (no restringidos a un edificio) */
export const GLOBAL_ROLES: UserRole[] = [
  UserRole.JEFE_DESPACHO,
  UserRole.COORDINADOR,
  UserRole.COORDINADOR_TRANSPORTE,
];
