import { IsString, IsEmail, IsEnum, IsOptional, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({ example: '12.345.678-9' })
  @IsString()
  @IsNotEmpty({ message: 'El RUT es obligatorio' })
  rut: string;

  @ApiProperty({ example: 'juan.perez@agrosuper.cl' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'clave123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ enum: RolUsuario, example: 'CARGADOR' })
  @IsEnum(RolUsuario, { message: 'Rol inválido' })
  rol: RolUsuario;

  @ApiPropertyOptional({ description: 'ID del edificio asignado (obligatorio para roles por edificio)' })
  @IsString()
  @IsOptional()
  edificioId?: string;
}
