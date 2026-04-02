import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoPallet } from '@prisma/client';

export class FiltrosPalletDto {
  @IsEnum(EstadoPallet)
  @IsOptional()
  estado?: EstadoPallet;

  @IsString()
  @IsOptional()
  edificioId?: string;

  @IsString()
  @IsOptional()
  entregaId?: string;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pagina?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  porPagina?: number;
}
