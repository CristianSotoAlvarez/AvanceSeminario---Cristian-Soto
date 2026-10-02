import { type Rol, RolUsuario } from "@dispatch-track/types";

/**
 * Pantalla con la que arranca cada rol.
 *
 * La usan el login tras autenticar y los layouts de cada área cuando alguien
 * llega por URL a una zona que no le corresponde, de modo que el redirigido
 * acabe en su propia pantalla y no en un bucle.
 */
export function rutaInicialPorRol(rol: Rol): string {
  switch (rol) {
    case RolUsuario.PORTERO:
      return "/porteria";
    case RolUsuario.PICKINERO:
      return "/picking";
    case RolUsuario.CARGADOR:
      return "/carga";
    case RolUsuario.OPERADOR_TUNEL:
      return "/tunel";
    case RolUsuario.SAG:
      return "/exportaciones";
    default:
      return "/dashboard";
  }
}
