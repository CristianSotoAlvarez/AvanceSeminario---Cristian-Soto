import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ROLES_CARGA, ROLES_GESTION_OPERATIVA, ROLES_INSPECCION_SAG, ROLES_SUPERVISION, ROLES_TUNEL } from '../auth/roles';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadoCamion, RolUsuario } from '@prisma/client';
import { CamionesService } from './camiones.service';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { AsignarAndenDto } from './dto/asignar-anden.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { InspeccionSagDto } from './dto/inspeccion-sag.dto';
import { ReordenarParadasDto } from './dto/reordenar-paradas.dto';
import { RegistrarIncidenteDto } from './dto/registrar-incidente.dto';
import { RegistrarTemperaturaDto } from './dto/registrar-temperatura.dto';
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
  @Roles(RolUsuario.COORDINADOR_TRANSPORTE)
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

  // ——— Transiciones de estado ———

  @Patch(':id/en-porteria')
  @Roles(...ROLES_SUPERVISION)
  @ApiOperation({ summary: 'Registrar llegada a portería (ESPERADO → EN_PORTERIA)' })
  enPorteria(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.EN_PORTERIA, usuarioId);
  }

  @Patch(':id/asignar')
  @Roles(...ROLES_SUPERVISION)
  @ApiOperation({ summary: 'Asignar andén a camión (EN_PORTERIA → ASIGNADO)' })
  asignarAnden(
    @Param('id') id: string,
    @Body() dto: AsignarAndenDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.asignarAnden(id, dto.andenId, usuarioId);
  }

  @Patch(':id/iniciar-carga')
  @Roles(...ROLES_CARGA)
  @ApiOperation({ summary: 'Iniciar proceso de carga (ASIGNADO → EN_CARGA)' })
  iniciarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.EN_CARGA, usuarioId);
  }

  @Patch(':id/finalizar-carga')
  @Roles(...ROLES_CARGA)
  @ApiOperation({ summary: 'Finalizar proceso de carga — deriva según tipo de camión' })
  finalizarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.finalizarCarga(id, usuarioId);
  }

  @Patch(':id/temperatura-ok')
  @Roles(...ROLES_TUNEL)
  @ApiOperation({ summary: 'Registrar temperatura y validar salida del túnel (EN_TUNEL_FRIO → ESPERANDO_SAG)' })
  temperaturaOk(
    @Param('id') id: string,
    @Body() dto: RegistrarTemperaturaDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.registrarTemperaturaYSalirTunel(id, dto.temperatura, usuarioId, dto.observaciones);
  }

  @Patch(':id/aprobar-sag')
  @Roles(...ROLES_INSPECCION_SAG)
  @ApiOperation({ summary: 'Inspector SAG aprueba el camión (ESPERANDO_SAG → APROBADO_SAG)' })
  aprobarSag(
    @Param('id') id: string,
    @Body() dto: InspeccionSagDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.aprobarSag(id, usuarioId, dto.observaciones);
  }

  @Patch(':id/rechazar-sag')
  @Roles(...ROLES_INSPECCION_SAG)
  @ApiOperation({ summary: 'Inspector SAG rechaza el camión (ESPERANDO_SAG → RECHAZADO_SAG)' })
  rechazarSag(
    @Param('id') id: string,
    @Body() dto: InspeccionSagDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.rechazarSag(id, usuarioId, dto.observaciones);
  }

  @Patch(':id/reinspeccionar')
  @Roles(RolUsuario.SAG, RolUsuario.JEFE_DESPACHO, RolUsuario.SUPERVISOR)
  @ApiOperation({ summary: 'Re-enviar a inspección SAG (RECHAZADO_SAG → ESPERANDO_SAG)' })
  reinspeccionar(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.ESPERANDO_SAG, usuarioId, 'Re-enviado a inspección SAG');
  }

  @Patch(':id/listo')
  @Roles(...ROLES_SUPERVISION)
  @ApiOperation({ summary: 'Marcar camión listo para despacho (APROBADO_SAG → LISTO)' })
  listo(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.LISTO, usuarioId);
  }

  @Patch(':id/despachar')
  @Roles(...ROLES_SUPERVISION)
  @ApiOperation({ summary: 'Despachar camión (LISTO → DESPACHADO)' })
  despachar(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.DESPACHADO, usuarioId);
  }

  // ——— Incidentes ———

  @Post(':id/incidente')
  @Roles(...ROLES_GESTION_OPERATIVA)
  @ApiOperation({ summary: 'Registrar incidente del camión (avería en v1)' })
  registrarIncidente(
    @Param('id') id: string,
    @Body() dto: RegistrarIncidenteDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.registrarIncidente(id, dto, usuarioId);
  }

  @Post(':id/marcar-reparado')
  @Roles(...ROLES_GESTION_OPERATIVA)
  @ApiOperation({ summary: 'Cerrar reparación in situ del camión' })
  marcarReparado(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.marcarReparado(id, usuarioId);
  }

  @Patch(':id/paradas/reordenar')
  @Roles(...ROLES_SUPERVISION)
  @ApiOperation({ summary: 'Reordenar paradas PENDIENTES del camión' })
  reordenarParadas(
    @Param('id') id: string,
    @Body() dto: ReordenarParadasDto,
  ) {
    return this.camionesService.reordenarParadas(id, dto.paradaIds);
  }
}
