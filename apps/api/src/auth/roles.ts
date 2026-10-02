import { RolUsuario } from '@prisma/client';

/**
 * Grupos de roles que se repiten entre los controladores.
 *
 * Se derivan del enum `RolUsuario` que genera Prisma, de modo que un rol mal escrito
 * no compila. El paquete `@dispatch-track/types` mantiene la copia que consume el
 * frontend; `roles.spec.ts` verifica que ambas listas sigan siendo idénticas.
 *
 * No se importa aquí el paquete compartido a propósito: publica TypeScript sin compilar
 * y `nest build` lo dejaría como un `require` irresoluble en la imagen de producción.
 */

/** Programan, asignan y corrigen el flujo de camiones. */
export const ROLES_GESTION_OPERATIVA: readonly RolUsuario[] = [
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.COORDINADOR_TRANSPORTE,
  RolUsuario.COORDINADOR,
  RolUsuario.SUPERVISOR,
];

/** Supervisan entregas y pallets. Sin coordinación de transporte. */
export const ROLES_SUPERVISION: readonly RolUsuario[] = [
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.COORDINADOR,
  RolUsuario.SUPERVISOR,
];

/** Alcance global: no están restringidos a un edificio. */
export const ROLES_GLOBALES: readonly RolUsuario[] = [
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.COORDINADOR_TRANSPORTE,
  RolUsuario.COORDINADOR,
];

/** Trabajan en planta. */
export const ROLES_OPERATIVOS: readonly RolUsuario[] = [
  RolUsuario.PICKINERO,
  RolUsuario.CARGADOR,
  RolUsuario.OPERADOR_TUNEL,
  RolUsuario.SUPERVISOR,
];

/** Arman pallets y cargan camiones, más quienes los supervisan. */
export const ROLES_PICKING_Y_CARGA: readonly RolUsuario[] = [
  RolUsuario.PICKINERO,
  RolUsuario.CARGADOR,
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.SUPERVISOR,
  RolUsuario.COORDINADOR,
];

/** Operan la carga del camión en andén. */
export const ROLES_CARGA: readonly RolUsuario[] = [
  RolUsuario.CARGADOR,
  RolUsuario.SUPERVISOR,
  RolUsuario.JEFE_DESPACHO,
];

/** Operan el túnel de frío. */
export const ROLES_TUNEL: readonly RolUsuario[] = [
  RolUsuario.OPERADOR_TUNEL,
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.SUPERVISOR,
];

/** Registran la llegada de camiones en portería. */
export const ROLES_PORTERIA: readonly RolUsuario[] = [
  RolUsuario.PORTERO,
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.SUPERVISOR,
  RolUsuario.COORDINADOR_TRANSPORTE,
  RolUsuario.COORDINADOR,
];

/** Inspeccionan camiones de exportación. */
export const ROLES_INSPECCION_SAG: readonly RolUsuario[] = [RolUsuario.SAG, RolUsuario.JEFE_DESPACHO];

/** Mantienen el catálogo de clientes y productos. */
export const ROLES_CATALOGO: readonly RolUsuario[] = [RolUsuario.JEFE_DESPACHO, RolUsuario.COORDINADOR_TRANSPORTE];

/** Consultan el catálogo, incluido SAG para sus exportaciones. */
export const ROLES_CATALOGO_LECTURA: readonly RolUsuario[] = [
  RolUsuario.JEFE_DESPACHO,
  RolUsuario.COORDINADOR_TRANSPORTE,
  RolUsuario.COORDINADOR,
  RolUsuario.SAG,
];
