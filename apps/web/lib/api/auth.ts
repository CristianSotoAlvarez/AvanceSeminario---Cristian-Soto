/** Llamadas de auth. */

import { fetchApi, guardarToken, limpiarToken } from "./cliente-http";
import type { RespuestaLogin, UsuarioAuth } from "./tipos";

export async function loginApi(identificador: string, password: string): Promise<RespuestaLogin> {
  const datos = await fetchApi<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identificador, password }),
  });
  guardarToken(datos.accessToken);
  return datos;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } catch {
    // Si el token ya expiró el servidor retorna 401 — limpiar igual
  } finally {
    limpiarToken();
  }
}

export async function obtenerPerfilApi(): Promise<UsuarioAuth> {
  return fetchApi<UsuarioAuth>('/auth/me');
}
