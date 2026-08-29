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
  polivalente?: boolean;
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
  } catch {
    // Si el token ya expiró el servidor retorna 401 — limpiar igual
  } finally {
    limpiarToken();
  }
}

export async function obtenerPerfilApi(): Promise<UsuarioAuth> {
  return fetchApi<UsuarioAuth>('/auth/me');
}

export interface JustificacionAtraso {
  id: string;
  causa: string;
  descripcion: string | null;
  excluirDelCalculo: boolean;
  registradoPor: { nombre: string; rol: string } | null;
  creadoEn: string;
}

export interface ParadaExpedicion {
  id: string;
  edificioTipo: string;   // 'AVES' | 'CERDO' | 'FRIGORIFICO'
  orden: number;
  estado: string;         // 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'
  cantidadPalletsSolicitados: number | null;
  andenId: string | null;
  anden: { id: string; codigo: string; edificio: { nombre: string; tipo: string } } | null;
  horaInicio: string | null;
  horaFin: string | null;
  justificacion: JustificacionAtraso | null;
  entrega: { pallets: { id: string; estado: string }[] } | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  rut: string | null;
  codigo: string | null;
  tipoDestino: string;  // 'NACIONAL' | 'EXPORTACION' | 'INTERPLANTA'
  pais: string | null;
  activo: boolean;
  creadoEn: string;
  _count?: { camiones: number };
}

export interface Camion {
  id: string;
  patente: string;
  numeroTransporte: string | null;
  tipo: string;
  estado: string;
  clienteId: string | null;
  cliente: Cliente | null;
  andenId: string | null;
  anden: { id: string; codigo: string } | null;
  tunelId: string | null;
  tunel: { id: string; codigo: string } | null;
  pedido: { id: string; numero: string; cliente: { nombre: string } } | null;
  horaLlegadaPlanificada: string;
  horaSalidaPlanificada: string | null;
  horaLlegadaReal: string | null;
  horaSalidaReal: string | null;
  enReparacion?: boolean;
  reparacionDesde?: string | null;
  reemplazadoPorId?: string | null;
  creadoEn: string;
  paradas: ParadaExpedicion[];
}

export interface PaginaMeta {
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface RespuestaPaginada<T> {
  datos: T[];
  meta: PaginaMeta;
}

export async function listarCamionesApi(filtros?: {
  estado?: string;
  tipo?: string;
  fecha?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<RespuestaPaginada<Camion>> {
  const params = new URLSearchParams();
  if (filtros?.estado)    params.set('estado',    filtros.estado);
  if (filtros?.tipo)      params.set('tipo',       filtros.tipo);
  if (filtros?.fecha)     params.set('fecha',      filtros.fecha);
  if (filtros?.pagina)    params.set('pagina',     String(filtros.pagina));
  if (filtros?.porPagina) params.set('porPagina',  String(filtros.porPagina));
  const query = params.toString();
  return fetchApi<RespuestaPaginada<Camion>>(`/camiones${query ? `?${query}` : ''}`);
}

export interface EventoCamion {
  id: string;
  estado: string;
  nota: string | null;
  timestamp: string;
  usuario: { nombre: string; rol: string } | null;
}

export interface InspeccionSAG {
  id: string;
  estado: string;  // 'APROBADO' | 'RECHAZADO'
  observaciones: string | null;
  timestampInicio: string | null;
  timestampResolucion: string | null;
  inspector: { nombre: string; rol: string } | null;
}

export interface EntregaResumen {
  id: string;
  numero: number;
  paradaId: string | null;
  pallets: { id: string; codigoUnico: string; estado: string }[];
  creadoEn: string;
}

export interface CamionDetalle extends Camion {
  eventos: EventoCamion[];
  estadosSiguientes: string[];
  inspecciones: InspeccionSAG[];
  entregas: EntregaResumen[];
}

export type TipoIncidente = 'AVERIA' | 'FALTA_PRODUCTO' | 'CAMBIO_ANDEN' | 'REPROGRAMACION';
export type AccionIncidente = 'ESPERAR_REPARACION' | 'SUSTITUIR' | 'REGISTRAR_FALTANTE' | 'REASIGNAR_ANDEN' | 'REPROGRAMAR';

export interface RegistrarIncidentePayload {
  tipo: TipoIncidente;
  accion: AccionIncidente;
  descripcion: string;
  patenteNueva?: string;
  numeroTransporteNuevo?: string;
}

export async function registrarIncidenteApi(camionId: string, datos: RegistrarIncidentePayload): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${camionId}/incidente`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function marcarReparadoApi(camionId: string): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${camionId}/marcar-reparado`, {
    method: 'POST',
  });
}

// =====================
// Portería
// =====================

export interface CamionPorteria {
  id: string;
  patente: string;
  numeroTransporte: string | null;
  tipo: string;
  estado: string;
  horaLlegadaPlanificada: string;
  horaLlegadaReal: string | null;
  horaSalidaPlanificada: string | null;
  cliente: { nombre: string; pais: string | null } | null;
  pedido: { numero: string; cliente: { nombre: string } } | null;
  anden: { codigo: string } | null;
}

/** Llamada pública (sin auth) para validar token y obtener info del camión. */
export async function obtenerPorteriaPorTokenApi(token: string): Promise<CamionPorteria> {
  const respuesta = await fetch(`${API_URL}/porteria/qr/${token}`);
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiError(respuesta.status, error.message ?? 'QR no válido');
  }
  return respuesta.json();
}

