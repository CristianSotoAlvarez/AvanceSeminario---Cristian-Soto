import { PartialType, OmitType } from '@nestjs/swagger';
import { CrearUsuarioDto } from './crear-usuario.dto';

export class ActualizarUsuarioDto extends PartialType(
  OmitType(CrearUsuarioDto, ['rut'] as const),
) {}
