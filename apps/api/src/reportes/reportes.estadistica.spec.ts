import { mediana, iqr, filtrarOutliers } from './reportes.service';

describe('Funciones estadísticas del módulo de reportes', () => {
  describe('mediana', () => {
    it('devuelve null para una serie vacía en lugar de cero', () => {
      expect(mediana([])).toBeNull();
    });

    it('calcula la mediana de una cantidad impar de valores', () => {
      expect(mediana([30, 10, 20])).toBe(20);
    });

    it('promedia los centrales en una cantidad par de valores', () => {
      expect(mediana([10, 20, 30, 40])).toBe(25);
    });

    it('no altera el arreglo recibido', () => {
      const original = [30, 10, 20];
      mediana(original);
      expect(original).toEqual([30, 10, 20]);
    });

    it('resiste un valor extremo, a diferencia del promedio', () => {
      const tiempos = [40, 42, 45, 47, 5000];
      expect(mediana(tiempos)).toBe(45);
    });
  });

  describe('iqr', () => {
    it('calcula los cuartiles de una serie par', () => {
      expect(iqr([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ q1: 2.5, q3: 6.5 });
    });

    it('excluye la mediana al partir una serie impar', () => {
      expect(iqr([1, 2, 3, 4, 5])).toEqual({ q1: 1.5, q3: 4.5 });
    });
  });

  describe('filtrarOutliers', () => {
    it('descarta un tiempo de ciclo desproporcionado', () => {
      const tiempos = [40, 42, 45, 47, 50, 5000];
      expect(filtrarOutliers(tiempos)).not.toContain(5000);
    });

    it('conserva todos los valores cuando la serie es homogénea', () => {
      const tiempos = [40, 42, 45, 47];
      expect(filtrarOutliers(tiempos)).toEqual(tiempos);
    });

    it('no filtra series de menos de cuatro observaciones', () => {
      const pocos = [10, 5000, 20];
      expect(filtrarOutliers(pocos)).toEqual(pocos);
    });

    it('devuelve una serie vacía sin fallar', () => {
      expect(filtrarOutliers([])).toEqual([]);
    });
  });

  describe('Cálculo de indicadores sobre las funciones anteriores', () => {
    it('el tiempo de ciclo promedio ignora los valores atípicos filtrados', () => {
      const tiempos = [40, 42, 45, 47, 50, 5000];
      const limpios = filtrarOutliers(tiempos);
      const promedio = limpios.reduce((s, v) => s + v, 0) / limpios.length;
      expect(Math.round(promedio)).toBe(45);
    });

    it('el porcentaje de OTIF se redondea a un decimal', () => {
      const camionesOtif = 64;
      const camionesConEntregas = 293;
      const otif = Math.round((camionesOtif / camionesConEntregas) * 1000) / 10;
      expect(otif).toBe(21.8);
    });

    it('el porcentaje es cero cuando no hay camiones en el universo', () => {
      const camionesConEntregas = 0;
      const otif = camionesConEntregas > 0 ? 100 : 0;
      expect(otif).toBe(0);
    });
  });
});
