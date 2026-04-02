import { IsEnum } from 'class-validator';
import { EstadoPallet } from '@prisma/client';

export class CambiarEstadoPalletDto {
  @IsEnum(EstadoPallet)
  estado: EstadoPallet;
}
