import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { CausaJustificacion } from '@prisma/client';
// FALTA_PRODUCTO añadido en migración add_falta_producto_causa

export class CrearJustificacionDto {
  @IsEnum(CausaJustificacion)
  causa: CausaJustificacion;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  excluirDelCalculo?: boolean;
}
