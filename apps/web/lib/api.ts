/**
 * Punto de entrada de la capa de acceso a la API.
 *
 * Reexporta cada módulo para que el resto de la aplicación siga importando
 * desde "@/lib/api" sin conocer el reparto interno por dominio.
 */

export * from "./api/cliente-http";
export * from "./api/tipos";
export * from "./api/andenes";
export * from "./api/auth";
export * from "./api/busqueda";
export * from "./api/camiones";
export * from "./api/clientes";
export * from "./api/entregas";
export * from "./api/justificaciones";
export * from "./api/pallets";
export * from "./api/porteria";
export * from "./api/prediccion";
export * from "./api/productos";
export * from "./api/qr";
export * from "./api/reportes";
export * from "./api/tuneles";
export * from "./api/usuarios";
