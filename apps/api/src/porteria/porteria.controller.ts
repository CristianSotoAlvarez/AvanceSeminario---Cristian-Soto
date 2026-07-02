import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PorteriaService } from './porteria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Portería')
@Controller('porteria')
export class PorteriaController {
  constructor(private readonly porteria: PorteriaService) {}

  // ─── Endpoints públicos (sin auth, para escaneo del QR del camión) ────────

  @Get('qr/:token')
  @ApiOperation({ summary: 'Validar token QR público y retornar info del camión' })
  obtenerPorToken(@Param('token') token: string) {
    return this.porteria.obtenerPorToken(token);
  }

  @Post('qr/:token/confirmar')
  @ApiOperation({ summary: 'Confirmar llegada del camión vía QR (sin auth)' })
  confirmarPorToken(@Param('token') token: string) {
    return this.porteria.confirmarPorToken(token);
  }

  // ─── Endpoints autenticados (pantalla interna de portería) ────────────────

  @Get('camiones-hoy')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PORTERO', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR_TRANSPORTE', 'COORDINADOR')
  @ApiOperation({ summary: 'Lista camiones planificados para hoy' })
  listarCamionesHoy() {
    return this.porteria.listarCamionesHoy();
  }

  @Post('camion/:id/confirmar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PORTERO', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR_TRANSPORTE', 'COORDINADOR')
  @ApiOperation({ summary: 'Confirmar llegada del camión por ID (manual)' })
  confirmarPorId(@Param('id') id: string, @UsuarioActual('id') usuarioId: string) {
    return this.porteria.confirmarPorId(id, usuarioId);
  }
}
