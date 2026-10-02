import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe el acceso a los roles indicados.
 *
 * Acepta solo valores del enum `RolUsuario`, de modo que un rol inexistente o mal
 * escrito falla al compilar en vez de denegar el acceso en silencio.
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
