import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoCamion, TipoCamion } from '@prisma/client';
import { CamionesService, estadoInicialSustituto } from './camiones.service';

/**
 * Pruebas del servicio de camiones sin base de datos.
 *
 * Interesan dos cosas que no se ven en la máquina de estados: que las guardas de
 * concurrencia aborten cuando otra petición se adelantó, y que los efectos
 * colaterales (liberar andén o túnel, trabajo adicional) ocurran dentro de la
 * misma transacción que la transición.
 */

type Contador = { count: number };

/** Transacción simulada: registra qué se llamó y con qué condiciones. */
function crearTx(opciones: {
  transicion?: Contador;
  reservaAnden?: Contador;
  camion?: Record<string, unknown>;
  tunel?: Record<string, unknown> | null;
  parada?: Record<string, unknown> | null;
}) {
  const llamadas: { metodo: string; argumentos: unknown }[] = [];
  const registrar = (metodo: string) => (argumentos: unknown) => {
    llamadas.push({ metodo, argumentos });
    return Promise.resolve(undefined);
  };

  const tx = {
    camion: {
      updateMany: jest.fn((a: unknown) => {
        llamadas.push({ metodo: 'camion.updateMany', argumentos: a });
        return Promise.resolve(opciones.transicion ?? { count: 1 });
      }),
      findUniqueOrThrow: jest.fn(() =>
        Promise.resolve(opciones.camion ?? { id: 'c1', estado: EstadoCamion.DESPACHADO }),
      ),
    },
    anden: {
      updateMany: jest.fn((a: unknown) => {
        llamadas.push({ metodo: 'anden.updateMany', argumentos: a });
        return Promise.resolve(opciones.reservaAnden ?? { count: 1 });
      }),
      update: jest.fn(registrar('anden.update')),
    },
    tunelFrio: {
      findUnique: jest.fn(() => Promise.resolve(opciones.tunel ?? { id: 't1', codigo: 'TF-01' })),
      update: jest.fn(registrar('tunelFrio.update')),
    },
    eventoCamion: { create: jest.fn(registrar('eventoCamion.create')) },
    eventoTunel: { create: jest.fn(registrar('eventoTunel.create')) },
    paradaExpedicion: {
      findFirst: jest.fn(() => Promise.resolve(opciones.parada ?? null)),
      update: jest.fn(registrar('paradaExpedicion.update')),
    },
    entrega: {
      findUnique: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(registrar('entrega.create')),
    },
  };

  return { tx, llamadas };
}

function crearServicio(camion: Record<string, unknown>, tx: Record<string, unknown>, anden?: unknown) {
  const prisma = {
    camion: { findUnique: jest.fn(() => Promise.resolve(camion)) },
    anden: { findUnique: jest.fn(() => Promise.resolve(anden ?? null)) },
    $transaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
  };
  const eventos = {
    emitirCamionActualizado: jest.fn(),
    emitirAndenesActualizados: jest.fn(),
    emitirTunelesActualizados: jest.fn(),
  };
  // El servicio solo usa estos dos colaboradores.
  const servicio = new CamionesService(prisma as never, eventos as never);
  return { servicio, prisma, eventos };
}

const CAMION_BASE = {
  id: 'c1',
  patente: 'ABCD12',
  tipo: TipoCamion.NACIONAL,
  estado: EstadoCamion.EN_CARGA,
  andenId: null as string | null,
  tunelId: null as string | null,
};

