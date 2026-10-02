import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCamion } from '@prisma/client';
import { TunelesService } from './tuneles.service';

/**
 * El ingreso a un túnel de frío es el punto donde dos operadores pueden competir:
 * uno reserva el túnel y el otro asigna el camión. Estas pruebas comprueban que
 * ambas escrituras llevan su condición en el WHERE y que viven en la misma
 * transacción, para que una reserva que no llega a asignarse se revierta.
 */

function crearServicio(opciones: {
  camion?: Record<string, unknown> | null;
  tunel?: Record<string, unknown> | null;
  reserva?: { count: number };
  asignacion?: { count: number };
  tunelTrasFallo?: Record<string, unknown> | null;
}) {
  const tx = {
    tunelFrio: {
      updateMany: jest.fn(() => Promise.resolve(opciones.reserva ?? { count: 1 })),
      findUnique: jest.fn(() => Promise.resolve(opciones.tunelTrasFallo ?? opciones.tunel ?? null)),
    },
    camion: {
      updateMany: jest.fn(() => Promise.resolve(opciones.asignacion ?? { count: 1 })),
    },
    eventoCamion: { create: jest.fn(() => Promise.resolve(undefined)) },
  };

  const prisma = {
    camion: { findUnique: jest.fn(() => Promise.resolve(opciones.camion ?? null)) },
    tunelFrio: { findUnique: jest.fn(() => Promise.resolve(opciones.tunel ?? null)) },
    $transaction: jest.fn((fn: (t: unknown) => Promise<unknown>) => fn(tx)),
  };
  const eventos = { emitirTunelesActualizados: jest.fn() };

  return { servicio: new TunelesService(prisma as never, eventos as never), tx, prisma, eventos };
}

const CAMION_EN_TUNEL = {
  id: 'c1',
  estado: EstadoCamion.EN_TUNEL_FRIO,
  tunelId: null as string | null,
};
const TUNEL_LIBRE = { id: 't1', codigo: 'TF-02', ocupado: false, fueraDeServicio: false };

describe('TunelesService.ingresarTunel', () => {
  it('falla si el camión no existe', async () => {
    const { servicio } = crearServicio({ camion: null });

    await expect(servicio.ingresarTunel('c1', 't1', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('exige que el camión esté en EN_TUNEL_FRIO', async () => {
    const { servicio } = crearServicio({
      camion: { ...CAMION_EN_TUNEL, estado: EstadoCamion.EN_CARGA },
      tunel: TUNEL_LIBRE,
    });

    await expect(servicio.ingresarTunel('c1', 't1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('rechaza un camión que ya tiene túnel asignado', async () => {
    const { servicio } = crearServicio({
      camion: { ...CAMION_EN_TUNEL, tunelId: 'otro' },
      tunel: TUNEL_LIBRE,
    });

    await expect(servicio.ingresarTunel('c1', 't1', 'u1')).rejects.toThrow(/ya tiene un túnel/);
  });

  it('reserva el túnel con la condición en el WHERE', async () => {
    const { servicio, tx } = crearServicio({ camion: CAMION_EN_TUNEL, tunel: TUNEL_LIBRE });

    await servicio.ingresarTunel('c1', 't1', 'u1');

    expect(tx.tunelFrio.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', ocupado: false, fueraDeServicio: false },
      data: { ocupado: true },
    });
  });

  it('asigna el camión solo si sigue sin túnel y en estado de frío', async () => {
    const { servicio, tx } = crearServicio({ camion: CAMION_EN_TUNEL, tunel: TUNEL_LIBRE });

    await servicio.ingresarTunel('c1', 't1', 'u1');

    expect(tx.camion.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', tunelId: null, estado: EstadoCamion.EN_TUNEL_FRIO },
      data: { tunelId: 't1' },
    });
  });

  it('aborta si otro camión tomó el túnel en paralelo', async () => {
    const { servicio, tx } = crearServicio({
      camion: CAMION_EN_TUNEL,
      tunel: TUNEL_LIBRE,
      reserva: { count: 0 },
      tunelTrasFallo: { ...TUNEL_LIBRE, ocupado: true },
    });

    await expect(servicio.ingresarTunel('c1', 't1', 'u1')).rejects.toThrow(/ya está ocupado/);
    expect(tx.camion.updateMany).not.toHaveBeenCalled();
  });

  it('distingue el túnel puesto fuera de servicio del simplemente ocupado', async () => {
    const { servicio } = crearServicio({
      camion: CAMION_EN_TUNEL,
      tunel: TUNEL_LIBRE,
      reserva: { count: 0 },
      tunelTrasFallo: { ...TUNEL_LIBRE, fueraDeServicio: true },
    });

    await expect(servicio.ingresarTunel('c1', 't1', 'u1')).rejects.toThrow(/fuera de servicio/);
  });

  it('revierte la reserva si el camión ya entró en otro túnel', async () => {
    const { servicio, tx } = crearServicio({
      camion: CAMION_EN_TUNEL,
      tunel: TUNEL_LIBRE,
      asignacion: { count: 0 },
    });

    // el error propaga fuera de $transaction, que es lo que fuerza el rollback
    await expect(servicio.ingresarTunel('c1', 't1', 'u1')).rejects.toThrow(ConflictException);
    expect(tx.tunelFrio.updateMany).toHaveBeenCalled();
    expect(tx.eventoCamion.create).not.toHaveBeenCalled();
  });
});
