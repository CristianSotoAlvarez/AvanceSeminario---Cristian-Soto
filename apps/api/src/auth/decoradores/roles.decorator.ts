import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Decorador para restringir acceso a roles específicos */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
