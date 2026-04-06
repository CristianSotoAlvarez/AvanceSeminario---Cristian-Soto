import { IsString, IsInt, IsNumber, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class AgregarProductoDto {
  @IsString() @IsOptional() codigoBarras?: string;
  @IsString() @IsNotEmpty() descripcion: string;
  @IsInt()    @Min(1)       cantidad: number;
  @IsNumber() @IsOptional() pesoKg?: number;
  @IsNumber() @IsOptional() temperatura?: number;
}
