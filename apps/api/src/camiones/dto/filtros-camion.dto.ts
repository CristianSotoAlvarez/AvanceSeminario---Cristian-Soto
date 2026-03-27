import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
}
