import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoCamion, TipoCamion } from '@prisma/client';

export class FiltrosCamionDto {
  @ApiPropertyOptional({ enum: EstadoCamion })
  @IsEnum(EstadoCamion)
  @IsOptional()
  estado?: EstadoCamion;

  @ApiPropertyOptional({ enum: TipoCamion })
  @IsEnum(TipoCamion)
  @IsOptional()
  tipo?: TipoCamion;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  edificioId?: string;

  @ApiPropertyOptional({ description: 'Fecha en formato YYYY-MM-DD. Por defecto: hoy' })
  @IsDateString()
  @IsOptional()
  fecha?: string;

  @ApiPropertyOptional({ description: 'Página (base 1)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pagina?: number;

  @ApiPropertyOptional({ description: 'Registros por página', default: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  porPagina?: number;
}
