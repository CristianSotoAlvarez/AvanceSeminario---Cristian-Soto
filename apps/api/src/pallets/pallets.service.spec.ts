import { NotFoundException } from '@nestjs/common';
import { EstadoPallet } from '@prisma/client';
import { PalletsService } from './pallets.service';

/**
 * Dos operarios pueden pulsar el mismo botón a la vez sobre un pallet. Si la
 * transición se aplicara sin condición, la segunda escritura reescribiría el
 * cargador y el tiempo de armado ya calculados.
 */

/** Forma de la llamada a updateMany, para poder leer los datos escritos. */
type Escritura = { where: Record<string, unknown>; data: Record<string, unknown> };

function crearServicio(opciones: {
  pallet?: Record<string, unknown> | null;
  transicion?: { count: number };
}) {
  const updateMany = jest.fn((_args: Escritura) =>
    Promise.resolve(opciones.transicion ?? { count: 1 }),
  );
  const prisma = {
    pallet: {
      findUnique: jest.fn(() => Promise.resolve(opciones.pallet ?? null)),
      updateMany,
      findUniqueOrThrow: jest.fn(() => Promise.resolve({ id: 'p1', estado: EstadoPallet.ARMADO })),
    },
  };
  const eventos = { emitirCamionActualizado: jest.fn() };

  /** Datos de la única escritura que hace el método. */
  const datosEscritos = () => updateMany.mock.calls[0][0].data;

  return { servicio: new PalletsService(prisma as never, eventos as never), prisma, datosEscritos };
}

const PALLET_EN_ARMADO = {
  id: 'p1',
  estado: EstadoPallet.EN_ARMADO,
  timestampInicio: new Date('2026-06-01T10:00:00Z'),
  cargadorId: null as string | null,
};

describe('PalletsService.cambiarEstado', () => {
  it('falla si el pallet no existe', async () => {
    const { servicio } = crearServicio({ pallet: null });

    await expect(servicio.cambiarEstado('p1', EstadoPallet.ARMADO, 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza una transición que la tabla no permite', async () => {
    const { servicio } = crearServicio({
      pallet: { ...PALLET_EN_ARMADO, estado: EstadoPallet.CARGADO },
    });

    await expect(servicio.cambiarEstado('p1', EstadoPallet.EN_ARMADO, 'u1')).rejects.toThrow(
      /Transición inválida/,
    );
  });

  it('lleva el estado previo en el WHERE', async () => {
    const { servicio, prisma } = crearServicio({ pallet: PALLET_EN_ARMADO });

    await servicio.cambiarEstado('p1', EstadoPallet.ARMADO, 'u1');

    expect(prisma.pallet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', estado: EstadoPallet.EN_ARMADO } }),
    );
  });

  it('aborta si otro operario ya aplicó la transición', async () => {
    const { servicio } = crearServicio({
      pallet: PALLET_EN_ARMADO,
      transicion: { count: 0 },
    });

    await expect(servicio.cambiarEstado('p1', EstadoPallet.ARMADO, 'u1')).rejects.toThrow(
      /ya cambió de estado/,
    );
  });

  it('calcula el tiempo de armado al cerrar el pallet', async () => {
    // el pallet se abrió hace dos minutos y medio
    const inicio = new Date(Date.now() - 150_000);
    const { servicio, datosEscritos } = crearServicio({
      pallet: { ...PALLET_EN_ARMADO, timestampInicio: inicio },
    });

    await servicio.cambiarEstado('p1', EstadoPallet.ARMADO, 'u1');

    expect(datosEscritos().timestampFin).toBeInstanceOf(Date);
    expect(datosEscritos().tiempoArmadoSegundos).toBeGreaterThanOrEqual(150);
    expect(datosEscritos().tiempoArmadoSegundos).toBeLessThan(155);
  });

  it('deja constancia de quién cargó el pallet', async () => {
    const { servicio, datosEscritos } = crearServicio({
      pallet: { ...PALLET_EN_ARMADO, estado: EstadoPallet.ARMADO },
    });

    await servicio.cambiarEstado('p1', EstadoPallet.CARGADO, 'u-cargador');

    expect(datosEscritos().cargadorId).toBe('u-cargador');
  });
});
