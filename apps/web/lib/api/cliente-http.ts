/** Cliente HTTP: token en memoria, cabeceras y refresco único en vuelo. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

let accessToken: string | null = null;

export function obtenerToken(): string | null {
  return accessToken;
}

export function guardarToken(token: string): void {
  accessToken = token;
}

export function limpiarToken(): void {
  accessToken = null;
}

export async function fetchApi<T>(endpoint: string, opciones: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opciones.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    ...opciones,
    headers,
    credentials: 'include',
  });

  if (respuesta.status === 401) {
    // Intentar renovar con la cookie de refresh, independiente de si hay token en memoria
    const refreshExitoso = await intentarRefresh();
    if (refreshExitoso) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      const reintento = await fetch(`${API_URL}${endpoint}`, {
        ...opciones,
        headers,
        credentials: 'include',
      });
      if (!reintento.ok) {
        const error = await reintento.json().catch(() => ({}));
        throw new ApiError(reintento.status, error.message || 'Error en la petición');
      }
      return reintento.json();
    } else {
      limpiarToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Sesión expirada');
    }
  }

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new ApiError(respuesta.status, error.message || 'Error en la petición');
  }

  return respuesta.json();
}

// Un único refresco en vuelo: si varias peticiones reciben 401 a la vez, todas
// esperan la misma promesa en vez de rotar la cookie de refresco en paralelo.

let refrescoEnCurso: Promise<boolean> | null = null;

async function intentarRefresh(): Promise<boolean> {
  if (refrescoEnCurso) return refrescoEnCurso;

  refrescoEnCurso = (async () => {
    try {
      const respuesta = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!respuesta.ok) return false;
      const datos = await respuesta.json();
      accessToken = datos.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refrescoEnCurso = null;
    }
  })();

  return refrescoEnCurso;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
