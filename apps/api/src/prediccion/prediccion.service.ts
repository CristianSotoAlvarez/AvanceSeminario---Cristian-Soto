import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ModeloArbol, evaluarArbol, featurizarCamion } from './arbol-decision';

@Injectable()
export class PrediccionService {
  private readonly logger = new Logger(PrediccionService.name);
  private modeloOtif: ModeloArbol | null = null;
  private modeloSag: ModeloArbol | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.modeloOtif = this.cargarModelo('arbol-otif.json');
    this.modeloSag = this.cargarModelo('arbol-sag.json');
  }

  private cargarModelo(archivo: string): ModeloArbol | null {
    try {
      const ruta = join(__dirname, 'modelos', archivo);
      const contenido = readFileSync(ruta, 'utf-8');
      return JSON.parse(contenido) as ModeloArbol;
    } catch (e) {
      this.logger.warn(`No se pudo cargar el modelo ${archivo}: ${(e as Error).message}`);
      return null;
    }
  }

  /** Metadatos de ambos modelos (métricas, importancia de variables) para mostrar en reportes. */
  obtenerInfoModelos() {
    return {
      riesgoOTIF: this.modeloOtif
        ? { metricas: this.modeloOtif.metricas, importanciaFeatures: this.modeloOtif.importanciaFeatures }
        : null,
      riesgoSAG: this.modeloSag
        ? { metricas: this.modeloSag.metricas, importanciaFeatures: this.modeloSag.importanciaFeatures }
        : null,
    };
  }

  /** Predicción de riesgo para un camión específico: OTIF siempre, SAG solo si es de exportación
   * y ya tiene temperatura de túnel registrada (variable causal del modelo — ver bitácora 9.6). */
  async predecirParaCamion(camionId: string) {
    const camion = await this.prisma.camion.findUnique({
      where: { id: camionId },
      include: {
        paradas: { where: { orden: 1 }, take: 1 },
        eventosTunel: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });
    if (!camion) throw new NotFoundException('Camión no encontrado');

    const parada = camion.paradas[0];
    const temperatura = camion.eventosTunel[0]?.temperaturaRegistrada;
    const datos = {
      tipoCamion: camion.tipo,
      edificioTipo: parada?.edificioTipo ?? 'AVES',
      horaLlegadaPlanificada: camion.horaLlegadaPlanificada,
      cantidadPalletsSolicitados: parada?.cantidadPalletsSolicitados ?? null,
      temperaturaRegistrada: temperatura,
    };
    const features = featurizarCamion(datos);

    const resultado: Record<string, unknown> = {
      camionId,
      riesgoOTIF: this.modeloOtif ? this.formatearResultado(evaluarArbol(this.modeloOtif.arbol, features), 'otif') : null,
      riesgoSAG: null,
    };

    if (camion.tipo === 'EXPORTACION') {
      if (temperatura === undefined) {
        resultado.riesgoSAG = { disponible: false, motivo: 'Aún no se registra la temperatura de salida del túnel de frío.' };
      } else if (this.modeloSag) {
        resultado.riesgoSAG = { disponible: true, ...this.formatearResultado(evaluarArbol(this.modeloSag.arbol, features), 'sag') };
      }
    }

    return resultado;
  }

  private formatearResultado(r: ReturnType<typeof evaluarArbol>, tipo: 'otif' | 'sag') {
    const etiquetas = tipo === 'otif'
      ? { 1: 'Cumplirá OTIF', 0: 'Riesgo de incumplir OTIF' }
      : { 1: 'Probable aprobación SAG', 0: 'Riesgo de rechazo SAG' };
    return {
      prediccion: r.prediccion,
      etiqueta: etiquetas[r.prediccion],
      probabilidad: r.probabilidad,
      confianza: r.muestrasHoja,
    };
  }
}