/** Llamada pública (sin auth) para confirmar la llegada vía token. */
export async function confirmarPorteriaPorTokenApi(token: string): Promise<CamionPorteria> {
  const respuesta = await fetch(`${API_URL}/porteria/qr/${token}/confirmar`, { method: 'POST' });
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiError(respuesta.status, error.message ?? 'Error al confirmar');
  }
  return respuesta.json();
}

/** Lista camiones planificados de hoy (autenticado, rol PORTERO+). */
export async function listarCamionesHoyApi(): Promise<CamionPorteria[]> {
  return fetchApi<CamionPorteria[]>('/porteria/camiones-hoy');
}

/** Confirma llegada por ID desde la pantalla autenticada. */
export async function confirmarLlegadaPorIdApi(camionId: string): Promise<CamionPorteria> {
  return fetchApi<CamionPorteria>(`/porteria/camion/${camionId}/confirmar`, { method: 'POST' });
}

export async function obtenerCamionApi(id: string): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${id}`);
}

// =====================
// Predicción de riesgo (árboles de decisión)
// =====================

export interface PrediccionRiesgo {
  prediccion: 0 | 1;
  etiqueta: string;
  probabilidad: number;
  confianza: number;
}

/** Riesgo SAG solo está disponible una vez el camión registra temperatura en el túnel. */
export type PrediccionSAG =
  | ({ disponible: true } & PrediccionRiesgo)
  | { disponible: false; motivo: string };

export interface PrediccionCamion {
  camionId: string;
  riesgoOTIF: PrediccionRiesgo | null;
  riesgoSAG: PrediccionSAG | null;
}

export async function predecirCamionApi(camionId: string): Promise<PrediccionCamion> {
  return fetchApi<PrediccionCamion>(`/prediccion/${camionId}`);
}

export async function cambiarEstadoCamionApi(id: string, endpoint: string, body?: Record<string, unknown>) {
  return fetchApi<Camion>(`/camiones/${id}/${endpoint}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export interface ParadaDatos {
  edificio: string;
  pallets?: number;
}

export interface CrearCamionDatos {
  patente?: string;
  numeroTransporte?: string;
  tipo: string;
  clienteId?: string;
  horaLlegadaPlanificada: string;
  horaSalidaPlanificada?: string;
  paradas?: ParadaDatos[];
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
  fueraDeServicio: boolean;
  motivoFueraServicio: string | null;
  fueraServicioDesde: string | null;
  fueraServicioPor: { nombre: string } | null;
  edificio: { id: string; nombre: string; tipo: string };
  camiones: Camion[];
}

export async function listarAndenesApi(): Promise<Anden[]> {
  return fetchApi<Anden[]>('/andenes');
}

