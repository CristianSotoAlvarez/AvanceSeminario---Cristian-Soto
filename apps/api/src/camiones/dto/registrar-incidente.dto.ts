import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoIncidente, AccionIncidente } from '@prisma/client';

export class RegistrarIncidenteDto {
  @ApiProperty({ enum: TipoIncidente })
  @IsEnum(TipoIncidente, { message: 'tipo de incidente no válido' })
  tipo: TipoIncidente;

  @ApiProperty({ enum: AccionIncidente })
  @IsEnum(AccionIncidente, { message: 'acción no válida' })
  accion: AccionIncidente;

  @ApiProperty({ description: 'Descripción del incidente' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  descripcion: string;

  // Solo para SUSTITUIR
  @ApiProperty({ required: false, description: 'Patente del camión sustituto (solo SUSTITUIR)' })
  @ValidateIf(o => o.accion === AccionIncidente.SUSTITUIR)
  @IsString()
  @IsNotEmpty({ message: 'La patente del camión sustituto es obligatoria al sustituir' })
  patenteNueva?: string;

  @ApiProperty({ required: false, description: 'Número de transporte del camión sustituto (opcional)' })
  @IsOptional()
  @IsString()
  numeroTransporteNuevo?: string;
}
