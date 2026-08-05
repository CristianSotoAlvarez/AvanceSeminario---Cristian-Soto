import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrarTemperaturaDto {
  @ApiProperty({ description: 'Temperatura registrada en el túnel de frío (°C)' })
  @IsNumber()
  temperatura: number;

  @ApiPropertyOptional({ description: 'Observaciones del operador de túnel' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
