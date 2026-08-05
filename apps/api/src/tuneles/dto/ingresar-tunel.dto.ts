import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IngresarTunelDto {
  @ApiProperty({ description: 'ID del túnel de frío al que ingresa el camión' })
  @IsString()
  @IsNotEmpty({ message: 'Debes indicar el túnel' })
  tunelId: string;
}
