import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ROLES_GESTION_OPERATIVA, ROLES_TUNEL } from '../auth/roles';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TunelesService } from './tuneles.service';
import { MarcarFueraServicioDto } from './dto/marcar-fuera-servicio.dto';
import { IngresarTunelDto } from './dto/ingresar-tunel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Tuneles')
@ApiBearerAuth()
@Controller('tuneles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TunelesController {
  constructor(private readonly tunelesService: TunelesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los túneles de frío con estado actual y camión asignado' })
  listar() {
    return this.tunelesService.listar();
  }

  @Patch(':camionId/ingresar')
  @Roles(...ROLES_TUNEL)
  @ApiOperation({ summary: 'Asignar un camión (EN_TUNEL_FRIO) a un túnel físico disponible' })
  ingresar(
    @Param('camionId') camionId: string,
    @Body() dto: IngresarTunelDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.tunelesService.ingresarTunel(camionId, dto.tunelId, usuarioId);
  }

  @Patch(':id/fuera-servicio')
  @Roles(...ROLES_GESTION_OPERATIVA)
  @ApiOperation({ summary: 'Marcar un túnel de frío como fuera de servicio (averiado)' })
  marcarFueraServicio(
    @Param('id') id: string,
    @Body() dto: MarcarFueraServicioDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.tunelesService.marcarFueraServicio(id, dto.motivo, usuarioId);
  }

  @Patch(':id/reactivar')
  @Roles(...ROLES_GESTION_OPERATIVA)
  @ApiOperation({ summary: 'Reactivar un túnel de frío fuera de servicio' })
  reactivar(@Param('id') id: string, @UsuarioActual('id') usuarioId: string) {
    return this.tunelesService.reactivar(id, usuarioId);
  }
}
