import { IsString, IsEnum, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCamion } from '@prisma/client';

export class CrearClienteDto {
  @ApiProperty({ example: 'Supermercados Acuenta' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: '76.543.210-K', description: 'RUT chileno (no aplica para clientes extranjeros)' })
  @IsString()
  @IsOptional()
  rut?: string;

  @ApiPropertyOptional({ example: 'CLI-001', description: 'Código interno alternativo' })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiProperty({ enum: TipoCamion, example: 'NACIONAL' })
  @IsEnum(TipoCamion, { message: 'Tipo de destino inválido' })
  tipoDestino: TipoCamion;

  @ApiPropertyOptional({ example: 'China', description: 'País destino (solo para EXPORTACION)' })
  @IsString()
  @IsOptional()
  pais?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
