import {
  IsString, IsEnum, IsDateString, IsOptional, IsNotEmpty,
  IsArray, ValidateNested, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCamion, TipoEdificio } from '@prisma/client';

export class ParadaDto {
  @ApiProperty({ enum: TipoEdificio, example: 'AVES' })
  @IsEnum(TipoEdificio, { message: 'Tipo de edificio inválido' })
  edificio: TipoEdificio;

  @ApiPropertyOptional({ example: 24, description: 'Cantidad de pallets solicitados en este punto' })
  @IsInt()
  @Min(0)
  @IsOptional()
  pallets?: number;
}

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

  @ApiPropertyOptional({ description: 'ID del cliente asociado al camión' })
  @IsString()
  @IsOptional()
  clienteId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pedidoId?: string;

  @ApiPropertyOptional({ description: 'Descripción de carga previa (solo INTERPLANTA)' })
  @IsString()
  @IsOptional()
  cargaPreviaDescripcion?: string;

  @ApiPropertyOptional({
    description: 'Puntos de expedición con cantidad de pallets por parada',
    type: [ParadaDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParadaDto)
  @IsOptional()
  paradas?: ParadaDto[];

  /** @deprecated Usar `paradas` en su lugar */
  @ApiPropertyOptional({
    description: '[Deprecado] Usar paradas[]. Lista simple de edificios sin cantidad de pallets',
    enum: TipoEdificio,
    isArray: true,
  })
  @IsArray()
  @IsEnum(TipoEdificio, { each: true })
  @IsOptional()
  edificios?: TipoEdificio[];
}
