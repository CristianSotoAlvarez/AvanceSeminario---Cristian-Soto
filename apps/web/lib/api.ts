const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

async function fetchApi<T>(endpoint: string, opciones: RequestInit = {}): Promise<T> {
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

  if (respuesta.status === 401 && accessToken) {
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

async function intentarRefresh(): Promise<boolean> {
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
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  edificioId: string | null;
}

export interface RespuestaLogin {
  accessToken: string;
  usuario: UsuarioAuth;
}

export async function loginApi(identificador: string, password: string): Promise<RespuestaLogin> {
  const datos = await fetchApi<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identificador, password }),
  });
  accessToken = datos.accessToken;
  return datos;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } finally {
    limpiarToken();
  }
}

export async function obtenerPerfilApi(): Promise<UsuarioAuth> {
  return fetchApi<UsuarioAuth>('/auth/me');
}

export interface Camion {
  id: string;
  patente: string;
  tipo: string;
  estado: string;
  andenId: string | null;
  anden: { id: string; codigo: string } | null;
  pedido: { id: string; numero: string; cliente: { nombre: string } } | null;
  horaLlegadaPlanificada: string;
  horaSalidaPlanificada: string | null;
  horaLlegadaReal: string | null;
  horaSalidaReal: string | null;
  creadoEn: string;
}

export async function listarCamionesApi(filtros?: { estado?: string; tipo?: string }): Promise<Camion[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.tipo) params.set('tipo', filtros.tipo);
  const query = params.toString();
  return fetchApi<Camion[]>(`/camiones${query ? `?${query}` : ''}`);
}

export async function obtenerCamionApi(id: string) {
  return fetchApi<Camion & { eventos: any[]; estadosSiguientes: string[] }>(`/camiones/${id}`);
}

export async function cambiarEstadoCamionApi(id: string, endpoint: string, body?: Record<string, unknown>) {
  return fetchApi<Camion>(`/camiones/${id}/${endpoint}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export interface CrearCamionDatos {
  patente: string;
  tipo: string;
  horaLlegadaPlanificada: string;
  horaSalidaPlanificada?: string;
}

export async function crearCamionApi(datos: CrearCamionDatos): Promise<Camion> {
  return fetchApi<Camion>('/camiones', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// =====================
// Endpoints de Andenes
// =====================

export interface Anden {
  id: string;
  codigo: string;
  ocupado: boolean;
  edificio: { id: string; nombre: string; tipo: string };
  camiones: Camion[];
}

export async function listarAndenesApi(): Promise<Anden[]> {
  return fetchApi<Anden[]>('/andenes');
}
