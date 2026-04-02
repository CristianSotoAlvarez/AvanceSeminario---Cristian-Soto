import { IsString, IsOptional } from 'class-validator';

export class CrearEntregaDto {
  @IsString()
  camionId: string;

  @IsString()
  @IsOptional()
  paradaId?: string;
}
