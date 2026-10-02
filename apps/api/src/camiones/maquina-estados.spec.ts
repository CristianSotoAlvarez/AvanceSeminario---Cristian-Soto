import { EstadoCamion, TipoCamion } from '@prisma/client';
import { esTransicionValida, obtenerEstadosSiguientes } from './maquina-estados';

describe('Máquina de estados del camión', () => {
  describe('Flujo nacional', () => {
    it('permite la secuencia completa del camino feliz', () => {
      const secuencia: [EstadoCamion, EstadoCamion][] = [
        [EstadoCamion.ESPERADO, EstadoCamion.EN_PORTERIA],
        [EstadoCamion.EN_PORTERIA, EstadoCamion.ASIGNADO],
        [EstadoCamion.ASIGNADO, EstadoCamion.EN_CARGA],
        [EstadoCamion.EN_CARGA, EstadoCamion.LISTO],
        [EstadoCamion.LISTO, EstadoCamion.DESPACHADO],
      ];
      for (const [desde, hacia] of secuencia) {
        expect(esTransicionValida(TipoCamion.NACIONAL, desde, hacia)).toBe(true);
      }
    });

    it('impide saltarse la asignación de andén', () => {
      expect(
        esTransicionValida(TipoCamion.NACIONAL, EstadoCamion.EN_PORTERIA, EstadoCamion.EN_CARGA),
      ).toBe(false);
    });

    it('impide despachar un camión que aún no está listo', () => {
      expect(
        esTransicionValida(TipoCamion.NACIONAL, EstadoCamion.EN_CARGA, EstadoCamion.DESPACHADO),
      ).toBe(false);
    });

    it('no admite retroceder de estado', () => {
      expect(
        esTransicionValida(TipoCamion.NACIONAL, EstadoCamion.EN_CARGA, EstadoCamion.ASIGNADO),
      ).toBe(false);
    });

    it('no contempla el paso por túnel de frío', () => {
      expect(
        esTransicionValida(TipoCamion.NACIONAL, EstadoCamion.EN_CARGA, EstadoCamion.EN_TUNEL_FRIO),
      ).toBe(false);
    });

    it('deja el estado despachado como terminal', () => {
      expect(obtenerEstadosSiguientes(TipoCamion.NACIONAL, EstadoCamion.DESPACHADO)).toEqual([]);
    });
  });

  describe('Flujo de exportación', () => {
    it('exige el túnel de frío después de la carga', () => {
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.EN_CARGA, EstadoCamion.EN_TUNEL_FRIO),
      ).toBe(true);
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.EN_CARGA, EstadoCamion.LISTO),
      ).toBe(false);
    });

    it('impide marcar listo un camión sin inspección aprobada', () => {
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.ESPERANDO_SAG, EstadoCamion.LISTO),
      ).toBe(false);
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.APROBADO_SAG, EstadoCamion.LISTO),
      ).toBe(true);
    });

    it('impide despachar directamente desde el túnel de frío', () => {
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.EN_TUNEL_FRIO, EstadoCamion.DESPACHADO),
      ).toBe(false);
    });

    it('nunca permite despachar un camión rechazado por el SAG', () => {
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.RECHAZADO_SAG, EstadoCamion.DESPACHADO),
      ).toBe(false);
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.RECHAZADO_SAG, EstadoCamion.LISTO),
      ).toBe(false);
    });

    it('permite volver a inspección tras un rechazo', () => {
      expect(
        esTransicionValida(TipoCamion.EXPORTACION, EstadoCamion.RECHAZADO_SAG, EstadoCamion.ESPERANDO_SAG),
      ).toBe(true);
    });

    it('ofrece aprobación y rechazo como únicas salidas de la espera de inspección', () => {
      expect(
        obtenerEstadosSiguientes(TipoCamion.EXPORTACION, EstadoCamion.ESPERANDO_SAG).sort(),
      ).toEqual([EstadoCamion.APROBADO_SAG, EstadoCamion.RECHAZADO_SAG].sort());
    });
  });

  describe('Flujo interplanta', () => {
    it('se comporta igual que el nacional', () => {
      expect(
        esTransicionValida(TipoCamion.INTERPLANTA, EstadoCamion.EN_CARGA, EstadoCamion.LISTO),
      ).toBe(true);
      expect(
        esTransicionValida(TipoCamion.INTERPLANTA, EstadoCamion.EN_CARGA, EstadoCamion.EN_TUNEL_FRIO),
      ).toBe(false);
    });
  });

  describe('Estados sin transiciones definidas', () => {
    it('devuelve una lista vacía en lugar de fallar', () => {
      expect(obtenerEstadosSiguientes(TipoCamion.NACIONAL, EstadoCamion.ESPERANDO_SAG)).toEqual([]);
    });
  });
});
