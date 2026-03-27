import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadoCamion } from '@prisma/client';
import { CamionesService } from './camiones.service';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { AsignarAndenDto } from './dto/asignar-anden.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Camiones')
@ApiBearerAuth()
@Controller('camiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamionesController {
  constructor(private readonly camionesService: CamionesService) {}

  @Post()
  @Roles('COORDINADOR_TRANSPORTE')
  @ApiOperation({ summary: 'Crear camión programado (solo Coordinador Transporte)' })
  crear(@Body() dto: CrearCamionDto) {
    return this.camionesService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar camiones con filtros opcionales' })
  listar(@Query() filtros: FiltrosCamionDto) {
    return this.camionesService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de camión con historial de eventos' })
  obtenerPorId(@Param('id') id: string) {
    return this.camionesService.obtenerPorId(id);
  }

  @Patch(':id/asignar')
  @Roles('COORDINADOR')
  @ApiOperation({ summary: 'Asignar andén a camión (Coordinador)' })
  asignarAnden(
    @Param('id') id: string,
    @Body() dto: AsignarAndenDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.asignarAnden(id, dto.andenId, usuarioId);
  }

  @Patch(':id/iniciar-carga')
  @Roles('CARGADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Iniciar proceso de carga (Cargador/Supervisor)' })
  iniciarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.EN_CARGA, usuarioId);
  }

  @Patch(':id/finalizar-carga')
  @Roles('CARGADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Finalizar proceso de carga (Cargador/Supervisor)' })
  finalizarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.finalizarCarga(id, usuarioId);
  }

  @Patch(':id/temperatura-ok')
  @Roles('OPERADOR_TUNEL')
  @ApiOperation({ summary: 'Validar temperatura -18°C alcanzada (Operador Túnel)' })
  temperaturaOk(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.ESPERANDO_SAG, usuarioId);
  }
}
