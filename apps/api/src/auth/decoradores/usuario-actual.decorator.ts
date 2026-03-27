import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Extrae el usuario actual del request (inyectado por JwtAuthGuard) */
export const UsuarioActual = createParamDecorator(
  (campo: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const usuario = request.user;

    if (campo) {
      return usuario?.[campo];
    }

    return usuario;
  },
);
