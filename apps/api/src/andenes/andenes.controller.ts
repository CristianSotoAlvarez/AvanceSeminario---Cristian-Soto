import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ROLES_GESTION_OPERATIVA } from '../auth/roles';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AndenesService } from './andenes.service';
import { MarcarFueraServicioDto } from './dto/marcar-fuera-servicio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Andenes')
@ApiBearerAuth()
@Controller('andenes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AndenesController {
  constructor(private readonly andenesService: AndenesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los andenes con estado actual y camión asignado' })
  listar() {
    return this.andenesService.listar();
  }

  @Patch(':id/fuera-servicio')
  @Roles(...ROLES_GESTION_OPERATIVA)
  @ApiOperation({ summary: 'Marcar un andén como fuera de servicio (averiado)' })
  marcarFueraServicio(
    @Param('id') id: string,
    @Body() dto: MarcarFueraServicioDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.andenesService.marcarFueraServicio(id, dto.motivo, usuarioId);
  }

  @Patch(':id/reactivar')
  @Roles(...ROLES_GESTION_OPERATIVA)
  @ApiOperation({ summary: 'Reactivar un andén fuera de servicio' })
  reactivar(@Param('id') id: string, @UsuarioActual('id') usuarioId: string) {
    return this.andenesService.reactivar(id, usuarioId);
  }
}
