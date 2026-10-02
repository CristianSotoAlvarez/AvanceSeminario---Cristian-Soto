import { RolUsuario } from '@prisma/client';
import * as rolesApi from './roles';
import * as rolesCompartidos from '../../../../packages/types/src/roles';

/**
 * El enum de Prisma es la fuente de verdad de los roles. El paquete
 * `@dispatch-track/types` mantiene una copia porque el frontend no puede importar
 * el cliente de Prisma. Estas pruebas fallan si alguna de las dos se queda atrás.
 */
describe('Sincronización de roles entre la API y el paquete compartido', () => {
  const ordenar = (roles: readonly string[]) => [...roles].sort();

  it('el paquete compartido declara exactamente los mismos roles que Prisma', () => {
    const enPrisma = ordenar(Object.values(RolUsuario));
    const enPaquete = ordenar(Object.values(rolesCompartidos.RolUsuario));

    expect(enPaquete).toEqual(enPrisma);
  });

  it('declara los 9 roles del sistema', () => {
    expect(Object.values(RolUsuario)).toHaveLength(9);
    expect(Object.values(RolUsuario)).toContain('PORTERO');
  });

  describe('los grupos de permisos coinciden en ambos lados', () => {
    const grupos = Object.keys(rolesApi).filter((clave) => clave.startsWith('ROLES_'));

    it('la API no define grupos que falten en el paquete compartido', () => {
      const faltantes = grupos.filter((g) => !(g in rolesCompartidos));
      expect(faltantes).toEqual([]);
    });

    const comoGrupos = (modulo: unknown) => modulo as Record<string, readonly string[]>;

    it.each(grupos)('%s contiene los mismos roles', (grupo) => {
      const enApi = ordenar(comoGrupos(rolesApi)[grupo]);
      const enPaquete = ordenar(comoGrupos(rolesCompartidos)[grupo]);

      expect(enPaquete).toEqual(enApi);
    });
  });

  it('todo rol usado en un grupo existe en el enum', () => {
    const validos = new Set<string>(Object.values(RolUsuario));
    const desconocidos = Object.entries(rolesApi)
      .filter(([clave]) => clave.startsWith('ROLES_'))
      .flatMap(([clave, lista]) =>
        (lista as readonly string[]).filter((rol) => !validos.has(rol)).map((rol) => `${clave}: ${rol}`),
      );

    expect(desconocidos).toEqual([]);
  });
});