describe('CamionesService', () => {
  describe('cambiarEstado', () => {
    it('rechaza una transición que la máquina de estados no permite', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio({ ...CAMION_BASE, estado: EstadoCamion.ESPERADO }, tx);

      await expect(servicio.cambiarEstado('c1', EstadoCamion.DESPACHADO, 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falla si el camión no existe', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio(null as never, tx);

      await expect(servicio.cambiarEstado('inexistente', EstadoCamion.LISTO, 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lleva la condición de estado en el WHERE, no en una lectura previa', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio({ ...CAMION_BASE, estado: EstadoCamion.EN_CARGA }, tx);

      await servicio.cambiarEstado('c1', EstadoCamion.LISTO, 'u1');

      expect(tx.camion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1', estado: EstadoCamion.EN_CARGA },
        }),
      );
    });

    it('aborta si otra petición ya movió el camión (count 0)', async () => {
      const { tx } = crearTx({ transicion: { count: 0 } });
      const { servicio } = crearServicio({ ...CAMION_BASE, estado: EstadoCamion.EN_CARGA }, tx);

      await expect(servicio.cambiarEstado('c1', EstadoCamion.LISTO, 'u1')).rejects.toThrow(
        /ya cambió de estado/,
      );
    });

    it('no ejecuta el trabajo adicional si la transición no se aplicó', async () => {
      const { tx } = crearTx({ transicion: { count: 0 } });
      const { servicio } = crearServicio({ ...CAMION_BASE, estado: EstadoCamion.EN_CARGA }, tx);
      const trabajoAdicional = jest.fn(() => Promise.resolve());

      await expect(
        servicio.cambiarEstado('c1', EstadoCamion.LISTO, 'u1', undefined, trabajoAdicional),
      ).rejects.toThrow(BadRequestException);

      expect(trabajoAdicional).not.toHaveBeenCalled();
    });

    it('ejecuta el trabajo adicional con la misma transacción', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio({ ...CAMION_BASE, estado: EstadoCamion.EN_CARGA }, tx);
      const trabajoAdicional = jest.fn(() => Promise.resolve());

      await servicio.cambiarEstado('c1', EstadoCamion.LISTO, 'u1', undefined, trabajoAdicional);

      expect(trabajoAdicional).toHaveBeenCalledTimes(1);
      expect(trabajoAdicional).toHaveBeenCalledWith(tx);
    });

    it('libera el andén al despachar', async () => {
      const { tx } = crearTx({});
      const { servicio, eventos } = crearServicio(
        { ...CAMION_BASE, estado: EstadoCamion.LISTO, andenId: 'a1' },
        tx,
      );

      await servicio.cambiarEstado('c1', EstadoCamion.DESPACHADO, 'u1');

      expect(tx.anden.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { ocupado: false } });
      expect(eventos.emitirAndenesActualizados).toHaveBeenCalled();
    });

    it('libera el túnel físico al salir de EN_TUNEL_FRIO', async () => {
      const { tx } = crearTx({ tunel: { id: 't1', codigo: 'TF-03' } });
      const { servicio, eventos } = crearServicio(
        {
          ...CAMION_BASE,
          tipo: TipoCamion.EXPORTACION,
          estado: EstadoCamion.EN_TUNEL_FRIO,
          tunelId: 't1',
        },
        tx,
      );

      await servicio.cambiarEstado('c1', EstadoCamion.ESPERANDO_SAG, 'u1');

      expect(tx.tunelFrio.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { ocupado: false },
      });
      // el camión deja de apuntar al túnel en la misma escritura
      expect(tx.camion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tunelId: null }) }),
      );
      expect(eventos.emitirTunelesActualizados).toHaveBeenCalled();
    });
  });

  describe('asignarAnden', () => {
    const CAMION_EN_PORTERIA = { ...CAMION_BASE, estado: EstadoCamion.EN_PORTERIA };
    const ANDEN_LIBRE = {
      id: 'a1',
      codigo: 'A-01',
      ocupado: false,
      fueraDeServicio: false,
      edificio: { tipo: 'AVES' },
    };

    it('rechaza un andén ocupado', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio(CAMION_EN_PORTERIA, tx, { ...ANDEN_LIBRE, ocupado: true });

      await expect(servicio.asignarAnden('c1', 'a1', 'u1')).rejects.toThrow(/ya está ocupado/);
    });

    it('rechaza un andén fuera de servicio', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio(CAMION_EN_PORTERIA, tx, {
        ...ANDEN_LIBRE,
        fueraDeServicio: true,
      });

      await expect(servicio.asignarAnden('c1', 'a1', 'u1')).rejects.toThrow(/fuera de servicio/);
    });

    it('reserva el andén con la condición en el WHERE', async () => {
      const { tx } = crearTx({});
      const { servicio } = crearServicio(CAMION_EN_PORTERIA, tx, ANDEN_LIBRE);

      await servicio.asignarAnden('c1', 'a1', 'u1');

      expect(tx.anden.updateMany).toHaveBeenCalledWith({
        where: { id: 'a1', ocupado: false, fueraDeServicio: false },
        data: { ocupado: true },
      });
    });

    it('aborta si otro coordinador tomó el andén entre la lectura y la escritura', async () => {
      const { tx } = crearTx({ reservaAnden: { count: 0 } });
      const { servicio } = crearServicio(CAMION_EN_PORTERIA, tx, ANDEN_LIBRE);

      await expect(servicio.asignarAnden('c1', 'a1', 'u1')).rejects.toThrow(
        /dejó de estar disponible/,
      );
      // no se llega a mover el camión
      expect(tx.camion.updateMany).not.toHaveBeenCalled();
    });

    it('aborta si el camión ya salió de portería', async () => {
      const { tx } = crearTx({ transicion: { count: 0 } });
      const { servicio } = crearServicio(CAMION_EN_PORTERIA, tx, ANDEN_LIBRE);

      await expect(servicio.asignarAnden('c1', 'a1', 'u1')).rejects.toThrow(/ya no está en portería/);
    });
  });

  describe('estadoInicialSustituto', () => {
    it('antes de empezar la carga, el sustituto arranca asignado', () => {
      for (const estado of [EstadoCamion.ESPERADO, EstadoCamion.EN_PORTERIA, EstadoCamion.ASIGNADO]) {
        expect(estadoInicialSustituto(estado, TipoCamion.NACIONAL)).toBe(EstadoCamion.ASIGNADO);
      }
    });

    it('si el averiado estaba cargando, el sustituto continúa la carga', () => {
      expect(estadoInicialSustituto(EstadoCamion.EN_CARGA, TipoCamion.NACIONAL)).toBe(
        EstadoCamion.EN_CARGA,
      );
    });

    it('en exportación no se hereda la aprobación del SAG: vuelve al túnel', () => {
      expect(estadoInicialSustituto(EstadoCamion.APROBADO_SAG, TipoCamion.EXPORTACION)).toBe(
        EstadoCamion.EN_TUNEL_FRIO,
      );
      expect(estadoInicialSustituto(EstadoCamion.LISTO, TipoCamion.EXPORTACION)).toBe(
        EstadoCamion.EN_TUNEL_FRIO,
      );
    });

    it('en exportación, los estados del circuito de frío se conservan', () => {
      for (const estado of [
        EstadoCamion.EN_TUNEL_FRIO,
        EstadoCamion.ESPERANDO_SAG,
        EstadoCamion.RECHAZADO_SAG,
      ]) {
        expect(estadoInicialSustituto(estado, TipoCamion.EXPORTACION)).toBe(estado);
      }
    });

    it('en nacional e interplanta sí se hereda el estado de listo', () => {
      for (const tipo of [TipoCamion.NACIONAL, TipoCamion.INTERPLANTA]) {
        expect(estadoInicialSustituto(EstadoCamion.APROBADO_SAG, tipo)).toBe(EstadoCamion.LISTO);
        expect(estadoInicialSustituto(EstadoCamion.LISTO, tipo)).toBe(EstadoCamion.LISTO);
      }
    });
  });
});
