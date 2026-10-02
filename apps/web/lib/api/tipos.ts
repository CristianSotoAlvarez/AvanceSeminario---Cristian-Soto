/** Formas de los datos que devuelve la API. Se mantienen juntas porque se referencian entre sí. */

import type { Rol } from "@dispatch-track/types";

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  polivalente?: boolean;
  edificioId: string | null;
}

export interface RespuestaLogin {
  accessToken: string;
  usuario: UsuarioAuth;
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

export interface ClienteConCamiones extends Cliente {
  camiones: { id: string; patente: string; numeroTransporte: string | null; estado: string; horaLlegadaPlanificada: string }[];
}

export interface ResultadoBusqueda {
  camiones: { id: string; patente: string; numeroTransporte: string | null; tipo: string; estado: string; cliente: { nombre: string; codigo: string | null } | null }[];
  clientes: { id: string; nombre: string; codigo: string | null; tipoDestino: string; pais: string | null; _count: { camiones: number } }[];
  pallets: { id: string; codigoUnico: string; estado: string; entrega: { camion: { numeroTransporte: string | null; patente: string } } | null }[];
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  rut: string;
  email: string;
  rol: Rol;
  activo: boolean;
  edificioId: string | null;
  edificio: { nombre: string; tipo: string } | null;
}
