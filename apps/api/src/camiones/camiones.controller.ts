import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadoCamion } from '@prisma/client';
import { CamionesService } from './camiones.service';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { AsignarAndenDto } from './dto/asignar-anden.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { InspeccionSagDto } from './dto/inspeccion-sag.dto';
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
  @Roles('COORDINADOR_TRANSPORTE', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Crear camión programado (Coordinador Transporte o Jefe de Despacho)' })
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

  // ——— Transiciones de estado ———

  @Patch(':id/en-porteria')
  @Roles('COORDINADOR_TRANSPORTE', 'COORDINADOR', 'JEFE_DESPACHO', 'SUPERVISOR')
  @ApiOperation({ summary: 'Registrar llegada a portería (ESPERADO → EN_PORTERIA)' })
  enPorteria(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.EN_PORTERIA, usuarioId);
  }

  @Patch(':id/asignar')
  @Roles('COORDINADOR', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Asignar andén a camión (EN_PORTERIA → ASIGNADO)' })
  asignarAnden(
    @Param('id') id: string,
    @Body() dto: AsignarAndenDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.asignarAnden(id, dto.andenId, usuarioId);
  }

  @Patch(':id/iniciar-carga')
  @Roles('CARGADOR', 'SUPERVISOR', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Iniciar proceso de carga (ASIGNADO → EN_CARGA)' })
  iniciarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.EN_CARGA, usuarioId);
  }

  @Patch(':id/finalizar-carga')
  @Roles('CARGADOR', 'SUPERVISOR', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Finalizar proceso de carga — deriva según tipo de camión' })
  finalizarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.finalizarCarga(id, usuarioId);
  }

  @Patch(':id/temperatura-ok')
  @Roles('OPERADOR_TUNEL', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Validar temperatura -18°C alcanzada (EN_TUNEL_FRIO → ESPERANDO_SAG)' })
  temperaturaOk(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.ESPERANDO_SAG, usuarioId);
  }

  @Patch(':id/aprobar-sag')
  @Roles('SAG', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Inspector SAG aprueba el camión (ESPERANDO_SAG → APROBADO_SAG)' })
  aprobarSag(
    @Param('id') id: string,
    @Body() dto: InspeccionSagDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.aprobarSag(id, usuarioId, dto.observaciones);
  }

  @Patch(':id/rechazar-sag')
  @Roles('SAG', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Inspector SAG rechaza el camión (ESPERANDO_SAG → RECHAZADO_SAG)' })
  rechazarSag(
    @Param('id') id: string,
    @Body() dto: InspeccionSagDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.rechazarSag(id, usuarioId, dto.observaciones);
  }

  @Patch(':id/reinspeccionar')
  @Roles('SAG', 'JEFE_DESPACHO', 'SUPERVISOR')
  @ApiOperation({ summary: 'Re-enviar a inspección SAG (RECHAZADO_SAG → ESPERANDO_SAG)' })
  reinspeccionar(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.ESPERANDO_SAG, usuarioId, 'Re-enviado a inspección SAG');
  }

  @Patch(':id/listo')
  @Roles('COORDINADOR', 'JEFE_DESPACHO', 'SUPERVISOR')
  @ApiOperation({ summary: 'Marcar camión listo para despacho (APROBADO_SAG → LISTO)' })
  listo(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.LISTO, usuarioId);
  }

  @Patch(':id/despachar')
  @Roles('COORDINADOR', 'JEFE_DESPACHO')
  @ApiOperation({ summary: 'Despachar camión (LISTO → DESPACHADO)' })
  despachar(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.DESPACHADO, usuarioId);
  }
}
