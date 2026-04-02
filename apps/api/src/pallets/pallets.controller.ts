import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PalletsService } from './pallets.service';
import { CrearPalletDto } from './dto/crear-pallet.dto';
import { AgregarProductoDto } from './dto/agregar-producto.dto';
import { CambiarEstadoPalletDto } from './dto/cambiar-estado-pallet.dto';
import { FiltrosPalletDto } from './dto/filtros-pallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Pallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pallets')
export class PalletsController {
  constructor(private readonly palletsService: PalletsService) {}

  @Get()
  listar(@Query() filtros: FiltrosPalletDto) {
    return this.palletsService.listar(filtros);
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.palletsService.obtenerPorId(id);
  }

  @Post()
  @Roles('PICKINERO', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  crear(
    @Body() dto: CrearPalletDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.palletsService.crear(dto, usuarioId);
  }

  @Post(':id/productos')
  @Roles('PICKINERO', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  agregarProducto(
    @Param('id') palletId: string,
    @Body() dto: AgregarProductoDto,
  ) {
    return this.palletsService.agregarProducto(palletId, dto);
  }

  @Patch(':id/estado')
  @Roles('PICKINERO', 'CARGADOR', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoPalletDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.palletsService.cambiarEstado(id, dto.estado, usuarioId);
  }
}
