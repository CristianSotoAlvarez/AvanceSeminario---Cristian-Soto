import { IsString, IsEnum, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCamion } from '@prisma/client';

export class CrearCamionDto {
  @ApiProperty({ example: 'BXRK-42', description: 'Patente del camión' })
  @IsString()
  @IsNotEmpty({ message: 'La patente es obligatoria' })
  patente: string;

  @ApiProperty({ enum: TipoCamion, example: 'NACIONAL' })
  @IsEnum(TipoCamion, { message: 'Tipo de camión inválido' })
  tipo: TipoCamion;

  @ApiProperty({ example: '2026-03-26T08:30:00Z' })
  @IsDateString({}, { message: 'Fecha de llegada planificada inválida' })
  horaLlegadaPlanificada: string;

  @ApiPropertyOptional({ example: '2026-03-26T12:00:00Z' })
  @IsDateString({}, { message: 'Fecha de salida planificada inválida' })
  @IsOptional()
  horaSalidaPlanificada?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pedidoId?: string;

  @ApiPropertyOptional({ description: 'Descripción de carga previa (solo INTERPLANTA)' })
  @IsString()
  @IsOptional()
  cargaPreviaDescripcion?: string;
}
