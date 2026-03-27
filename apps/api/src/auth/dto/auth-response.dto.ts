import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    edificioId: string | null;
  };
}
