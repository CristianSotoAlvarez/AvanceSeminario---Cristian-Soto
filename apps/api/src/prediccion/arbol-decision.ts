/**
 * Evaluador de árboles de decisión entrenados con Python/scikit-learn
 * (ver apps/api/ml/entrenar_modelos.py). Los árboles se exportan como JSON
 * de reglas (umbrales de decisión) y se evalúan aquí sin depender de Python
 * en producción — ver docs/superpowers/specs/2026-08-05-modelo-prediccion-arbol-decision-design.md.
 */

export interface NodoArbol {
  hoja: boolean;
  // Hoja
  prediccion?: 0 | 1;
  probabilidad?: number;
  // Nodo interno
  feature?: string;
  umbral?: number;
  izquierda?: NodoArbol;
  derecha?: NodoArbol;
  muestras: number;
}

export interface ModeloArbol {
  objetivo: string;
  featureNames: string[];
  metricas: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    matrizConfusion: number[][];
    nEntrenamiento: number;
    nPrueba: number;
  };
  importanciaFeatures: Record<string, number>;
  arbol: NodoArbol;
}

export interface ResultadoPrediccion {
  prediccion: 0 | 1;
  etiqueta: string;
  probabilidad: number;
  muestrasHoja: number;
}

/** Evalúa un vector de features (ya codificado) contra el árbol, siguiendo
 * la misma convención de sklearn: si features[feature] <= umbral, rama izquierda. */
export function evaluarArbol(nodo: NodoArbol, features: Record<string, number>): ResultadoPrediccion {
  let actual = nodo;
  while (!actual.hoja) {
    const valor = features[actual.feature!] ?? 0;
    actual = valor <= actual.umbral! ? actual.izquierda! : actual.derecha!;
  }
  return {
    prediccion: actual.prediccion!,
    etiqueta: actual.prediccion === 1 ? 'FAVORABLE' : 'RIESGO',
    probabilidad: actual.probabilidad!,
    muestrasHoja: actual.muestras,
  };
}

// ─── Featurización (debe ser idéntica a la usada en el entrenamiento) ──────

const CATEGORIAS_TIPO = ['NACIONAL', 'EXPORTACION', 'INTERPLANTA'] as const;
const CATEGORIAS_EDIFICIO = ['AVES', 'CERDO', 'FRIGORIFICO'] as const;

export interface DatosCamionParaPrediccion {
  tipoCamion: string;
  edificioTipo: string;
  horaLlegadaPlanificada: Date;
  cantidadPalletsSolicitados: number | null;
}

export function featurizarCamion(datos: DatosCamionParaPrediccion): Record<string, number> {
  const features: Record<string, number> = {};

  for (const t of CATEGORIAS_TIPO) {
    features[`tipoCamion_${t}`] = datos.tipoCamion === t ? 1 : 0;
  }
  for (const e of CATEGORIAS_EDIFICIO) {
    features[`edificioTipo_${e}`] = datos.edificioTipo === e ? 1 : 0;
  }
  const diaSemana = datos.horaLlegadaPlanificada.getDay(); // 0=domingo … 6=sábado, igual que Postgres EXTRACT(DOW)
  for (let d = 0; d <= 6; d++) {
    features[`diaSemana_${d}`] = diaSemana === d ? 1 : 0;
  }
  features['horaLlegada'] = datos.horaLlegadaPlanificada.getHours();
  features['cantidadPalletsSolicitados'] = datos.cantidadPalletsSolicitados ?? 0;

  return features;
}
