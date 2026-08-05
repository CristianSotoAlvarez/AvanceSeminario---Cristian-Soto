import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarcarFueraServicioDto {
  @ApiProperty({ description: 'Motivo por el cual el túnel queda fuera de servicio' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  motivo: string;
}
