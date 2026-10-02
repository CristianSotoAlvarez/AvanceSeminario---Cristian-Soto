import type { Rol } from "@dispatch-track/types";
/** Llamadas de usuarios. */

import { fetchApi } from "./cliente-http";
import type { UsuarioAdmin } from "./tipos";

export async function listarUsuariosApi(): Promise<UsuarioAdmin[]> {
  return fetchApi<UsuarioAdmin[]>('/usuarios');
}

export async function crearUsuarioApi(datos: {
  nombre: string;
  rut: string;
  email: string;
  password: string;
  rol: Rol;
  edificioId?: string;
}): Promise<UsuarioAdmin> {
  return fetchApi<UsuarioAdmin>('/usuarios', { method: 'POST', body: JSON.stringify(datos) });
}

export async function actualizarUsuarioApi(id: string, datos: {
  nombre?: string;
  email?: string;
  rol?: string;
  edificioId?: string;
  password?: string;
}): Promise<UsuarioAdmin> {
  return fetchApi<UsuarioAdmin>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export async function desactivarUsuarioApi(id: string): Promise<void> {
  return fetchApi<void>(`/usuarios/${id}`, { method: 'DELETE' });
}