export async function marcarAndenFueraServicioApi(id: string, motivo: string): Promise<Anden> {
  return fetchApi<Anden>(`/andenes/${id}/fuera-servicio`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
}

export async function reactivarAndenApi(id: string): Promise<Anden> {
  return fetchApi<Anden>(`/andenes/${id}/reactivar`, { method: 'PATCH' });
}

// =====================
// Endpoints de Túneles de frío
// =====================

export interface TunelFrio {
  id: string;
  codigo: string;
  ocupado: boolean;
  fueraDeServicio: boolean;
  motivoFueraServicio: string | null;
  fueraServicioDesde: string | null;
  fueraServicioPor: { nombre: string } | null;
  edificio: { id: string; nombre: string; tipo: string };
  camiones: Camion[];
}

export async function listarTunelesApi(): Promise<TunelFrio[]> {
  return fetchApi<TunelFrio[]>('/tuneles');
}

export async function ingresarTunelApi(camionId: string, tunelId: string): Promise<Camion> {
  return fetchApi<Camion>(`/tuneles/${camionId}/ingresar`, {
    method: 'PATCH',
    body: JSON.stringify({ tunelId }),
  });
}

export async function marcarTunelFueraServicioApi(id: string, motivo: string): Promise<TunelFrio> {
  return fetchApi<TunelFrio>(`/tuneles/${id}/fuera-servicio`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
}

export async function reactivarTunelApi(id: string): Promise<TunelFrio> {
  return fetchApi<TunelFrio>(`/tuneles/${id}/reactivar`, { method: 'PATCH' });
}

// =====================
// Justificaciones
// =====================

export async function justificarParadaApi(
  paradaId: string,
  datos: { causa: string; descripcion?: string; excluirDelCalculo?: boolean },
): Promise<JustificacionAtraso> {
  return fetchApi<JustificacionAtraso>(`/paradas/${paradaId}/justificar`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function eliminarJustificacionApi(paradaId: string): Promise<void> {
  return fetchApi<void>(`/paradas/${paradaId}/justificar`, { method: 'DELETE' });
}

// =====================
// Reportes
// =====================

export interface ResumenReportes {
  rango: { desde: string; hasta: string };
  totalCamiones: number;
  despachados: number;
  atrasados: number;
  atrasonesJustificados: number;
  inspeccionesSAG: { aprobados: number; rechazados: number };
  tiempoCicloPromedioMinutos: number | null;
  camionesTorta: { tipo: string; cantidad: number }[];
  despachadosPorDia: { dia: string; cantidad: number }[];
  porEstado: { estado: string; cantidad: number }[];
  tiempoPorEdificio: {
    edificio: string;
    promedioMinutos: number;
    cantidad: number;
    presupuestoNacional: number | null;
    presupuestoExportacion: number | null;
    medianadMinutos: number | null;
  }[];
  atrasosPorEdificio: { edificio: string; atrasoPromedioMinutos: number; cantidad: number }[];
  topCausasJustificacion: { causa: string; cantidad: number }[];
  pesosMediana: {
    edificio: string;
    medianaMinutos: number;
    presupuestoNacional: number | null;
    presupuestoExportacion: number | null;
  }[];
  // Métricas nuevas (rediseño 2026-05-06)
  cumplimientoServicio: number | null;
  otif: number | null;
  cumplimientoPorTipo: {
    tipo: string;
    camiones: number;
    onTime: number | null;
    cumplimientoServicio: number | null;
    otif: number | null;
  }[];
  productividadOperadores: {
    pickineros: {
      usuarioId: string;
      nombre: string;
      palletsArmados: number;
      tiempoPromedioSegundos: number | null;
      diasActivos: number;
      palletsPorTurno: number;
    }[];
    cargadores: {
      usuarioId: string;
      nombre: string;
      palletsCargados: number;
      camionesAtendidos: number;
      diasActivos: number;
      palletsPorTurno: number;
    }[];
  };
  tiempoPromedioTunelMinutos: number | null;
  comparativoPeriodoAnterior: {
    totalCamiones: number;
    despachados: number;
    atrasados: number;
    tiempoCicloPromedioMinutos: number | null;
    cumplimientoServicio: number | null;
    otif: number | null;
    camionesConEntregas: number;
  };
  incidentesOperativos: {
    total: number;
    desglose: {
      tipo: TipoIncidente;
      accion: AccionIncidente;
      cantidad: number;
      porcentaje: number;
    }[];
  };
}

export async function obtenerResumenReportesApi(params?: {
  desde?: string;
  hasta?: string;
}): Promise<ResumenReportes> {
  const query = new URLSearchParams();
  if (params?.desde) query.set('desde', params.desde);
  if (params?.hasta) query.set('hasta', params.hasta);
  const qs = query.toString();
  return fetchApi<ResumenReportes>(`/reportes/resumen${qs ? `?${qs}` : ''}`);
}

// =====================
// Pallets
// =====================

// ─── Productos ───────────────────────────────────────────────────────────────

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  pesoKgUnitario: number | null;
  activo: boolean;
  creadoEn: string;
}

export interface EntregaItem {
  id: string;
  entregaId: string;
  productoId: string;
  producto: Producto;
  cantidadSolicitada: number;
  cantidadCargada: number;
}

export interface ProductoPallet {
  id: string;
  productoId: string | null;
  producto: Producto | null;
  codigoBarras: string | null;
  descripcion: string;
  cantidad: number;
  pesoKg: number | null;
  temperatura: number | null;
}

export interface Entrega {
  id: string;
  numero: number;
  camionId: string;
  camion: { id: string; patente: string; numeroTransporte: string | null; cliente: Cliente | null } | null;
  paradaId: string | null;
  parada: { edificioTipo: string } | null;
  pallets: Pallet[];
  items: EntregaItem[];
  creadoEn: string;
}

export interface Pallet {
  id: string;
  codigoUnico: string;
  estado: string;
  entregaId: string | null;
  entrega: {
    id: string;
    numero: number;
    items: EntregaItem[];
    camion: { id: string; patente: string; numeroTransporte: string | null; cliente: Cliente | null } | null;
    parada: { edificioTipo: string } | null;
  } | null;
  pedidoId: string | null;
  pedido: { id: string; numero: string } | null;
  pickineroId: string | null;
  pickinero: { id: string; nombre: string; rol: string } | null;
  cargadorId: string | null;
  cargador: { id: string; nombre: string; rol: string } | null;
  edificioId: string | null;
  timestampInicio: string;
  timestampFin: string | null;
  tiempoArmadoSegundos: number | null;
  productos: ProductoPallet[];
}

export async function listarPalletsApi(filtros?: {
  estado?: string;
  edificioId?: string;
  entregaId?: string;
  fecha?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<RespuestaPaginada<Pallet>> {
  const params = new URLSearchParams();
  if (filtros?.estado)     params.set('estado',     filtros.estado);
  if (filtros?.edificioId) params.set('edificioId', filtros.edificioId);
  if (filtros?.entregaId)  params.set('entregaId',  filtros.entregaId);
  if (filtros?.fecha)      params.set('fecha',      filtros.fecha);
  if (filtros?.pagina)     params.set('pagina',     String(filtros.pagina));
  if (filtros?.porPagina)  params.set('porPagina',  String(filtros.porPagina));
  const qs = params.toString();
  return fetchApi<RespuestaPaginada<Pallet>>(`/pallets${qs ? `?${qs}` : ''}`);
}

export async function obtenerPalletApi(id: string): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${id}`);
}

export async function crearPalletApi(datos: {
  entregaId?: string;
  pedidoId?: string;
  edificioId?: string;
}): Promise<Pallet> {
  return fetchApi<Pallet>('/pallets', { method: 'POST', body: JSON.stringify(datos) });
}

// =====================
// Entregas
// =====================

export async function listarEntregasPorCamionApi(camionId: string): Promise<Entrega[]> {
  return fetchApi<Entrega[]>(`/camiones/${camionId}/entregas`);
}

export async function obtenerEntregaApi(id: string): Promise<Entrega> {
  return fetchApi<Entrega>(`/entregas/${id}`);
}

export async function crearEntregaApi(datos: {
  camionId: string;
  paradaId?: string;
}): Promise<Entrega> {
  return fetchApi<Entrega>('/entregas', { method: 'POST', body: JSON.stringify(datos) });
}

export async function eliminarEntregaApi(id: string): Promise<void> {
  return fetchApi<void>(`/entregas/${id}`, { method: 'DELETE' });
}

export async function reordenarParadasApi(camionId: string, paradaIds: string[]): Promise<CamionDetalle> {
  return fetchApi<CamionDetalle>(`/camiones/${camionId}/paradas/reordenar`, {
    method: 'PATCH',
    body: JSON.stringify({ paradaIds }),
  });
}

export async function agregarProductoPalletApi(
  palletId: string,
  datos: { codigoBarras: string; descripcion: string; cantidad: number; pesoKg: number; temperatura?: number },
): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/productos`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function cambiarEstadoPalletApi(palletId: string, estado: string): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function setItemPalletApi(palletId: string, productoId: string, cantidad: number): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/items/${productoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ cantidad }),
  });
}

export async function cerrarYCrearNuevoPalletApi(palletId: string): Promise<Pallet> {
  return fetchApi<Pallet>(`/pallets/${palletId}/cerrar-y-crear-nuevo`, { method: 'POST' });
}

// ─── Productos ────────────────────────────────────────────────────────────────

export async function listarProductosApi(): Promise<Producto[]> {
  return fetchApi<Producto[]>('/productos');
}

export async function crearProductoApi(datos: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: number }): Promise<Producto> {
  return fetchApi<Producto>('/productos', { method: 'POST', body: JSON.stringify(datos) });
}

