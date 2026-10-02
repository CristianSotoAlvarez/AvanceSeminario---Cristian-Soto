import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextoCon(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('Guardián de autorización por rol', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const conRoles = (roles: string[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles as any);

  it('permite el acceso cuando el endpoint no declara roles', () => {
    conRoles(undefined);
    expect(guard.canActivate(contextoCon({ rol: 'PICKINERO' }))).toBe(true);
  });

  it('permite el acceso cuando la lista de roles está vacía', () => {
    conRoles([]);
    expect(guard.canActivate(contextoCon({ rol: 'PICKINERO' }))).toBe(true);
  });

  it('rechaza la petición si no hay usuario autenticado', () => {
    conRoles(['JEFE_DESPACHO']);
    expect(() => guard.canActivate(contextoCon(undefined))).toThrow(ForbiddenException);
  });

  it('permite el acceso al rol autorizado', () => {
    conRoles(['JEFE_DESPACHO']);
    expect(guard.canActivate(contextoCon({ rol: 'JEFE_DESPACHO' }))).toBe(true);
  });

  it('rechaza a un rol operativo en un endpoint de jefatura', () => {
    conRoles(['JEFE_DESPACHO']);
    expect(() => guard.canActivate(contextoCon({ rol: 'PICKINERO' }))).toThrow(ForbiddenException);
  });

  it('rechaza al inspector SAG en un endpoint de coordinación', () => {
    conRoles(['COORDINADOR', 'JEFE_DESPACHO']);
    expect(() => guard.canActivate(contextoCon({ rol: 'INSPECTOR_SAG' }))).toThrow(
      ForbiddenException,
    );
  });

  it('acepta a cualquiera de los roles declarados', () => {
    conRoles(['COORDINADOR', 'SUPERVISOR']);
    expect(guard.canActivate(contextoCon({ rol: 'SUPERVISOR' }))).toBe(true);
  });

  it('distingue mayúsculas y minúsculas en el nombre del rol', () => {
    conRoles(['JEFE_DESPACHO']);
    expect(() => guard.canActivate(contextoCon({ rol: 'jefe_despacho' }))).toThrow(
      ForbiddenException,
    );
  });

  it('informa en el mensaje qué rol se requería', () => {
    conRoles(['JEFE_DESPACHO']);
    try {
      guard.canActivate(contextoCon({ rol: 'CARGADOR' }));
      fail('debió lanzar ForbiddenException');
    } catch (e: any) {
      expect(e.message).toContain('CARGADOR');
      expect(e.message).toContain('JEFE_DESPACHO');
    }
  });
});
