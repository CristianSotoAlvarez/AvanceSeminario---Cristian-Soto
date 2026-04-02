import { IsString, IsOptional } from 'class-validator';

export class CrearPalletDto {
  // codigoUnico es opcional — si no se envía, el backend lo genera automáticamente
  @IsString()
  @IsOptional()
  codigoUnico?: string;

  @IsString()
  @IsOptional()
  entregaId?: string;

  @IsString()
  @IsOptional()
  pedidoId?: string;

  @IsString()
  @IsOptional()
  edificioId?: string;
}
