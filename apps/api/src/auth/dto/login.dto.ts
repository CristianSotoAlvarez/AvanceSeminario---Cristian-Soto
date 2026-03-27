import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '12.345.678-9', description: 'RUT o email del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El identificador es obligatorio' })
  identificador: string;

  @ApiProperty({ example: 'clave123', description: 'Contraseña del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
