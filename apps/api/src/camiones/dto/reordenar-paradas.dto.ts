import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReordenarParadasDto {
  /** IDs de las paradas PENDIENTES en el nuevo orden deseado */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  paradaIds: string[];
}