export async function actualizarProductoApi(id: string, datos: { nombre?: string; unidadMedida?: string; pesoKgUnitario?: number; activo?: boolean }): Promise<Producto> {
  return fetchApi<Producto>(`/productos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export async function importarProductosCsvApi(filas: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: string }[]): Promise<{ creados: number; actualizados: number; errores: string[] }> {
  return fetchApi('/productos/importar-csv', { method: 'POST', body: JSON.stringify({ filas }) });
}

export async function obtenerItemsEntregaApi(entregaId: string): Promise<EntregaItem[]> {
  return fetchApi<EntregaItem[]>(`/productos/entrega/${entregaId}`);
}

export async function setItemsEntregaApi(entregaId: string, items: { productoId: string; cantidadSolicitada: number }[]): Promise<EntregaItem[]> {
  return fetchApi<EntregaItem[]>(`/productos/entrega/${entregaId}`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export interface ClienteConCamiones extends Cliente {
  camiones: { id: string; patente: string; numeroTransporte: string | null; estado: string; horaLlegadaPlanificada: string }[];
}

export async function listarClientesApi(tipo?: string): Promise<Cliente[]> {
  const qs = tipo ? `?tipo=${tipo}` : '';
  return fetchApi<Cliente[]>(`/clientes${qs}`);
}

export async function obtenerClienteApi(id: string): Promise<ClienteConCamiones> {
  return fetchApi<ClienteConCamiones>(`/clientes/${id}`);
}

export async function crearClienteApi(datos: {
  nombre: string;
  rut?: string;
  codigo?: string;
  tipoDestino: string;
  pais?: string;
}): Promise<Cliente> {
  return fetchApi<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(datos) });
}

export async function actualizarClienteApi(id: string, datos: Partial<{
  nombre: string;
  rut: string;
  codigo: string;
  tipoDestino: string;
  pais: string;
  activo: boolean;
}>): Promise<Cliente> {
  return fetchApi<Cliente>(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export async function eliminarClienteApi(id: string): Promise<void> {
  return fetchApi<void>(`/clientes/${id}`, { method: 'DELETE' });
}

// ─── QR ───────────────────────────────────────────────────────────────────────

export async function generarQrCamionApi(id: string): Promise<{ token: string; tipo: string; entidadId: string }> {
  return fetchApi(`/qr/camion/${id}`);
}

export async function validarQrApi(token: string): Promise<{ tipo: string; entidadId: string; timestamp: number }> {
  return fetchApi(`/qr/validar/${token}`);
}

// ─── Búsqueda global ──────────────────────────────────────────────────────────

export interface ResultadoBusqueda {
  camiones: { id: string; patente: string; numeroTransporte: string | null; tipo: string; estado: string; cliente: { nombre: string; codigo: string | null } | null }[];
  clientes: { id: string; nombre: string; codigo: string | null; tipoDestino: string; pais: string | null; _count: { camiones: number } }[];
  pallets: { id: string; codigoUnico: string; estado: string; entrega: { camion: { numeroTransporte: string | null; patente: string } } | null }[];
}

export async function buscarApi(q: string): Promise<ResultadoBusqueda> {
  return fetchApi<ResultadoBusqueda>(`/busqueda?q=${encodeURIComponent(q)}`);
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  rut: string;
  email: string;
  rol: string;
  activo: boolean;
  edificioId: string | null;
  edificio: { nombre: string; tipo: string } | null;
}

export async function listarUsuariosApi(): Promise<UsuarioAdmin[]> {
  return fetchApi<UsuarioAdmin[]>('/usuarios');
}

export async function crearUsuarioApi(datos: {
  nombre: string;
  rut: string;
  email: string;
  password: string;
  rol: string;
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
