import { IsString, IsEnum, IsDateString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCamion, TipoEdificio } from '@prisma/client';

export class CrearCamionDto {
  @ApiPropertyOptional({ example: 'TRP-00123', description: 'Número de transporte único del camión' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  numeroTransporte?: string;

  @ApiPropertyOptional({ example: 'BXRK-42', description: 'Patente del camión' })
  @IsString()
  @IsOptional()
  patente?: string;

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

  @ApiPropertyOptional({
    description: 'Puntos de expedición a visitar en orden (Frigorifico siempre último si aplica)',
    enum: TipoEdificio,
    isArray: true,
    example: ['CERDO', 'FRIGORIFICO'],
  })
  @IsArray()
  @IsEnum(TipoEdificio, { each: true })
  @IsOptional()
  edificios?: TipoEdificio[];
}
