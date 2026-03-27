import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AsignarAndenDto {
  @ApiProperty({ description: 'ID del andén a asignar' })
  @IsString()
  @IsNotEmpty({ message: 'El ID del andén es obligatorio' })
  andenId: string;
}
