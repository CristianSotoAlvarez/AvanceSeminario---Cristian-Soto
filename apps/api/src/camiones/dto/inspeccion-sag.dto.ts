import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InspeccionSagDto {
  @ApiPropertyOptional({ description: 'Observaciones del inspector SAG' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
